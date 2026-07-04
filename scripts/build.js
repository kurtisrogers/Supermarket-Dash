import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DOCS = join(ROOT, 'docs');

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
  const compare = readFileSync(join(ROOT, 'src/js/compare.js'), 'utf8');
  const basket = readFileSync(join(ROOT, 'src/js/basket.js'), 'utf8');
  const app = readFileSync(join(ROOT, 'src/js/app.js'), 'utf8');

  const bundled = `/* Supermarket Dash — bundled app */\n${compare}\n${basket}\n${app}\n`;
  writeFileSync(join(DOCS, 'js/app.js'), bundled);
}

function patchIndexHtml() {
  let html = readFileSync(join(ROOT, 'src/index.html'), 'utf8');
  html = html.replace(/\.\.\/data\//g, 'data/');
  html = html.replace(/src="js\//g, 'src="js/');
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
