import { describe, expect, it } from "vitest";
import { parseBoardCode } from "./code.ts";

describe("board codes", () => {
  it("parses canonical supported sizes and seed bounds", () => {
    expect(parseBoardCode("np1-16-2147483646")).toEqual({
      value: "np1-16-2147483646",
      size: 16,
      seed: 2147483646,
    });
  });

  it.each(["np1-4-0", "np1-4-01", "np1-5-1", "np1-4-2147483647", " np1-4-1", "np1-4-1\n"])(
    "rejects noncanonical code %j",
    (code) => expect(parseBoardCode(code)).toBeNull(),
  );
});
