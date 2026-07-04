import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const LIB_FILES = ['paths.js', 'search.js', 'compare.js', 'basket.js'];

function stripExports(source) {
  return source
    .replace(/^export async function /gm, 'async function ')
    .replace(/^export function /gm, 'function ')
    .replace(/^export /gm, '');
}

function bundleForBrowser() {
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

  return `${libCode}\n${attachGlobals}\n${app}`;
}

export { bundleForBrowser, stripExports };
