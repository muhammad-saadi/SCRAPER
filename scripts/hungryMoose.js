const puppeteer = require('puppeteer-extra');
const fs = require('fs');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const restaurant = {
  name: "Hungry Moose Deli",
  pos_system: "Unknown",
  url: 'https://www.hungrymoose.com/deli-and-bakery-menus/deli',
  scrape_type: "nokogiri"
};

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(restaurant.url, { waitUntil: 'networkidle2' });

  await new Promise(resolve => setTimeout(resolve, 1000));

  const itemInfoSelectors = await extractItemInfoSelectors(page);

  console.log(`items: ${JSON.stringify(itemInfoSelectors, null, 2)}`);

  const filePath = `${restaurant.name.replace(/\s+/g, '_').toLowerCase()}_menu.json`;
  fs.writeFileSync(filePath, JSON.stringify(itemInfoSelectors, null, 2), 'utf-8');
  console.log(`Extracted and saved item info for ${restaurant.name} at ${filePath}`);

  await page.close();
  await browser.close();
  console.log(`All done, check the JSON files. ✨`);
})();

async function extractItemInfoSelectors (page) {
  return await page.$$eval('.content_filter', contents => {
    return contents.flatMap(content =>
      Array.from(content.querySelectorAll('.w-dyn-item')).map(item => ({
        name: item.querySelector('.blog19_title-wrapper-inner') ? item.querySelector('.blog19_title-wrapper-inner').innerText : '',
        price: item.querySelector('.blog19_category-wrapper') ? item.querySelector('.blog19_category-wrapper').innerText.replace(/\n/g, '').trim() : '',
        food_type: content.querySelector('.heading-large') ? content.querySelector('.heading-large').innerText : '',
        description: item.querySelector('.text-size-regular') ? item.querySelector('.text-size-regular').innerText : ''
      })),
    );
  });
};
