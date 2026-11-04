import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FaceArtwork } from "./FaceArtwork.tsx";
import { describeFace, FACE_TOTAL, MARKER_NAMES, SHAPE_NAMES } from "./face.ts";

describe("face artwork identities", () => {
  it("maps every face to one unique shape, marker, and fill identity", () => {
    const faces = Array.from({ length: FACE_TOTAL }, (_, id) => describeFace(id));
    const identities = new Set(faces.map(({ shape, marker, fill }) => `${shape}|${marker}|${fill}`));
    expect(identities.size).toBe(FACE_TOTAL);
    expect(new Set(faces.map(({ name }) => name)).size).toBe(FACE_TOTAL);
    expect(faces[0]?.name).toBe("cyan solid circle, marker top");
    expect(faces[64]?.name).toBe("cyan outline circle, marker top");
    expect(faces.every(({ shape }) => SHAPE_NAMES.includes(shape))).toBe(true);
  });

  it("places eight markers exactly 40 units from center with diagonal normalization", () => {
    for (let index = 0; index < MARKER_NAMES.length; index += 1) {
      const face = describeFace(index * SHAPE_NAMES.length);
      const distance = Math.hypot(face.markerX - 50, face.markerY - 50);
      expect(distance).toBeCloseTo(40, 8);
      expect(face.marker).toBe(MARKER_NAMES[index]);
    }
    expect(describeFace(8).markerX).toBeCloseTo(50 + 40 / Math.SQRT2, 8);
    expect(describeFace(8).markerY).toBeCloseTo(50 - 40 / Math.SQRT2, 8);
  });

  it("draws filled and outlined square faces with separate marker strokes", () => {
    const solid = renderToStaticMarkup(<FaceArtwork faceId={9} />);
    const outlined = renderToStaticMarkup(<FaceArtwork faceId={73} />);
    expect(solid).toContain('viewBox="0 0 100 100"');
    expect(solid).toContain('fill="#FF71D6"');
    expect(solid).toContain('cx="78.2842712475" cy="21.7157287525" r="5"');
    expect(outlined).toContain('fill="none"');
    expect(outlined).toContain('stroke-width="5"');
    expect(outlined).toContain('stroke="#111625" stroke-width="3"');
  });

  it("rejects identities outside the documented range", () => {
    expect(() => describeFace(-1)).toThrow(RangeError);
    expect(() => describeFace(128)).toThrow(RangeError);
    expect(() => describeFace(1.5)).toThrow(RangeError);
  });
});
