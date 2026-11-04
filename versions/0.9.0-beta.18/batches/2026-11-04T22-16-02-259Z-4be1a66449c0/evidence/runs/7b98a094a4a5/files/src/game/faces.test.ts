import { describe, expect, it } from "vitest";
import { describeFace } from "./faces.js";

describe("face identities", () => {
  it("names the first solid and outline faces as specified", () => {
    expect(describeFace(0)?.name).toBe("cyan solid circle, marker top");
    expect(describeFace(64)?.name).toBe("cyan outline circle, marker top");
  });

  it("produces 128 distinct shape, marker, and fill identities", () => {
    const faces = Array.from({ length: 128 }, (_, id) => describeFace(id));
    const identities = faces.map((face) => `${face?.fill}/${face?.shape}/${face?.marker}`);
    expect(faces.every((face) => face !== null)).toBe(true);
    expect(new Set(identities).size).toBe(128);
    expect(describeFace(128)).toBeNull();
  });
});
