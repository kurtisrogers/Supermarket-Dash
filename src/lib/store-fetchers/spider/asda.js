import { buildStoreCatalog } from '../common.js';
import { spiderDiscoveryTerms } from '../search-terms.js';
import { createSpiderThrottle, limitDiscoveryTerms, resolveSpiderMaxTerms } from './common.js';
import { crawlOcadoPlatformSearch } from './ocado-platform.js';
import { withPlaywrightSession } from './playwright-session.js';

const ORIGIN = 'https://groceries.asda.com';

/**
 * @param {{ maxPagesPerSource?: number, throttleMs?: number, maxTerms?: number }} [opts]
 */
export async function fetchAsdaSpiderCatalog(opts = {}) {
  const maxPages = opts.maxPagesPerSource ?? Number(process.env.FETCH_MAX_PAGES ?? 80);
  const throttle = createSpiderThrottle(opts);
  const terms = limitDiscoveryTerms(spiderDiscoveryTerms(), resolveSpiderMaxTerms(opts.maxTerms));

  console.log(`  Asda spider: searching ${terms.length} discovery terms…`);

  return withPlaywrightSession(ORIGIN, '/search/milk', async (fetchSearchJson, page) => {
    const title = await page.title();
    if (/cloudflare|attention required/i.test(title)) {
      throw new Error('Asda blocked the automated session (Cloudflare challenge)');
    }

    /** @type {import('../common.js').RawStoreProduct[]} */
    const products = [];

    for (const term of terms) {
      try {
        const before = products.length;
        const batch = await crawlOcadoPlatformSearch(term, maxPages, 'asda', ORIGIN, fetchSearchJson, throttle);
        products.push(...batch);
        const added = products.length - before;
        if (added > 0) {
          console.log(`    "${term}": +${added}`);
        }
      } catch (error) {
        console.warn(`    ⚠ Asda "${term}": ${error.message}`);
      }
    }

    if (!products.length) {
      throw new Error('Asda spider returned no products');
    }

    return buildStoreCatalog('asda', products, {
      fetchMethod: 'spider-asda',
      searchTerms: terms.length,
    });
  });
}
