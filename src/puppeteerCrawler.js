const Apify = require('apify');
const cheerio = require('cheerio');
const runCrawler = require('./runCrawler');
const { sleep } = Apify.utils;

const { log } = Apify.utils;

module.exports = function ({ requestQueue, input, env }) {
    return new Apify.PuppeteerCrawler({
        requestQueue,
        launchPuppeteerOptions: {
            headless: true,
        },
        useSessionPool: true,
        sessionPoolOptions: {
            maxPoolSize: 30,
            persistStateKeyValueStoreId: 'amazon-sessions',
            sessionOptions: {
                maxUsageCount: 50,
            },
        },
        maxConcurrency: input.maxConcurrency || 5,
        maxRequestsPerCrawl: input.maxResults * 3,
        handlePageTimeoutSecs: 2.5 * 60,
        handleRequestTimeoutSecs: 60,
        persistCookiesPerSession: true,
        handlePageFunction: async ({ page, request, session }) => {
            const { url, userData, userData: { label } } = request;
            try {
                await page.waitForSelector('#a-popover-root');
            } catch (e) {
                await page.waitForSelector('body')
            }
            if (input.deliver !== '') {
                const cookies = JSON.parse(JSON.stringify(session.cookieJar))["cookies"];
                const cookie = cookies.find(x => x.key === 'sp-cdn');
                const deliverCountry = input.delivery.split(',');
                const code = deliverCountry[0];
                if (!cookie || cookie.value !== `"L5Z9:${code}"`) {
                    const deliveryCode = deliverCountry[1];
                    try {
                        try {
                            await page.waitForSelector('#nav-global-location-slot #glow-ingress-line2');
                            await page.click('#nav-global-location-slot #glow-ingress-line2');
                        } catch (e) {
                            await page.click('#nav-global-location-slot #glow-ingress-line2');
                        }

                        try {
                            await page.waitForSelector('.a-declarative > .a-dropdown-container > #GLUXCountryListDropdown > .a-button-inner > .a-button-text');
                            await page.click('.a-declarative > .a-dropdown-container > #GLUXCountryListDropdown > .a-button-inner > .a-button-text');
                        } catch (e) {
                            await page.click('.a-declarative > .a-dropdown-container > #GLUXCountryListDropdown > .a-button-inner > .a-button-text');
                        }
                        try {
                            await page.waitForSelector(`.a-popover-wrapper #${deliveryCode}`);
                            await page.click(`.a-popover-wrapper #${deliveryCode}`);
                        } catch (e) {
                            await page.click(`.a-popover-wrapper #${deliveryCode}`);
                        }
                    } catch (e) {
                        // Cannot change location do nothing
                    }
                }
            }
            const pageHTML = await page.evaluate(() => {
                return document.body.outerHTML;
            });
            const $ = cheerio.load(pageHTML);
            await runCrawler({ $, session, request, requestQueue, input, env });
        },
        handleFailedRequestFunction: async ({ page, request }) => {
            log.info(`Request ${request.url} failed 4 times`);
            const html = await page.evaluate(() => document.body.outerHTML);
            const $ = cheerio.load(html);
            await Apify.setValue(`bug_${Math.random()}.html`, $('body').html(), { contentType: 'text/html' });
        },
    })
};



