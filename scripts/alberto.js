const puppeteer = require('puppeteer-extra');
const fs = require('fs');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const restaurant = { name: "Alberto's Mexican Restaurant", url: 'https://web.archive.org/web/20240229185602/http://www.albertosmexican.com/menu/#', scrape_type: "nokogiri" };

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(restaurant.url, { waitUntil: 'networkidle2' });

  await new Promise(resolve => setTimeout(resolve, 3000));

  const data = await page.evaluate(() => {
    const sections = document.querySelectorAll('.elementor-row');
    const extractedData = [];

    sections.forEach(section => {
      const columns = section.querySelectorAll('.elementor-widget-wrap');
      
      columns.forEach(column => {
        const items = column.children;
        let currentHeading = '';
        let currentItem = null;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];

          if (i % 2 === 0 && item.classList.contains('elementor-widget-heading')) {
            // Even index (0, 2, 4, ...) -> heading
            currentHeading = item.innerText.trim();
          } else if (i % 2 !== 0 && item.classList.contains('elementor-widget-text-editor')) {
            // Odd index (1, 3, 5, ...) -> text under heading
            const h3Tags = item.querySelectorAll('h3');
            const pTags = item.querySelectorAll('p');
            
            h3Tags.forEach((h3, index) => {
              const [name, price] = h3.innerText.split('$');
              currentItem = {
                heading: currentHeading,
                name: name.trim(),
                price: price ? price.trim() : '',
                description: ''
              };

              if (pTags[index]) {
                currentItem.description = pTags[index].innerText.trim();
              }
              extractedData.push(currentItem);
            });

            for (let j = h3Tags.length; j < pTags.length; j++) {
              if (currentItem) {
                currentItem.description += ' ' + pTags[j].innerText.trim();
              }
            }
          }
        }
      });
    });

    return extractedData;
  });
  if (data.length === 0) {
    console.error('No items found');
  } else {
    console.log(`items: ${JSON.stringify(data, null, 2)}`);
  }

  const filePath = `${restaurant.name.replace(/\s+/g, '_').toLowerCase()}_menu.json`;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`Extracted and saved menu info for ${restaurant.name} at ${filePath}`);

  await page.close();
  await browser.close();
  console.log(`All done, check the JSON file. ✨`);
})();
