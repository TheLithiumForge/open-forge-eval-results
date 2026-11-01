import { lstat, readFile, readdir } from "node:fs/promises";
import { resolve, relative, sep, isAbsolute, join } from "node:path";

export async function plainBytes(root: string, name: string): Promise<Buffer> {
  const base = resolve(root);
  const path = resolve(base, name);
  const within = relative(base, path);
  if (within === "" || within === ".." || within.startsWith(`..${sep}`) || isAbsolute(within)) throw new Error("File leaves its folder.");
  let current = base;
  for (const part of ["", ...within.split(sep)]) {
    current = join(current, part);
    if ((await lstat(current)).isSymbolicLink()) throw new Error("Linked files are refused.");
  }
  if (!(await lstat(path)).isFile()) throw new Error("Expected a plain file.");
  return readFile(path);
}

export async function folders(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  if (entries.some((entry) => entry.isSymbolicLink())) throw new Error("Linked folders are refused.");
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}
