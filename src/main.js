/* global $, window */
const Apify = require('apify');

const createSearchUrls = require('./utils/createSearchUrls');
const basicCrawler = require('./basicCrawler');
const puppeteerCrawler = require('./puppeteerCrawler');
const { log } = Apify.utils;

Apify.main(async () => {
    // Get queue and enqueue first url.
    const requestQueue = await Apify.openRequestQueue();
    const input = await Apify.getValue('INPUT');
    const env = await Apify.getEnv();

    const searchUrls = await createSearchUrls(input);

    for (const searchUrl of searchUrls) {
        log.info('Search url: ' + searchUrl.url);
        await requestQueue.addRequest(searchUrl);
    }

    const crawlerOptions = { requestQueue, input, env };

    if (input.scraper)
        await puppeteerCrawler(crawlerOptions).run()
    else
        await basicCrawler(crawlerOptions).run();
});
