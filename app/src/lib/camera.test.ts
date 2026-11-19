import { describe, expect, it } from "vitest";
import { cameraPrecheck, cameraProblem } from "./camera";

const dom = (name: string) => Object.assign(new Error(name), { name });

describe("camera problems", () => {
  it("refuses an insecure page before asking, then a browser without getUserMedia", () => {
    expect(cameraPrecheck({ secure: false, hasGetUserMedia: true })).toBe("insecure");
    expect(cameraPrecheck({ secure: true, hasGetUserMedia: false })).toBe("unsupported");
    expect(cameraPrecheck({ secure: true, hasGetUserMedia: true })).toBeNull();
  });
  it("maps getUserMedia rejections to what the person can do", () => {
    expect(cameraProblem(dom("NotAllowedError"))).toBe("denied");
    expect(cameraProblem(dom("SecurityError"))).toBe("denied");
    expect(cameraProblem(dom("NotFoundError"))).toBe("no_camera");
    expect(cameraProblem(dom("OverconstrainedError"))).toBe("no_camera");
    expect(cameraProblem(dom("NotReadableError"))).toBe("busy");
    expect(cameraProblem(dom("TypeError"))).toBe("failed");
    expect(cameraProblem("nope")).toBe("failed");
  });
});
