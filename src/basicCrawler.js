const Apify = require('apify');
const cheerio = require('cheerio');
const CloudFlareUnBlocker = require('./lib/unblocker');
const runCrawler = require('./runCrawler');
const { updateCookies } = require('./lib/updateCookies');

const { log } = Apify.utils;

module.exports = function ({ requestQueue, input, env }) {
    const cloudFlareUnBlocker = new CloudFlareUnBlocker({
        proxyConfiguration: { ...input.proxy },
    });

    return new Apify.BasicCrawler({
        requestQueue,
        useSessionPool: true,
        sessionPoolOptions: {
            maxPoolSize: 30,
            persistStateKeyValueStoreId: 'amazon-sessions',
            sessionOptions: {
                maxUsageCount: 50,
            },
        },
        maxConcurrency: input.maxConcurrency || 5,
        maxRequestsPerCrawl: input.maxResults * 10,
        handlePageTimeoutSecs: 2.5 * 60,
        persistCookiesPerSession: true,
        handleRequestFunction: async ({ request, session }) => {
            // log.info(session.id);
            if (input.delivery !== '') {
                let kukies = await Apify.getValue('puppeteerCookies');
                if (!kukies) {
                    const puppeteerCookies = await updateCookies({ domain: request.userData.domain, delivery: input.delivery });
                    kukies = puppeteerCookies;
                    await Apify.setValue('puppeteerCookies', puppeteerCookies);
                }
                const cookies = [];
                kukies.forEach(kukie => {
                    if (kukie.name === "sp-cdn") {
                        cookies.push({ name: kukie.name, value: kukie.value });
                    }
                });
                session.setPuppeteerCookies(cookies, request.url);
            }
            // console.log(kukies)
            // log.info(session.getCookieString(request.url));
            const responseRequest = await cloudFlareUnBlocker.unblock({ request, session });
            const { statusCode, body } = responseRequest;
            const $ = cheerio.load(body);
            // to handle blocked requests
            const title = $('title').length !== 0 ? $('title').text().trim() : '';
            const captchaInput = $('input#captchacharacters').length;
            if (statusCode !== 200
                || captchaInput
                || title.includes('Robot Check')
                || title.includes('CAPTCHA')
                || title.includes('Toutes nos excuses')
                || title.includes('Tut uns Leid!')
                || title.includes('Service Unavailable Error')) {
                session.retire();
                // dont mark this request as bad, it is probably looking for working session
                request.retryCount--;
                // dont retry the request right away, wait a little bit
                await Apify.utils.sleep(5000);
                throw new Error('Session blocked, retiring. If you see this for a LONG time, stop the run - you don\'t have any working proxy right now. But by default this can happen for some time until we find working session.');
            }
            await runCrawler({ $, session, request, requestQueue, input, env });
        },
        handleFailedRequestFunction: async ({ request }) => {
            log.info(`Request ${request.url} failed 4 times`);
            await Apify.setValue(`bug_${Math.random()}.html`, $('body').html(), { contentType: 'text/html' });
        },
    });
}
