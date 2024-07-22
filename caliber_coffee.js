const puppeteer = require('puppeteer-extra');
const fs = require('fs');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const restaurant = { name: "Caliber Coffee", pos_system: "Unknown", url: 'https://www.calibercoffeeroasters.com/s/order?location=11ee75adff957dffb8aaac1f6bbbd01e#9', scrape_type: "nokogiri" };

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(restaurant.url, { waitUntil: 'networkidle2' });

  // Give some time for dynamic content to load
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Use page.evaluate to run the script in the page context
  const itemInfoSelectors = await page.evaluate(() => {
    const contents = document.querySelectorAll('.w-wrapper.order-grid');
    console.log(`content length ${contents.length}`);
    return Array.from(contents).flatMap(content => {
      const meal_type = content.parentElement.children[0].innerText;
      return Array.from(content.querySelectorAll('.grid__item')).map(item => ({
        name: item.querySelector('.item__title') ? item.querySelector('.item__title').innerText : '',
        price: item.querySelector('.product-price__wrapper') ? item.querySelector('.product-price__wrapper').innerText.trim() : '',
        meal_type: meal_type,
        description: item.querySelector('.item__description') ? item.querySelector('.item__description').innerText : '',
        anchorHref: item.querySelector('.hover__background.figure__hover.hover__background--fade')
      }));
    });
  });

  console.log(`items: ${itemInfoSelectors.length}`);
  
  if (itemInfoSelectors.length === 0) {
    console.error('No items found');
  } else {
    for (const item of itemInfoSelectors) {
      try {
        // Click the div to open the modal
        await page.evaluate((item) => {
          const div = item.anchorHref;
          if (div) div.click();
        }, item);

        await new Promise(resolve => setTimeout(resolve, 3000));

        // Wait for the modal to open
        await page.waitForSelector('.📚19-7-0Am6mM', { visible: true });

        // Extract information from the modal
        const modalData = await page.evaluate(() => {
          const modal = document.querySelector('.modal__content--scroll');
          return {
            title: modal.querySelector('.form-item').innerText,
            // details: modal.querySelector('.detailsClassSelector').innerText,
          };
        });

        console.log(`Modal data: ${JSON.stringify(modalData, null, 2)}`);

        // Close the modal
        await page.click('.modalCloseButtonSelector');
        await page.waitForTimeout(500); // Adjust the timeout as needed

      } catch (error) {
        console.log(`Error while processing item: ${error.message}`);
      }
    }
  }

  // const filePath = `${restaurant.name.replace(/\s+/g, '_').toLowerCase()}_test1.json`;
  // fs.writeFileSync(filePath, JSON.stringify(itemInfoSelectors, null, 2), 'utf-8');
  // console.log(`Extracted and saved item info for ${restaurant.name} at ${filePath}`);

  await page.close();
  await browser.close();
  console.log(`All done, check the JSON files. ✨`);
})();
