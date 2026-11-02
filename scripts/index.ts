import { rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { catalogue } from "./catalogue.ts";
import { readRepository, RepositoryRoot } from "./read.ts";
import { validateReferences } from "./references.ts";
export async function writeIndex(root = RepositoryRoot): Promise<void> {
  const batches = await readRepository(root);
  for (const batch of batches)
    validateReferences(batch);
  const target = join(root, "index.json");
  const temporary = `${target}.tmp`;
  await writeFile(temporary, JSON.stringify(catalogue(batches), null, 2) + "\n");
  await rename(temporary, target);
}
if (import.meta.main)
  await writeIndex();
