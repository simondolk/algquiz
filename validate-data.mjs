// scripts/validate-data.mjs
import { readFile } from 'node:fs/promises';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const speciesSchema = JSON.parse(await readFile(new URL('../schemas/species.schema.json', import.meta.url)));
const categorySchema = JSON.parse(await readFile(new URL('../schemas/category.schema.json', import.meta.url)));

const validateSpecies = ajv.compile(speciesSchema);
const validateCategory = ajv.compile(categorySchema);

function report(errors) {
  return errors?.map(e => `- ${e.instancePath || '(root)'} ${e.message}`).join('
');
}

async function main() {
  const species = JSON.parse(await readFile(new URL('../data/species/index.json', import.meta.url)));
  let ok = true;
  for (const [i, s] of species.entries()) {
    const valid = validateSpecies(s);
    if (!valid) {
      ok = false;
      console.error(`Species[${i}] invalid (id=${s.id}):
${report(validateSpecies.errors)}`);
    }
  }

  const catsOverview = JSON.parse(await readFile(new URL('../data/categories.json', import.meta.url)));
  for (const c of catsOverview) {
    const cat = JSON.parse(await readFile(new URL('../' + c.path, import.meta.url)));
    const valid = validateCategory(cat);
    if (!valid) {
      ok = false;
      console.error(`Category ${c.id} invalid:
${report(validateCategory.errors)}`);
    }
    const speciesIds = new Set(species.map(s => s.id));
    const missing = cat.speciesIds.filter(id => !speciesIds.has(id));
    if (missing.length) {
      ok = false;
      console.error(`Category ${c.id} references missing ids: ${missing.join(', ')}`);
    }
  }

  if (!ok) {
    process.exit(1);
  } else {
    console.log('✅ All data files are valid.');
  }
}

main().catch(err => {
  console.error('Validation failed:', err);
  process.exit(1);
});
