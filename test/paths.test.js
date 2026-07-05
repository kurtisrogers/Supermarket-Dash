import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveAssetPath, resolveBasePath } from '../src/lib/paths.js';

test('resolveBasePath keeps trailing slash for directory paths', () => {
  assert.equal(resolveBasePath('/Supermarket-Dash/'), '/Supermarket-Dash/');
});

test('resolveBasePath adds slash for repo root without trailing slash', () => {
  assert.equal(resolveBasePath('/Supermarket-Dash'), '/Supermarket-Dash/');
});

test('resolveBasePath resolves from index.html paths', () => {
  assert.equal(resolveBasePath('/Supermarket-Dash/index.html'), '/Supermarket-Dash/');
});

test('resolveAssetPath builds GitHub Pages data URL', () => {
  assert.equal(
    resolveAssetPath('data/products.json', '/Supermarket-Dash/'),
    '/Supermarket-Dash/data/products.json',
  );
});

test('resolveAssetPath builds GitHub Pages partial URL', () => {
  assert.equal(
    resolveAssetPath('partials/basket/tesco.html', '/Supermarket-Dash/index.html'),
    '/Supermarket-Dash/partials/basket/tesco.html',
  );
});

test('resolveAssetPath works on custom domain root', () => {
  assert.equal(resolveAssetPath('data/products.json', '/'), '/data/products.json');
});
