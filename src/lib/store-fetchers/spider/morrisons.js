import { buildStoreCatalog } from '../common.js';
import { spiderDiscoveryTerms } from '../search-terms.js';
import { createSpiderThrottle, fetchJson, limitDiscoveryTerms, resolveSpiderMaxTerms } from './common.js';
import { crawlOcadoPlatformSearch } from './ocado-platform.js';

const ORIGIN = 'https://groceries.morrisons.com';

/**
 * @param {{ maxPagesPerSource?: number, throttleMs?: number, maxTerms?: number }} [opts]
 */
export async function fetchMorrisonsSpiderCatalog(opts = {}) {
  const maxPages = opts.maxPagesPerSource ?? Number(process.env.FETCH_MAX_PAGES ?? 80);
  const throttle = createSpiderThrottle(opts);
  const products = [];
  const terms = limitDiscoveryTerms(spiderDiscoveryTerms(), resolveSpiderMaxTerms(opts.maxTerms));

  console.log(`  Morrisons spider: searching ${terms.length} discovery terms…`);

  for (const term of terms) {
    try {
      const before = products.length;
      const batch = await crawlOcadoPlatformSearch(
        term,
        maxPages,
        'morrisons',
        ORIGIN,
        (url, headers) => fetchJson(url, headers),
        throttle,
      );
      products.push(...batch);
      const added = products.length - before;
      if (added > 0) {
        console.log(`    "${term}": +${added}`);
      }
    } catch (error) {
      console.warn(`    ⚠ Morrisons "${term}": ${error.message}`);
    }
  }

  return buildStoreCatalog('morrisons', products, {
    fetchMethod: 'spider-morrisons',
    searchTerms: terms.length,
  });
}
