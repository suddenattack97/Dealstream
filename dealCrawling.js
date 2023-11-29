const axios = require('axios');
const cheerio = require('cheerio');

async function fetchItems(url) {
    try {
        const response = await axios.get(url);
        const html = response.data;
        const $ = cheerio.load(html);
        const items = [];

        // 각 상품의 정보를 순회하여 추출합니다.
        $('.inner').each((index, element) => {
            const title = $(element).find('.title').text().trim();
            const salePercentage = $(element).find('.sale strong').text().trim();
            const originalPrice = $(element).find('.price del').text().trim();
            const salePrice = $(element).find('.price strong').text().trim();
            const imageUrl = $(element).find('img.thumb').attr('src');
            const goodsCode = $(element).find('.inner a').attr('href');

            // 상품 정보를 객체에 추가합니다.
            items.push({ title, salePercentage, originalPrice, salePrice, imageUrl, goodsCode });
        });

        return items;
    } catch (error) {
        console.error(`Error fetching items: ${error}`);
        return [];
    }
}

const url = 'https://www.gmarket.co.kr/n/superdeal';
fetchItems(url).then(items => console.log(JSON.stringify(items, null, 2)));