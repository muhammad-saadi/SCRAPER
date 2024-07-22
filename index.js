const puppeteer = require('puppeteer-extra');
const fs = require('fs');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const restaurants = [
  { name: "Blue Moon Bakery", url: 'https://www.toasttab.com/local/order/bluemoonbigsky/r-1ae2c635-46b7-4ff2-854d-9e723f8846fa' },
  // Add other restaurant URLs as needed
];

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  console.log('Running tests..');

  for (const restaurant of restaurants) {
    const page = await browser.newPage();
    await page.goto(restaurant.url, { waitUntil: 'networkidle2' });

    // Get all item elements
    const itemInfoSelectors = await page.$$eval('.item', items => {
      return items.map(item => ({
        anchorHref: item.querySelector('a').getAttribute('href'),
        itemInfoText: item.querySelector('.itemInfo').innerText
      }));
    });

    const extractedData = [];

    for (const { anchorHref, itemInfoText } of itemInfoSelectors) {
      try {
        console.log(`Clicking on ${restaurant.url + anchorHref}`);
        await page.evaluate((href) => {
          const link = document.querySelector(`a[href="${href}"]`);
          if (link) link.click();
        }, anchorHref);

        // Wait for the modal to appear
        await page.waitForSelector('.PORTAL .modal .modalWrapper .modalContent .itemModalContainer .itemModal', { visible: true, timeout: 10000 });

        // Get modal content within the portal
        const modalText = await page.$eval('.itemModal', modal => modal.innerText.trim());
        console.log(`Modal text: ${modalText}`);

        extractedData.push({
          itemInfo: itemInfoText,
          modalContent: modalText
        });

        // Close the modal (assuming there's a close button within the modal)
        await page.evaluate(() => {
          const closeButton = document.querySelector('.PORTAL .itemModalCloseButton');
          if (closeButton) closeButton.click();
        });
        await page.waitForSelector('.PORTAL .modal', { hidden: true, timeout: 5000 });
      } catch (error) {
        console.log(`Error while processing item with href ${anchorHref}: ${error.message}`);
      }
    }

    // Save extracted data to a file
    const filePath = `${restaurant.name.replace(/\s+/g, '_').toLowerCase()}_test3.json`;
    fs.writeFileSync(filePath, JSON.stringify(extractedData, null, 2), 'utf-8');
    console.log(`Extracted and saved item info for ${restaurant.name} at ${filePath}`);

    await page.close();
  }

  await browser.close();
  console.log(`All done, check the JSON files. ✨`);
})();
