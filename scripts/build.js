import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DOCS = join(ROOT, 'docs');

const LIB_FILES = ['paths.js', 'search.js', 'barcode.js', 'compare.js', 'basket.js'];

function stripModuleSyntax(source) {
  return source
    .replace(/^import\s+[\s\S]*?\s+from\s+['"][^'"]+['"];\s*\n?/gm, '')
    .replace(/^export async function /gm, 'async function ')
    .replace(/^export function /gm, 'function ')
    .replace(/^export class /gm, 'class ')
    .replace(/^export const /gm, 'const ')
    .replace(/^export /gm, '');
}

function ensureProductsJson() {
  const productsPath = join(ROOT, 'src/data/products.json');
  if (!existsSync(productsPath)) {
    console.log('products.json missing — building catalog from per-supermarket seeds…');
    spawnSync('node', ['scripts/build-catalog.js'], { cwd: ROOT, stdio: 'inherit' });
  }
  validateJsonFile(productsPath);
}

function validateJsonFile(path) {
  const raw = readFileSync(path, 'utf8');
  if (raw.includes('<<<<<<<') || raw.includes('>>>>>>>') || raw.includes('=======')) {
    throw new Error(`Invalid JSON in ${path}: unresolved git conflict markers`);
  }
  JSON.parse(raw);
}

function copyDir(src, dest) {
  cpSync(src, dest, { recursive: true });
}

function bundleAppJs() {
  const libCode = LIB_FILES.map((file) =>
    stripModuleSyntax(readFileSync(join(ROOT, 'src/lib', file), 'utf8')),
  ).join('\n');

  const app = readFileSync(join(ROOT, 'src/js/app.js'), 'utf8');

  const attachGlobals = `
window.SupermarketPaths = { resolveBasePath, resolveAssetPath, readRuntimeBasePath };
window.SupermarketSearch = {
  filterProducts,
  findProductByBarcode,
  findProductsBySku,
  normalizeBarcode,
  normalizeSku,
  isBarcodeQuery,
  isSkuQuery,
};
window.SupermarketBarcode = {
  canUseBarcodeDetector,
  canUseCamera,
  loadHtml5Qrcode,
  resolveScannedProduct,
  startBarcodeScanner,
  getScannerSupportMessage,
};
window.SupermarketCompare = { compareList, formatGBP, getItemPrice, buildSavingsMap, hasLoyaltyCard };
window.SupermarketBasket = {
  buildSearchUrl,
  formatListForStore,
  getBasketStrategy,
  copyToClipboard,
  openStoreWithFirstItem,
  getQuickSearchLinks,
};
`;

  const bundled = `/* Supermarket Dash — bundled app */\n${libCode}\n${attachGlobals}\n${app}\n`;

  if (/\bimport\s+/.test(bundled) || /^export\s+/m.test(bundled)) {
    throw new Error('Bundled app.js still contains import/export statements');
  }

  writeFileSync(join(DOCS, 'js/app.js'), bundled);
}

function patchIndexHtml() {
  let html = readFileSync(join(ROOT, 'src/index.html'), 'utf8');
  html = html.replace(/\.\.\/data\//g, 'data/');
  writeFileSync(join(DOCS, 'index.html'), html);
}

function main() {
  console.log('Building Supermarket Dash for GitHub Pages…\n');

  ensureProductsJson();

  mkdirSync(join(DOCS, 'js'), { recursive: true });
  mkdirSync(join(DOCS, 'css'), { recursive: true });
  mkdirSync(join(DOCS, 'data'), { recursive: true });
  mkdirSync(join(DOCS, 'partials'), { recursive: true });

  copyDir(join(ROOT, 'src/css'), join(DOCS, 'css'));
  copyDir(join(ROOT, 'src/partials'), join(DOCS, 'partials'));
  copyDir(join(ROOT, 'src/data'), join(DOCS, 'data'));

  bundleAppJs();
  patchIndexHtml();

  console.log('✓ Built to docs/');
}

main();
