/**
 * Launch Playwright and return a JSON fetch helper that runs in the browser context.
 * @param {string} origin
 * @param {string} landingPath
 * @param {(fetchSearchJson: (url: string, headers: Record<string, string>) => Promise<unknown>, page: import('playwright').Page) => Promise<unknown>} runner
 */
export async function withPlaywrightSession(origin, landingPath, runner) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(`${origin}${landingPath}`, {
      waitUntil: 'domcontentloaded',
      timeout: Number(process.env.SPIDER_TIMEOUT_MS ?? 90000),
    });
    await page.waitForTimeout(Number(process.env.SPIDER_BOOT_WAIT_MS ?? 3000));

    /**
     * @param {string} url
     * @param {Record<string, string>} headers
     */
    const fetchSearchJson = async (url, headers) => {
      return page.evaluate(
        async ({ requestUrl, requestHeaders }) => {
          const response = await fetch(requestUrl, { headers: requestHeaders });
          if (!response.ok) {
            const detail = await response.text();
            throw new Error(`Browser fetch failed (${response.status}): ${detail.slice(0, 120)}`);
          }
          return response.json();
        },
        { requestUrl: url, requestHeaders: headers },
      );
    };

    return await runner(fetchSearchJson, page);
  } finally {
    await browser.close();
  }
}
