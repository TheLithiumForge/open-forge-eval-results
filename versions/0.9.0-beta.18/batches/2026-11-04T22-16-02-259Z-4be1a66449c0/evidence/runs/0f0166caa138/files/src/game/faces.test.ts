import { describe, expect, it } from "vitest";
import { faceName, getFace } from "./faces.ts";

describe("face identities", () => {
  it("derives shape, marker, fill and color from the face ID", () => {
    expect(faceName(0)).toBe("cyan solid circle, marker top");
    expect(faceName(64)).toBe("cyan outline circle, marker top");
    expect(getFace(15).markerX).toBeCloseTo(78.284);
  });

  it("provides all 128 distinct shape-marker-fill identities", () => {
    const identities = Array.from({ length: 128 }, (_, id) => {
      const face = getFace(id);
      return [face.shape, face.marker, face.fill].join("-");
    });
    expect(new Set(identities).size).toBe(128);
  });
});
