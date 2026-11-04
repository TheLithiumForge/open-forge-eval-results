import { describe, expect, it } from "vitest";
import { COLORS, FILLS, MARKERS, SHAPES, describeFace, markerCenter } from "./faces.ts";

describe("face identities", () => {
  it("names all 128 identities from shape, marker, fill, and palette order", () => {
    expect(describeFace(0)?.name).toBe("cyan solid circle, marker top");
    expect(describeFace(64)?.name).toBe("cyan outline circle, marker top");
    const faces = Array.from({ length: 128 }, (_, id) => describeFace(id)?.name);
    expect(new Set(faces).size).toBe(128);
    expect(SHAPES).toHaveLength(8);
    expect(MARKERS).toHaveLength(8);
    expect(FILLS).toEqual(["solid", "outline"]);
    expect(COLORS).toHaveLength(8);
  });

  it("rejects unknown faces and keeps diagonal marker offsets normalized", () => {
    expect(describeFace(-1)).toBeNull();
    expect(describeFace(128)).toBeNull();
    expect(markerCenter("top-right")).toEqual([78.284, 21.716]);
    expect(markerCenter("bottom-left")).toEqual([21.716, 78.284]);
  });
});
