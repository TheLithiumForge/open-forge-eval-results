import { createHash } from "node:crypto";
import type { Artifact } from "./records.types.ts";
function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`).join(",")}}`;
  const result = JSON.stringify(value);
  if (result === undefined) throw new Error("Manifest values must be JSON values.");
  return result;
}
export function manifestHash(files: readonly Artifact[]): string {
  const entries = files.map(({ path, bytes, sha256 }) => ({ path, bytes, sha256 })).sort((a, b) => a.path.localeCompare(b.path));
  return createHash("sha256").update(stableJson(entries)).digest("hex");
}
