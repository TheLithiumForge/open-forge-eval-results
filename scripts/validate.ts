import { readRepository } from "./read.ts";
import { validateReferences } from "./references.ts";

export async function validateRepository(root?: string): Promise<number> {
  const batches = await readRepository(root);
  for (const batch of batches) validateReferences(batch);
  return batches.length;
}
if (import.meta.main) console.log(`Validated ${await validateRepository(process.argv[2])} batches.`);
