const puppeteer = require('puppeteer-extra');
const fs = require('fs');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const restaurant = {
  name: "Pinky G’s",
  pos_system: "Clover",
  url: 'https://order.tapmango.com/merchant/4a9cba05-41b8-4998-8854-61ca36ed39ae/order/catalog',
  scrape_type: "api"
};

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  const context = browser.defaultBrowserContext();
  await context.overridePermissions('https://order.tapmango.com', ['geolocation']);

  // Set custom geolocation
  await page.setGeolocation({ latitude: 37.7749, longitude: -122.4194 }); // San Francisco coordinates

  await page.goto('https://order.tapmango.com/merchant/4a9cba05-41b8-4998-8854-61ca36ed39ae/order/location', { waitUntil: 'networkidle2' });

  await new Promise(resolve => setTimeout(resolve, 5000));

  await page.waitForSelector('.location_content_div .card_box');
  await page.$$eval('.card_box', locations => {
    locations[1].click();
  });

  await new Promise(resolve => setTimeout(resolve, 5000));

  const itemInfoSelectors = await extractItemsInfo(page);

  let extractedData = [];

  for (const { name, price, meal_type } of itemInfoSelectors) {
    try {
      await extractItemInfoSelectors(page, name, meal_type, price, extractedData);
    } catch (error) {
      console.log(`Error while processing item ${name}: ${error.message}`);
    }
  }

  await saveData(extractedData, restaurant.name);
  await page.close();
  await browser.close();
  console.log(`All done, check the JSON files. ✨`);
})();

async function extractItemsInfo(page) {
  return await page.$$eval('#section-1 div[_ngcontent-c6][id]', contents => {
    return contents.flatMap(content => {
      const meal_type = content.querySelector('.all-cat-header').innerText;
      return Array.from(content.children[1].querySelectorAll('div[_ngcontent-c6]')).map(item => ({
        name: item.querySelector('h3') ? item.querySelector('h3').innerText : '',
        price: item.querySelector('strong') ? item.querySelector('strong').innerText.trim() : '',
        meal_type: meal_type
      }));
    });
  });
}

async function extractItemInfoSelectors(page, name, meal_type, price, extractedData) {
  console.log(`Clicking on item: ${name}`);
  await page.evaluate((itemName) => {
    const itemDiv = Array.from(document.querySelectorAll('div h3')).find(h3 => h3.innerText === itemName)?.closest('div');
    if (itemDiv) {
      itemDiv.querySelector('a').click();
    } else {
      console.log(`Item not found with name: ${itemName}`);
    }
  }, name);

  await new Promise(resolve => setTimeout(resolve, 2000));
  await page.waitForSelector('app-item.ion-page');

  // Extract modal content
  const modifiers = await page.evaluate(() => {
    const modifier_groups = document.querySelectorAll('.accordion');
    if (modifier_groups.length > 0) {
      return Array.from(modifier_groups).flatMap(modifier_group => {
        const items = modifier_group.querySelectorAll('ion-label');
        const modifier_meal_type = modifier_group.querySelector('.accordion-title').innerText;
        return Array.from(items).map(item => ({
          name: item.querySelector('.name') ? item.querySelector('.name').innerText : '',
          price: item.querySelector('.price') ? item.querySelector('.price').innerText : '',
          meal_type: modifier_meal_type
        }));
      });
    } else {
      return null;
    }
  });

  console.log(`Modal content: ${JSON.stringify(modifiers, null, 2)}`);

  extractedData.push({
    name: name,
    meal_type: meal_type,
    price: price,
    modifiers: modifiers
  });

  await page.evaluate(() => {
    const closeButton = document.querySelector('app-item.ion-page #backMenuButton');
    if (closeButton) closeButton.click();
  });
  await page.waitForSelector('app-item.ion-page', { hidden: true });
}

async function saveData(data, restaurantName) {
  const filePath = `${restaurantName.replace(/\s+/g, '_').toLowerCase()}_menu.json`;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`Extracted and saved item info for ${restaurantName} at ${filePath}`);
}
