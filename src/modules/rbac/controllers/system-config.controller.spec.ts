import { PERMISSIONS_KEY } from "../../../shared/decorators/permissions.decorator";
import { SystemConfigController } from "./system-config.controller";

describe("SystemConfigController", () => {
  it("protects config key lookup with reset password permission", () => {
    const permissions = Reflect.getMetadata(
      PERMISSIONS_KEY,
      SystemConfigController.prototype.getConfigByKey,
    );

    expect(permissions).toEqual(["system:user:resetPwd"]);
  });
});
