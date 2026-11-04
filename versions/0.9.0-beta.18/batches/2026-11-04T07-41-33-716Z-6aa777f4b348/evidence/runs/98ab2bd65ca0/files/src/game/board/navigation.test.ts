import { describe, expect, it } from "vitest";
import { focusDestination } from "./navigation.ts";

describe("board keyboard navigation", () => {
  it("moves within a row and column", () => {
    expect(focusDestination(5, 4, "ArrowLeft")).toBe(4);
    expect(focusDestination(5, 4, "ArrowRight")).toBe(6);
    expect(focusDestination(5, 4, "ArrowUp")).toBe(1);
    expect(focusDestination(5, 4, "ArrowDown")).toBe(9);
  });

  it("stops at every board edge", () => {
    expect(focusDestination(0, 4, "ArrowLeft")).toBe(0);
    expect(focusDestination(3, 4, "ArrowRight")).toBe(3);
    expect(focusDestination(1, 4, "ArrowUp")).toBe(1);
    expect(focusDestination(13, 4, "ArrowDown")).toBe(13);
  });
});
