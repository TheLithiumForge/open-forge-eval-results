import { describe, expect, it } from "vitest";
import { faceName } from "./faces.ts";

describe("face identities", () => {
  it("names all 128 shape, marker and fill combinations uniquely", () => {
    const names = Array.from({ length: 128 }, (_, faceId) => faceName(faceId));
    expect(new Set(names).size).toBe(128);
    expect(faceName(0)).toBe("cyan solid circle, marker top");
    expect(faceName(64)).toBe("cyan outline circle, marker top");
  });
});
