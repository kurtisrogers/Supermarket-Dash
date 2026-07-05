import { buildStoreCatalog } from '../common.js';
import { spiderDiscoveryTerms } from '../search-terms.js';
import { createSpiderThrottle, limitDiscoveryTerms, resolveSpiderMaxTerms } from './common.js';
import { crawlOcadoPlatformSearch } from './ocado-platform.js';
import { withPlaywrightSession } from './playwright-session.js';

const ORIGIN = 'https://www.ocado.com';

/**
 * @param {{ maxPagesPerSource?: number, throttleMs?: number, maxTerms?: number }} [opts]
 */
export async function fetchOcadoSpiderCatalog(opts = {}) {
  const maxPages = opts.maxPagesPerSource ?? Number(process.env.FETCH_MAX_PAGES ?? 80);
  const throttle = createSpiderThrottle(opts);
  const terms = limitDiscoveryTerms(spiderDiscoveryTerms(), resolveSpiderMaxTerms(opts.maxTerms));

  console.log(`  Ocado spider: searching ${terms.length} discovery terms…`);

  return withPlaywrightSession(ORIGIN, '/search?entry=milk', async (fetchSearchJson) => {
    /** @type {import('../common.js').RawStoreProduct[]} */
    const products = [];

    for (const term of terms) {
      try {
        const before = products.length;
        const batch = await crawlOcadoPlatformSearch(term, maxPages, 'ocado', ORIGIN, fetchSearchJson, throttle);
        products.push(...batch);
        const added = products.length - before;
        if (added > 0) {
          console.log(`    "${term}": +${added}`);
        }
      } catch (error) {
        console.warn(`    ⚠ Ocado "${term}": ${error.message}`);
      }
    }

    return buildStoreCatalog('ocado', products, {
      fetchMethod: 'spider-ocado',
      searchTerms: terms.length,
    });
  });
}
