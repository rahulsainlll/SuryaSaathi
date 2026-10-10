// Generates TypeScript types from the JSON schemas into src/generated/.
import { readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { compileFromFile } from "json-schema-to-typescript";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const schemaDir = path.join(root, "schemas");
const outDir = path.join(root, "src", "generated");

const files = (await readdir(schemaDir)).filter((f) => f.endsWith(".schema.json")).sort();

for (const file of files) {
  const ts = await compileFromFile(path.join(schemaDir, file), {
    cwd: schemaDir,
    bannerComment:
      "/* Generated from schemas/" + file + " by scripts/generate.mjs. Do not edit. */",
    additionalProperties: false,
    style: { printWidth: 100 },
  });
  await writeFile(path.join(outDir, file.replace(".schema.json", ".ts")), ts);
}

console.log(`Generated ${files.length} type files in src/generated`);
