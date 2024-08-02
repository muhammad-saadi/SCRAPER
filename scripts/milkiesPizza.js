const puppeteer = require('puppeteer-extra');
const fs = require('fs');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const restaurant = { name: "Milkies Pizza & Pub", pos_system: "None", url: 'https://www.milkiespizzabigsky.com/menu', scrape_type: "nokogiri" };

(async () => {
  const browser = await puppeteer.launch({ headless: false }); // Set to false for debugging
  const page = await browser.newPage();
  await page.goto(restaurant.url, { waitUntil: 'networkidle2' });

  // Give some time for dynamic content to load
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Get the iframe element
  const iframeElement = await page.$('iframe');
  if (!iframeElement) {
    console.error('Iframe not found');
    await browser.close();
    return;
  }

  // Get the iframe's content frame
  const frame = await iframeElement.contentFrame();

  // Check if main content is loaded inside the iframe
  const mainContentExists = await frame.$('li.classicYlF2o');
  if (!mainContentExists) {
    console.error('Main content not found inside iframe');
    await browser.close();
    return;
  }

  // Use frame.evaluate to run the script in the iframe context
  const itemInfoSelectors = await extractItemInfoSelectors(frame);

  if (itemInfoSelectors.length === 0) {
    console.error('No items found');
  } else {
    console.log(`items: ${JSON.stringify(itemInfoSelectors, null, 2)}`);
  }

  const filePath = `${restaurant.name.replace(/\s+/g, '_').toLowerCase()}_menu.json`;
  fs.writeFileSync(filePath, JSON.stringify(itemInfoSelectors, null, 2), 'utf-8');
  console.log(`Extracted and saved item info for ${restaurant.name} at ${filePath}`);

  await page.close();
  await browser.close();
  console.log(`All done, check the JSON files. ✨`);
})();

async function extractItemInfoSelectors(frame) {
  return await frame.evaluate(() => {
    const contents = document.querySelectorAll('li.classicYlF2o');
    console.log(`Found ${contents.length} contents`);

    return Array.from(contents).flatMap(content => {
      const items = content.querySelectorAll('.classic10lTw');
      console.log(`Found ${items.length} items in content`);
      return Array.from(items).map(item => ({
        name: item.querySelector('.classic1PykL') ? item.querySelector('.classic1PykL').innerText : 'Name not found',
        price: item.querySelector('.classic2Vkl6') ? item.querySelector('.classic2Vkl6').innerText.trim() : 'Price not found',
        food_type: content.querySelector('.classic1G-zy') ? content.querySelector('.classic1G-zy').innerText : 'Meal type not found',
        description: item.querySelector('.classicBtE0-') ? item.querySelector('.classicBtE0-').innerText : 'Description not found'
      }));
    });
  });
}
