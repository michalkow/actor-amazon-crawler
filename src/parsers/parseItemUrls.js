// The comment below makes sure that eslint ignores variables from inside
// of the webpage (eq. $ for jQuery and window)
/* global $ */
const Apify = require('apify');
const { getOriginUrl } = require('../utils/utils');

const { log } = Apify.utils;

async function extractItemDetails($, request, input) {
    let itemCount = 0;
    let itemSelector = '.s-result-list [data-asin]';
    if(input.skipSponsored)
        itemSelector += ':not(.AdHolder)';
    const { pageNumber, resultCount } = request.userData;
    const originUrl = await getOriginUrl(request);
    const itemUrls = [];
    const items = $(itemSelector);
    if (items.length !== 0) {
        items.each(function () {
            const asin = $(this).attr('data-asin');
            const sellerUrl = `${originUrl}/gp/offer-listing/${asin}`;
            const itemUrl = `${originUrl}/dp/${asin}`;
            const reviewsUrl = `${originUrl}/product-reviews/${asin}`;
            const sponsoredListing = $(this).hasClass('AdHolder');
            if (asin) {
                itemCount++;
                if ((resultCount + itemCount) <= input.maxResults)
                    itemUrls.push({
                        pagePosition: itemCount,
                        pageNumber,
                        url: itemUrl,
                        asin,
                        detailUrl: itemUrl,
                        sellerUrl,
                        reviewsUrl,
                        sponsoredListing
                    });
            }
        });
    }
    return itemUrls;
}

async function parseItemUrls($, request, input) {
    const urls = await extractItemDetails($, request, input);
    log.info(`Found ${urls.length} on a site, going to crawl them. URL: ${request.url}`);
    return urls;
}

module.exports = { parseItemUrls };
