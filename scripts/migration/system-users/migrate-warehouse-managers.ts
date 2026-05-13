import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { hashText } from "../../../src/shared/common/security/hash.util";
import {
  assertDistinctSourceAndTargetDatabases,
  loadMigrationEnvironment,
  parseDatabaseName,
  parseMigrationCliOptions,
  resolveReportPath,
} from "../config";
import { closePools, createMariaDbPool, withPoolConnection } from "../db";
import { writeStableReport } from "../shared/report-writer";

const CONFIRMED_WAREHOUSE_MANAGER_USER_NAMES = [
  "田晓晶",
  "徐文静",
  "王子云",
  "aliu",
] as const;

const TARGET_DEPARTMENT_NAME = "仓库";
const TARGET_ROLE_KEY = "warehouse-manager";
const TARGET_POST_CODE = "WAREHOUSE_MANAGER";
const INIT_PASSWORD_CONFIG_KEY = "sys.user.initPassword";
const FALLBACK_INIT_PASSWORD = "ChangeMe123";

interface Queryable {
  query<T = unknown>(sql: string, values?: readonly unknown[]): Promise<T>;
}

interface TransactionalQueryable extends Queryable {
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

interface SqlOkPacket {
  insertId?: number;
  affectedRows?: number;
}

interface LegacyUserRow {
  userId: number;
  userName: string;
  nickName: string | null;
  email: string | null;
  phonenumber: string | null;
  sex: string | null;
  status: string | null;
  delFlag: string | number | null;
  createdAt: string | null;
}

interface TargetUserRow {
  userId: number;
  userName: string;
  nickName: string;
}

interface TargetRoleRow {
  roleId: number;
  roleKey: string;
}

interface TargetPostRow {
  postId: number;
  postCode: string;
}

interface TargetDeptRow {
  deptId: number;
  deptName: string;
}

interface MigrationTargetRefs {
  dept: TargetDeptRow | null;
  role: TargetRoleRow | null;
  post: TargetPostRow | null;
  initialPassword: string;
}

interface UserMigrationDecision {
  userName: string;
  legacyUserId: number | null;
  targetUserId: number | null;
  userAction:
    | "inserted"
    | "would-insert"
    | "already-present"
    | "missing-legacy";
  roleBinding: "already-present" | "inserted" | "would-insert" | "not-run";
  postBinding: "already-present" | "inserted" | "would-insert" | "not-run";
}

interface WarehouseManagerMigrationReport {
  scope: "system-users-warehouse-managers";
  mode: "dry-run" | "execute";
  sourceDatabaseName: string | null;
  targetDatabaseName: string | null;
  targetRoleKey: string;
  targetPostCode: string;
  targetDepartmentName: string;
  initialPasswordSource: string;
  requestedUserNames: string[];
  blockers: string[];
  decisions: UserMigrationDecision[];
  summary: {
    requested: number;
    legacyFound: number;
    insertedUsers: number;
    existingUsers: number;
    insertedRoleBindings: number;
    insertedPostBindings: number;
  };
}

function normalizeSex(value: string | null): "0" | "1" | "2" {
  return value === "0" || value === "1" ? value : "2";
}

function normalizeStatus(value: string | null): "0" | "1" {
  return value === "1" ? "1" : "0";
}

function normalizeDeleted(value: string | number | null): boolean {
  return String(value ?? "0") !== "0";
}

async function readLegacyUsers(
  connection: Queryable,
): Promise<LegacyUserRow[]> {
  const rows = await connection.query<LegacyUserRow[]>(
    `
      SELECT
        user_id AS userId,
        user_name AS userName,
        nick_name AS nickName,
        email,
        phonenumber,
        sex,
        status,
        del_flag AS delFlag,
        create_time AS createdAt
      FROM sys_user
      WHERE user_name IN (${CONFIRMED_WAREHOUSE_MANAGER_USER_NAMES.map(
        () => "?",
      ).join(", ")})
      ORDER BY user_id
    `,
    CONFIRMED_WAREHOUSE_MANAGER_USER_NAMES,
  );

  const byUserName = new Map(rows.map((row) => [row.userName, row]));
  return CONFIRMED_WAREHOUSE_MANAGER_USER_NAMES.flatMap((userName) => {
    const row = byUserName.get(userName);
    return row ? [row] : [];
  });
}

async function readTargetRefs(
  connection: Queryable,
): Promise<MigrationTargetRefs> {
  const [deptRows, roleRows, postRows, configRows] = await Promise.all([
    connection.query<TargetDeptRow[]>(
      `
        SELECT dept_id AS deptId, dept_name AS deptName
        FROM sys_dept
        WHERE dept_name = ?
        ORDER BY dept_id
        LIMIT 1
      `,
      [TARGET_DEPARTMENT_NAME],
    ),
    connection.query<TargetRoleRow[]>(
      `
        SELECT role_id AS roleId, role_key AS roleKey
        FROM sys_role
        WHERE role_key = ?
        LIMIT 1
      `,
      [TARGET_ROLE_KEY],
    ),
    connection.query<TargetPostRow[]>(
      `
        SELECT post_id AS postId, post_code AS postCode
        FROM sys_post
        WHERE post_code = ?
        LIMIT 1
      `,
      [TARGET_POST_CODE],
    ),
    connection.query<Array<{ configValue: string }>>(
      `
        SELECT config_value AS configValue
        FROM sys_config
        WHERE config_key = ?
        LIMIT 1
      `,
      [INIT_PASSWORD_CONFIG_KEY],
    ),
  ]);

  return {
    dept: deptRows[0] ?? null,
    role: roleRows[0] ?? null,
    post: postRows[0] ?? null,
    initialPassword:
      configRows[0]?.configValue?.trim() || FALLBACK_INIT_PASSWORD,
  };
}

async function readTargetUser(
  connection: Queryable,
  userName: string,
): Promise<TargetUserRow | null> {
  const rows = await connection.query<TargetUserRow[]>(
    `
      SELECT user_id AS userId, user_name AS userName, nick_name AS nickName
      FROM sys_user
      WHERE user_name = ?
      LIMIT 1
    `,
    [userName],
  );

  return rows[0] ?? null;
}

async function hasUserRoleBinding(
  connection: Queryable,
  userId: number,
  roleId: number,
): Promise<boolean> {
  const rows = await connection.query<Array<{ total: number }>>(
    "SELECT COUNT(*) AS total FROM sys_user_role WHERE user_id = ? AND role_id = ?",
    [userId, roleId],
  );
  return Number(rows[0]?.total ?? 0) > 0;
}

async function hasUserPostBinding(
  connection: Queryable,
  userId: number,
  postId: number,
): Promise<boolean> {
  const rows = await connection.query<Array<{ total: number }>>(
    "SELECT COUNT(*) AS total FROM sys_user_post WHERE user_id = ? AND post_id = ?",
    [userId, postId],
  );
  return Number(rows[0]?.total ?? 0) > 0;
}

async function insertTargetUser(
  connection: Queryable,
  legacyUser: LegacyUserRow,
  refs: MigrationTargetRefs,
): Promise<number> {
  const result = await connection.query<SqlOkPacket>(
    `
      INSERT INTO sys_user (
        dept_id,
        user_name,
        nick_name,
        avatar_url,
        email,
        phonenumber,
        sex,
        status,
        deleted,
        remark,
        password_hash,
        console_mode,
        stock_scope,
        workshop_scope,
        extra_permissions,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, 'default', ?, ?, ?, ?, NOW())
    `,
    [
      refs.dept?.deptId ?? null,
      legacyUser.userName,
      legacyUser.nickName?.trim() || legacyUser.userName,
      legacyUser.email?.trim() ?? "",
      legacyUser.phonenumber?.trim() ?? "",
      normalizeSex(legacyUser.sex),
      normalizeStatus(legacyUser.status),
      normalizeDeleted(legacyUser.delFlag) ? 1 : 0,
      `从旧系统迁移的仓库管理员账号；legacy_user_id=${legacyUser.userId}`,
      hashText(refs.initialPassword),
      JSON.stringify({
        mode: "ALL",
        stockScope: null,
        stockScopeName: null,
      }),
      JSON.stringify({
        mode: "ALL",
        workshopId: null,
        workshopName: null,
      }),
      JSON.stringify([]),
      legacyUser.createdAt ?? new Date().toISOString(),
    ],
  );

  if (!result.insertId) {
    throw new Error(`Failed to insert target user: ${legacyUser.userName}`);
  }

  return result.insertId;
}

async function buildDecision(
  connection: Queryable,
  legacyUser: LegacyUserRow | null,
  refs: MigrationTargetRefs,
  execute: boolean,
): Promise<UserMigrationDecision> {
  if (!legacyUser) {
    return {
      userName: "",
      legacyUserId: null,
      targetUserId: null,
      userAction: "missing-legacy",
      roleBinding: "not-run",
      postBinding: "not-run",
    };
  }

  const existingUser = await readTargetUser(connection, legacyUser.userName);
  const userId = existingUser
    ? existingUser.userId
    : execute
      ? await insertTargetUser(connection, legacyUser, refs)
      : null;

  let roleBinding: UserMigrationDecision["roleBinding"] = "not-run";
  if (userId !== null && refs.role) {
    if (await hasUserRoleBinding(connection, userId, refs.role.roleId)) {
      roleBinding = "already-present";
    } else if (execute) {
      await connection.query(
        "INSERT INTO sys_user_role (user_id, role_id) VALUES (?, ?)",
        [userId, refs.role.roleId],
      );
      roleBinding = "inserted";
    } else {
      roleBinding = "would-insert";
    }
  }

  let postBinding: UserMigrationDecision["postBinding"] = "not-run";
  if (userId !== null && refs.post) {
    if (await hasUserPostBinding(connection, userId, refs.post.postId)) {
      postBinding = "already-present";
    } else if (execute) {
      await connection.query(
        "INSERT INTO sys_user_post (user_id, post_id) VALUES (?, ?)",
        [userId, refs.post.postId],
      );
      postBinding = "inserted";
    } else {
      postBinding = "would-insert";
    }
  }

  return {
    userName: legacyUser.userName,
    legacyUserId: legacyUser.userId,
    targetUserId: userId,
    userAction: existingUser
      ? "already-present"
      : execute
        ? "inserted"
        : "would-insert",
    roleBinding,
    postBinding,
  };
}

async function runTargetPlan(
  connection: TransactionalQueryable,
  legacyUsers: LegacyUserRow[],
  refs: MigrationTargetRefs,
  execute: boolean,
): Promise<UserMigrationDecision[]> {
  const byUserName = new Map(legacyUsers.map((user) => [user.userName, user]));

  if (!execute) {
    const decisions: UserMigrationDecision[] = [];
    for (const userName of CONFIRMED_WAREHOUSE_MANAGER_USER_NAMES) {
      const legacyUser = byUserName.get(userName) ?? null;
      const existingUser = legacyUser
        ? await readTargetUser(connection, legacyUser.userName)
        : null;
      decisions.push({
        userName,
        legacyUserId: legacyUser?.userId ?? null,
        targetUserId: existingUser?.userId ?? null,
        userAction: legacyUser
          ? existingUser
            ? "already-present"
            : "would-insert"
          : "missing-legacy",
        roleBinding:
          existingUser && refs.role
            ? (await hasUserRoleBinding(
                connection,
                existingUser.userId,
                refs.role.roleId,
              ))
              ? "already-present"
              : "would-insert"
            : "not-run",
        postBinding:
          existingUser && refs.post
            ? (await hasUserPostBinding(
                connection,
                existingUser.userId,
                refs.post.postId,
              ))
              ? "already-present"
              : "would-insert"
            : "not-run",
      });
    }
    return decisions;
  }

  await connection.beginTransaction();
  try {
    const decisions: UserMigrationDecision[] = [];
    for (const userName of CONFIRMED_WAREHOUSE_MANAGER_USER_NAMES) {
      decisions.push(
        await buildDecision(
          connection,
          byUserName.get(userName) ?? null,
          refs,
          true,
        ),
      );
    }
    await connection.commit();
    return decisions;
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

function buildBlockers(
  legacyUsers: LegacyUserRow[],
  refs: MigrationTargetRefs,
): string[] {
  const blockers: string[] = [];
  const legacyUserNames = new Set(legacyUsers.map((user) => user.userName));

  for (const userName of CONFIRMED_WAREHOUSE_MANAGER_USER_NAMES) {
    if (!legacyUserNames.has(userName)) {
      blockers.push(`Legacy sys_user is missing confirmed user ${userName}.`);
    }
  }
  if (!refs.dept) {
    blockers.push(
      `Target sys_dept is missing department ${TARGET_DEPARTMENT_NAME}.`,
    );
  }
  if (!refs.role) {
    blockers.push(`Target sys_role is missing role ${TARGET_ROLE_KEY}.`);
  }
  if (!refs.post) {
    blockers.push(`Target sys_post is missing post ${TARGET_POST_CODE}.`);
  }

  return blockers;
}

function summarize(decisions: UserMigrationDecision[]) {
  return {
    requested: CONFIRMED_WAREHOUSE_MANAGER_USER_NAMES.length,
    legacyFound: decisions.filter((decision) => decision.legacyUserId !== null)
      .length,
    insertedUsers: decisions.filter(
      (decision) => decision.userAction === "inserted",
    ).length,
    existingUsers: decisions.filter(
      (decision) => decision.userAction === "already-present",
    ).length,
    insertedRoleBindings: decisions.filter(
      (decision) => decision.roleBinding === "inserted",
    ).length,
    insertedPostBindings: decisions.filter(
      (decision) => decision.postBinding === "inserted",
    ).length,
  };
}

function writeMarkdownReport(
  reportPath: string,
  report: WarehouseManagerMigrationReport,
): void {
  const markdownPath = reportPath.replace(/\.json$/u, ".md");
  mkdirSync(dirname(markdownPath), { recursive: true });
  const lines = [
    "# 仓库管理员用户迁移报告",
    "",
    `- 模式：\`${report.mode}\``,
    `- 源库：\`${report.sourceDatabaseName ?? "unknown"}\``,
    `- 目标库：\`${report.targetDatabaseName ?? "unknown"}\``,
    `- 目标角色：\`${report.targetRoleKey}\``,
    `- 目标岗位：\`${report.targetPostCode}\``,
    `- 目标部门：\`${report.targetDepartmentName}\``,
    `- 初始密码来源：\`${report.initialPasswordSource}\``,
    "",
    "## 结果",
    "",
    "| 用户 | 旧用户ID | 目标用户ID | 用户动作 | 角色绑定 | 岗位绑定 |",
    "| --- | ---: | ---: | --- | --- | --- |",
    ...report.decisions.map(
      (decision) =>
        `| ${decision.userName || "-"} | ${decision.legacyUserId ?? "-"} | ${decision.targetUserId ?? "-"} | ${decision.userAction} | ${decision.roleBinding} | ${decision.postBinding} |`,
    ),
    "",
    "## Blockers",
    "",
    ...(report.blockers.length
      ? report.blockers.map((blocker) => `- ${blocker}`)
      : ["- 无"]),
    "",
  ];

  writeFileSync(markdownPath, `${lines.join("\n")}\n`, "utf8");
}

async function main(): Promise<void> {
  const cliOptions = parseMigrationCliOptions();
  const env = loadMigrationEnvironment({ requireLegacyDatabaseUrl: true });
  assertDistinctSourceAndTargetDatabases(
    env.legacyDatabaseUrl,
    env.databaseUrl,
  );

  const reportPath = resolveReportPath(
    cliOptions,
    cliOptions.execute
      ? join("system-users", "warehouse-managers-execute-report.json")
      : join("system-users", "warehouse-managers-dry-run-report.json"),
  );
  const legacyPool = createMariaDbPool(env.legacyDatabaseUrl ?? "");
  const targetPool = createMariaDbPool(env.databaseUrl);

  try {
    const legacyUsers = await withPoolConnection(legacyPool, readLegacyUsers);
    const report = await withPoolConnection(
      targetPool,
      async (targetConnection) => {
        const refs = await readTargetRefs(targetConnection);
        const blockers = buildBlockers(legacyUsers, refs);
        const canRun = blockers.length === 0;
        const decisions = canRun
          ? await runTargetPlan(
              targetConnection,
              legacyUsers,
              refs,
              cliOptions.execute,
            )
          : CONFIRMED_WAREHOUSE_MANAGER_USER_NAMES.map((userName) => ({
              userName,
              legacyUserId:
                legacyUsers.find((user) => user.userName === userName)
                  ?.userId ?? null,
              targetUserId: null,
              userAction: "missing-legacy" as const,
              roleBinding: "not-run" as const,
              postBinding: "not-run" as const,
            }));

        return {
          scope: "system-users-warehouse-managers" as const,
          mode: cliOptions.execute
            ? ("execute" as const)
            : ("dry-run" as const),
          sourceDatabaseName: parseDatabaseName(env.legacyDatabaseUrl),
          targetDatabaseName: parseDatabaseName(env.databaseUrl),
          targetRoleKey: TARGET_ROLE_KEY,
          targetPostCode: TARGET_POST_CODE,
          targetDepartmentName: TARGET_DEPARTMENT_NAME,
          initialPasswordSource: `${INIT_PASSWORD_CONFIG_KEY} or ${FALLBACK_INIT_PASSWORD}`,
          requestedUserNames: [...CONFIRMED_WAREHOUSE_MANAGER_USER_NAMES],
          blockers,
          decisions,
          summary: summarize(decisions),
        };
      },
    );

    writeStableReport(reportPath, report);
    writeMarkdownReport(reportPath, report);

    if (report.blockers.length > 0 && cliOptions.execute) {
      throw new Error(
        `Warehouse-manager user migration blocked: ${report.blockers.join("; ")}`,
      );
    }

    console.log(
      `Warehouse-manager user migration ${report.mode} completed. report=${reportPath}`,
    );
  } finally {
    await closePools(legacyPool, targetPool);
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
