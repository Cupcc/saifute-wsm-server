import type { Request } from "express";
import { normalizeIpAddress, resolveRequestIp } from "./request-ip.util";

describe("request-ip.util", () => {
  it("normalizes IPv6 loopback and IPv4-mapped IPv6 addresses", () => {
    expect(normalizeIpAddress("::1")).toBe("127.0.0.1");
    expect(normalizeIpAddress("::ffff:192.168.1.24")).toBe("192.168.1.24");
  });

  it("resolves the normalized request ip before falling back to socket address", () => {
    const request = {
      ip: "::ffff:192.168.1.24",
      socket: {
        remoteAddress: "::1",
      },
    } as Request;

    expect(resolveRequestIp(request)).toBe("192.168.1.24");
  });

  it("falls back to the socket address when express ip is unavailable", () => {
    const request = {
      socket: {
        remoteAddress: "::1",
      },
    } as Request;

    expect(resolveRequestIp(request)).toBe("127.0.0.1");
  });
});
