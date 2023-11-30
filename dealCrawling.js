const axios = require('axios');
const cheerio = require('cheerio');
const mysql = require('mysql2');

// MySQL 데이터베이스 연결 설정
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'minsu',
    password: 'kang00aa@@',
    database: 'dealstream'
});
connection.connect();

function getKSTDate() {
    const now = new Date();
    now.setHours(now.getHours() + 9); // UTC 시간에서 9시간을 더합니다.
    return now.toISOString().replace('T', ' ').substring(0, 19); // 'YYYY-MM-DD HH:mm:ss' 형식으로 변환합니다.
}

let previousItems = []; // 이전 아이템을 저장할 전역 변수

function calculateDifference(newItems, oldItems) {
    const newItemCodes = new Set(newItems.map(item => item.goodsCode));
    return oldItems.filter(item => !newItemCodes.has(item.goodsCode));
}
async function fetchItems(url) {
    try {
        const response = await axios.get(url);
        const html = response.data;
        const $ = cheerio.load(html);
        const items = [];

        // 각 상품의 정보를 순회하여 추출합니다.
        $('.inner').each((index, element) => {
            const title = $(element).find('.title').text().trim();
            const salePercentage = $(element).find('.sale strong').text();

            let originalPrice = $(element).find('.price del').text().trim().replace(/[^\d]/g, '');
            let salePrice = $(element).find('.price strong').text().trim().replace(/[^\d]/g, '');
            originalPrice = originalPrice ? parseInt(originalPrice, 10) : 0;
            salePrice = salePrice ? parseInt(salePrice, 10) : 0;

            const imageUrl = $(element).find('img.thumb').attr('src');
            const goodsCodeTmp = $(element).find('.inner > a').attr('href');
            const goodsCode = goodsCodeTmp.split('goodscode=')[1];

            // 상품 정보를 객체에 추가합니다.
            items.push({ title, salePercentage, originalPrice, salePrice, imageUrl, goodsCodeTmp, goodsCode });
        });
        // 새로 크롤링한 데이터와 이전 데이터를 비교
        const excludedItems = calculateDifference(items, previousItems);
        if (excludedItems.length > 0) {
            console.log('제외된 아이템 발생:', excludedItems);
            insertIntoItemHist(excludedItems);
        }
        // 현재 데이터를 이전 데이터로 저장
        previousItems = items;

        return items;
    } catch (error) {
        console.error(`Error fetching items: ${error}`);
        return [];
    }
}
function insertIntoItemHist(excludedItems) {
    excludedItems.forEach(item => {
        const query = 'INSERT INTO item_hist (itemdate, itemcode, title, percentage, originalprice, saleprice, imageurl,shop_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
        const values = [getKSTDate(), item.goodsCode, item.title, item.salePercentage, item.originalPrice, item.salePrice, item.imageUrl, 'gmarket'];

        connection.query(query, values, (insertError) => {
            if (insertError) throw insertError;
        });
    });
}
function saveToDatabase(items) {
    // 테이블 초기화
    connection.query('TRUNCATE TABLE realtime', (truncateError) => {
        if (truncateError) throw truncateError;

        // 각 아이템을 데이터베이스에 삽입
        items.forEach(item => {
            const query = 'INSERT INTO realtime (itemdate, itemcode, title, percentage, originalprice, saleprice, imageurl,shop_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
            const values = [getKSTDate(), item.goodsCode, item.title, item.salePercentage, item.originalPrice, item.salePrice, item.imageUrl, 'gmarket'];

            connection.query(query, values, (insertError) => {
                if (insertError) throw insertError;
            });
        });
        console.log("현재 : " + getKSTDate() + " 데이터 입력 성공");
    });
}

const url = 'https://www.gmarket.co.kr/n/superdeal';

// 5초마다 크롤링 실행
setInterval(() => {
    fetchItems(url)
        .then(items => saveToDatabase(items))
        .catch(error => console.error(error));
}, 60000);