import { EventEmitter2 } from "@nestjs/event-emitter";
import { AppConfigService } from "../../../shared/config/app-config.service";
import { RbacService } from "../../rbac/application/rbac.service";
import { SessionService } from "../../session/application/session.service";
import { AuthStateRepository } from "../infrastructure/auth-state.repository";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  it("returns visible login lock status for user list rows", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-11T03:30:00.000Z"));

    try {
      const authStateRepository = {
        getPasswordAttempt: jest
          .fn()
          .mockResolvedValueOnce({
            count: 5,
            lockedUntil: "2026-05-11T03:44:15.162Z",
          })
          .mockResolvedValueOnce({ count: 1 }),
        clearPasswordFailures: jest.fn().mockResolvedValue(undefined),
      } as jest.Mocked<
        Pick<
          AuthStateRepository,
          "getPasswordAttempt" | "clearPasswordFailures"
        >
      >;
      const rbacService = {
        getUserLoginIdentity: jest
          .fn()
          .mockResolvedValueOnce({
            userId: 2,
            username: "operator",
          })
          .mockResolvedValueOnce({
            userId: 4,
            username: "procurement",
          }),
      } as jest.Mocked<Pick<RbacService, "getUserLoginIdentity">>;

      const service = new AuthService(
        {} as AppConfigService,
        authStateRepository as unknown as AuthStateRepository,
        rbacService as unknown as RbacService,
        {} as SessionService,
        {} as EventEmitter2,
      );

      await expect(service.listUserLoginLockStatuses([2, 4])).resolves.toEqual([
        {
          userId: 2,
          username: "operator",
          locked: true,
          status: "locked",
          statusLabel: "已锁定",
          lockedUntil: "2026-05-11T03:44:15.162Z",
          failureCount: 5,
        },
        {
          userId: 4,
          username: "procurement",
          locked: false,
          status: "warning",
          statusLabel: "失败 1 次",
          lockedUntil: null,
          failureCount: 1,
        },
      ]);
    } finally {
      jest.useRealTimers();
    }
  });

  it("clears password failure state by target user's login name", async () => {
    const lockedUntil = "2030-01-01T00:00:00.000Z";
    const authStateRepository = {
      getPasswordAttempt: jest.fn().mockResolvedValue({
        count: 5,
        lockedUntil,
      }),
      clearPasswordFailures: jest.fn().mockResolvedValue(undefined),
    } as jest.Mocked<
      Pick<AuthStateRepository, "getPasswordAttempt" | "clearPasswordFailures">
    >;
    const rbacService = {
      getUserLoginIdentity: jest.fn().mockResolvedValue({
        userId: 2,
        username: "operator",
      }),
    } as jest.Mocked<Pick<RbacService, "getUserLoginIdentity">>;

    const service = new AuthService(
      {} as AppConfigService,
      authStateRepository as unknown as AuthStateRepository,
      rbacService as unknown as RbacService,
      {} as SessionService,
      {} as EventEmitter2,
    );

    await expect(service.unlockUserLogin(2)).resolves.toEqual({
      msg: "登录锁定已解除",
      userId: 2,
      username: "operator",
      wasLocked: true,
      lockedUntil,
      failureCount: 5,
    });
    expect(rbacService.getUserLoginIdentity).toHaveBeenCalledWith(2);
    expect(authStateRepository.getPasswordAttempt).toHaveBeenCalledWith(
      "operator",
    );
    expect(authStateRepository.clearPasswordFailures).toHaveBeenCalledWith(
      "operator",
    );
  });
});
