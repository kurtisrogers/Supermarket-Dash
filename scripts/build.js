import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DOCS = join(ROOT, 'docs');

const LIB_FILES = ['paths.js', 'search.js', 'compare.js', 'basket.js'];

function stripExports(source) {
  return source
    .replace(/^export async function /gm, 'async function ')
    .replace(/^export function /gm, 'function ')
    .replace(/^export /gm, '');
}

function ensureProductsJson() {
  const productsPath = join(ROOT, 'src/data/products.json');
  if (!existsSync(productsPath)) {
    console.log('products.json missing — running seed fallback');
    const seed = JSON.parse(readFileSync(join(ROOT, 'src/data/products.seed.json'), 'utf8'));
    const supermarkets = JSON.parse(readFileSync(join(ROOT, 'src/data/supermarkets.json'), 'utf8'));
    writeFileSync(
      productsPath,
      JSON.stringify(
        {
          meta: {
            lastUpdated: new Date().toISOString(),
            source: 'seed',
            productCount: seed.products.length,
            storeCount: supermarkets.length,
          },
          products: seed.products,
        },
        null,
        2,
      ) + '\n',
    );
  }
}

function copyDir(src, dest) {
  cpSync(src, dest, { recursive: true });
}

function bundleAppJs() {
  const libCode = LIB_FILES.map((file) =>
    stripExports(readFileSync(join(ROOT, 'src/lib', file), 'utf8')),
  ).join('\n');

  const app = readFileSync(join(ROOT, 'src/js/app.js'), 'utf8');

  const attachGlobals = `
window.SupermarketPaths = { resolveBasePath, resolveAssetPath, readRuntimeBasePath };
window.SupermarketSearch = { filterProducts };
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
