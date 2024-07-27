const puppeteer = require('puppeteer-extra');
const fs = require('fs');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const restaurant = { 
  name: "Ousel & Spur Pizza Co", 
  pos_system: "Spot-On", 
  url: 'https://www.ouselandspurpizza.com/#dinner-section', 
  scrape_type: "nokogiri" 
};

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(restaurant.url, { waitUntil: 'networkidle2' });

  await new Promise(resolve => setTimeout(resolve, 1000));

  const itemInfoSelectors = await scrapeData(page);

  if (itemInfoSelectors.length === 0) {
    console.error('No items found');
  } else {
    console.log(`items: ${JSON.stringify(itemInfoSelectors, null, 2)}`);
  }

  const filePath = `${restaurant.name.replace(/\s+/g, '_').toLowerCase()}_menu.json`;
  saveData(itemInfoSelectors, filePath);

  await page.close();
  await browser.close();
  console.log(`All done, check the JSON files. ✨`);
})();

// Function to scrape data from the page
const scrapeData = async (page) => {
  return await page.evaluate(() => {
    const extractItemInfoSelectors = (section) => {
      const sectionTitle = section.querySelector('.menu-section-title') ? section.querySelector('.menu-section-title').innerText : '';
      return Array.from(section.querySelectorAll('.menu-item')).map(item => {
        const name = item.querySelector('.menu-item-title') ? item.querySelector('.menu-item-title').innerText : '';
        const description = item.querySelector('.menu-item-description') ? item.querySelector('.menu-item-description').innerText : '';
        const bottomPrice = item.querySelector('.menu-item-price-bottom') ? item.querySelector('.menu-item-price-bottom').innerText.trim() : '';
        const topPrice = item.querySelector('.menu-item-price-top') ? item.querySelector('.menu-item-price-top').innerText : '';

        return {
          meal_type: sectionTitle,
          name: name,
          description: description,
          bottomPrice: bottomPrice,
          topPrice: topPrice
        };
      });
    };

    const sections = document.querySelectorAll('.menu-section');
    return Array.from(sections).flatMap(section => extractItemInfoSelectors(section));
  });
};

// Function to save data to a JSON file
const saveData = (data, filePath) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`Extracted and saved item info at ${filePath}`);
};
