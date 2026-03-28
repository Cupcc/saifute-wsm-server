import { InMemoryRbacRepository } from "./in-memory-rbac.repository";

describe("InMemoryRbacRepository", () => {
  let repository: InMemoryRbacRepository;

  beforeEach(() => {
    repository = new InMemoryRbacRepository();
  });

  it("cascades descendant ancestors when moving a department", () => {
    const descendant = repository.createDept({
      parentId: 210,
      deptName: "临时二级组",
      orderNum: 99,
      leader: "测试负责人",
      phone: "13800001234",
      email: "test@saifute.local",
      status: "0",
    });

    repository.updateDept({
      deptId: 210,
      parentId: 300,
    });

    const updatedDept = repository.getDept(210);
    const updatedDescendant = repository.getDept(descendant.deptId);
    const expectedPrefix = `${updatedDept.ancestors},${updatedDept.deptId}`;

    expect(
      updatedDescendant.ancestors === expectedPrefix ||
        updatedDescendant.ancestors.startsWith(`${expectedPrefix},`),
    ).toBe(true);
  });

  it("removes all dict data rows when deleting a dict type", () => {
    const type = repository
      .listDictTypes({})
      .rows.find(
        (item) =>
          repository.listDictData({ dictType: item.dictType }).rows.length > 1,
      );

    expect(type).toBeDefined();

    repository.deleteDictTypes([type?.dictId ?? 0]);

    expect(() => repository.getDictType(type?.dictId ?? 0)).toThrow();
    expect(
      repository.listDictData({ dictType: type?.dictType }).rows,
    ).toHaveLength(0);
  });
});
