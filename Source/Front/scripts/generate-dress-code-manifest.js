/**
 * Сканирует public/images/black_tie/, собирает {sex}_{number}.jpg (female_1, male_1 и т.д.),
 * сортирует по number и чередует male/female, дополняет до минимум 6 слотов.
 * Записывает dressCodeManifest.json в src/app/constants/.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DRESS_CODE_DIR = path.join(ROOT, 'public', 'images', 'black_tie');
const OUT_PATH = path.join(ROOT, 'src', 'app', 'constants', 'dressCodeManifest.json');
const MIN_SLOTS = 6;
const RE = /^(male|female)_(\d+)\.jpg$/i;

if (!fs.existsSync(DRESS_CODE_DIR)) {
  fs.mkdirSync(DRESS_CODE_DIR, { recursive: true });
}

const files = fs.readdirSync(DRESS_CODE_DIR);
const parsed = [];
for (const name of files) {
  const m = name.match(RE);
  if (m) {
    const sex = m[1].toLowerCase();
    const num = parseInt(m[2], 10);
    parsed.push({ sex, num, name });
  }
}

// Сортировка: по num, затем male раньше female
parsed.sort((a, b) => {
  if (a.num !== b.num) return a.num - b.num;
  return a.sex === 'male' ? -1 : 1;
});

const paths = parsed.map((p) => `/images/black_tie/${p.name}`); // p.name уже female_1.jpg, male_1.jpg и т.д.
while (paths.length < MIN_SLOTS) {
  paths.push('');
}

const manifest = { images: paths };
fs.writeFileSync(OUT_PATH, JSON.stringify(manifest, null, 2), 'utf8');
console.log(`Wrote ${OUT_PATH} with ${paths.length} slots (${parsed.length} from folder).`);
