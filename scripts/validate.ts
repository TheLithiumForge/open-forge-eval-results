import { plainBytes } from "./files.ts";
import { fileURLToPath } from "node:url";
import { createValidator } from "./validate-data.ts";
import { SchemaNames } from "./catalogue.ts";
import { RepositoryRoot, readRepository } from "./read.ts";
import { validateReferences } from "./references.ts";

export async function validateRepository(root?: string): Promise<number> {
  const batches = await readRepository(root);
  for (const batch of batches) validateReferences(batch);
  const repository = root ?? RepositoryRoot;
  const schemaRoot = fileURLToPath(new URL("../schemas/", import.meta.url));
  const schemas: object[] = await Promise.all(SchemaNames.map(async (name): Promise<object> => JSON.parse((await plainBytes(schemaRoot, `v2/${name}.json`)).toString())));
  const indexSchema: object = JSON.parse((await plainBytes(schemaRoot, "index.json")).toString());
  const validator = createValidator(schemas, indexSchema);
  validator.matches(validator.index(JSON.parse((await plainBytes(repository, "index.json")).toString())), batches);
  return batches.length;
}
if (import.meta.main) console.log(`Validated ${await validateRepository(process.argv[2])} batches.`);
