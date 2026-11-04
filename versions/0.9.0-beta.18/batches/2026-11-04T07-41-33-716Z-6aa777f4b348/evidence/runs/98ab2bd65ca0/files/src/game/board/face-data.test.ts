import { describe, expect, it } from "vitest";
import { getFaceData } from "./face-data.ts";

describe("face identities", () => {
  it("names the documented solid and outline examples", () => {
    expect(getFaceData(0)?.accessibleName).toBe("cyan solid circle, marker top");
    expect(getFaceData(64)?.accessibleName).toBe("cyan outline circle, marker top");
  });

  it("generates all 128 shape, marker, and fill combinations", () => {
    const faces = Array.from({ length: 128 }, (_, id) => getFaceData(id));
    expect(faces.every((face) => face !== null)).toBe(true);
    expect(new Set(faces.map((face) => face?.accessibleName)).size).toBe(128);
    expect(getFaceData(-1)).toBeNull();
    expect(getFaceData(128)).toBeNull();
  });

  it("places radial marker centers 40 units from the face center", () => {
    for (let id = 0; id < 128; id += 8) {
      const face = getFaceData(id);
      if (face === null) continue;
      expect(Math.hypot(face.markerX - 50, face.markerY - 50)).toBeCloseTo(40, 2);
    }
  });
});
