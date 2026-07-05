import { Throttle } from '../common.js';

export const SPIDER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export const DEFAULT_SPIDER_HEADERS = {
  'User-Agent': SPIDER_USER_AGENT,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-GB,en;q=0.9',
};

export const JSON_SPIDER_HEADERS = {
  ...DEFAULT_SPIDER_HEADERS,
  Accept: 'application/json, text/plain, */*',
};

/**
 * @param {string} url
 * @param {Record<string, string>} [extraHeaders]
 */
export async function fetchHtml(url, extraHeaders = {}) {
  const response = await fetch(url, {
    headers: { ...DEFAULT_SPIDER_HEADERS, ...extraHeaders },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Spider fetch failed (${response.status}) for ${url}`);
  }

  return response.text();
}

/**
 * @param {string} url
 * @param {Record<string, string>} [extraHeaders]
 */
export async function fetchJson(url, extraHeaders = {}) {
  const response = await fetch(url, {
    headers: { ...JSON_SPIDER_HEADERS, ...extraHeaders },
    redirect: 'follow',
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Spider JSON fetch failed (${response.status}) for ${url}${detail ? `: ${detail.slice(0, 120)}` : ''}`);
  }

  return response.json();
}

/**
 * Resolve Nuxt/Vue dehydrated payload arrays that use numeric references.
 * @param {unknown[]} arr
 * @param {unknown} idx
 * @param {Set<number>} [stack]
 */
export function derefPayload(arr, idx, stack = new Set()) {
  if (idx === null || idx === undefined) {
    return idx;
  }

  if (typeof idx !== 'number') {
    return idx;
  }

  if (stack.has(idx)) {
    return undefined;
  }

  stack.add(idx);
  const val = arr[idx];

  if (Array.isArray(val)) {
    return val.map((entry) => derefPayload(arr, entry, new Set(stack)));
  }

  if (val && typeof val === 'object') {
    /** @type {Record<string, unknown>} */
    const out = {};
    for (const [key, entry] of Object.entries(val)) {
      out[key] = derefPayload(arr, entry, new Set(stack));
    }
    return out;
  }

  return val;
}

/**
 * @param {string} html
 */
export function extractBalancedJson(html, marker) {
  const start = html.indexOf(marker);
  if (start < 0) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < html.length; i += 1) {
    const char = html[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '[' || char === '{') {
      depth += 1;
    }

    if (char === ']' || char === '}') {
      depth -= 1;
      if (depth === 0) {
        return html.slice(start, i + 1);
      }
    }
  }

  return null;
}

/**
 * @param {string} html
 */
export function parseNuxtPayload(html) {
  const jsonText = extractBalancedJson(html, '[["ShallowReactive"');
  if (!jsonText) {
    return null;
  }

  return JSON.parse(jsonText);
}

/**
 * @param {string} html
 */
export function parseWaitrosePreloadedState(html) {
  const match = html.match(/__PRELOADED_STATE__\s*=\s*JSON\.parse\('([\s\S]*?)'\);/);
  if (!match) {
    return null;
  }

  const jsonText = match[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\');
  return JSON.parse(jsonText);
}

/**
 * @param {string} html
 */
export function parseMorrisonsInitialState(html) {
  const match = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/);
  if (!match) {
    return null;
  }

  return JSON.parse(match[1]);
}

/**
 * @param {{ maxPagesPerSource?: number, throttleMs?: number }} [opts]
 */
export function createSpiderThrottle(opts = {}) {
  return new Throttle(opts.throttleMs ?? 900);
}

/**
 * @param {number} minorAmount
 */
export function priceFromMinor(minorAmount) {
  const value = Number(minorAmount);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value >= 10 ? value / 100 : value;
}

/**
 * @param {string} amount
 */
export function priceFromAmountString(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value;
}

/**
 * @param {number} [explicitMax]
 */
export function resolveSpiderMaxTerms(explicitMax) {
  if (explicitMax != null && explicitMax > 0) {
    return explicitMax;
  }

  const envValue = Number(process.env.SPIDER_MAX_TERMS ?? 0);
  return envValue > 0 ? envValue : undefined;
}

/**
 * @param {unknown[]} terms
 * @param {number} [maxTerms]
 */
export function limitDiscoveryTerms(terms, maxTerms) {
  if (!maxTerms || maxTerms >= terms.length) {
    return terms;
  }

  return terms.slice(0, maxTerms);
}
