const puppeteer = require('puppeteer-extra');
const fs = require('fs');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const restaurants = [
  // { name: "Blue Moon Bakery", url: 'https://www.toasttab.com/local/order/bluemoonbigsky/r-1ae2c635-46b7-4ff2-854d-9e723f8846fa' },
  { name: "Tips Up", pos_system: "Toast", url: 'https://www.toasttab.com/local/order/tips-up-new-urgo-account-vsiyx/r-51c22831-c086-4beb-b616-6d387a942017', scrape_type: "api" },
  { name: "Block 3 Kitchen & Bar", pos_system: "Toast", url: 'https://www.toasttab.com/local/order/block-3-previously-copper-big-sky-glacu/r-22ee532a-2bbb-4fee-bcee-03a872868343', scrape_type: "api" },
  { name: "Thai Basil", pos_system: "Toast", url: 'https://www.toasttab.com/local/order/thai-basil-112-falls-rd/r-23725986-a1d5-4ad6-bc5d-dc5d8fe033da', scrape_type: "api" },
  { name: "Niseko", pos_system: "Toast", url: 'https://www.toasttab.com/local/order/niseko-ramen/r-cd3a193d-ca17-4cee-ab64-6cf9bf5d7fbd', scrape_type: "url_visit" },
 
  // Add other restaurant URLs as needed
];

async function scrape() {
  const browser = await puppeteer.launch({ headless: false });
  console.log('Running tests..');

  for (const restaurant of restaurants) {
    const page = await browser.newPage();
    await page.goto(restaurant.url, { waitUntil: 'networkidle2' });
    const itemInfoSelectors = await page.$$eval('.paddedContent', contents => {
      return contents.flatMap(content => {
        const mealType = content.querySelector('.header') ? content.querySelector('.header').innerText : '';
        const items = content.querySelectorAll('.item');
        return Array.from(items).map(item => ({
          anchorHref: item.querySelector('a') ? item.querySelector('a').getAttribute('href') : '',
          itemInfoText: item.querySelector('.itemHeader') ? item.querySelector('.itemHeader').innerText : '',
          itemPrice: item.querySelector('.priceAvailability') ? item.querySelector('.priceAvailability').innerText : '',
          meal_type: mealType
        }));
      });
    });

    // Get all item elements
    // const itemInfoSelectors = await page.$$eval('.item', items => {
    //   return items.map(item => ({
    //     anchorHref: item.querySelector('a').getAttribute('href'),
    //     itemInfoText: item.querySelector('.itemHeader').innerText,
    //     itemPrice: item.querySelector('.priceAvailability').innerText,
    //     meal_type: item.querySelector('.headerWrapper').innerText
    //   }));
    // });

    const extractedData = [];

    for (const { anchorHref, itemInfoText, itemPrice, meal_type } of itemInfoSelectors) {
      try {
        console.log(`Clicking on ${restaurant.url + anchorHref}`);
        console.log(`meal type: ${meal_type}`);
        await page.evaluate((href) => {
          const link = document.querySelector(`a[href="${href}"]`);
          if (link) link.click();
        }, anchorHref);

        // Wait for the modal to appear
        await page.waitForSelector('.PORTAL .modal .modalWrapper .modalContent .itemModalContainer .itemModal .content .paddedContent', { visible: true, timeout: 10000 });

        // Wait for 3 seconds to keep the modal open
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Get modal content within the portal
        const modifersss = await page.$eval('.modifierGroups', content => content.innerText.trim());
        console.log(`modifiers text ${modifersss}`);
        if (modifersss){
          const modalText = await page.$$eval('.modifierGroup', groups => {
            return groups.map(group => ({
              title: group.querySelector('.title').innerText,
              modifiers: Array.from(group.querySelectorAll('.row')).map(row => ({
                modifier: row.querySelector('.modifierText') ? row.querySelector('.modifierText').innerText : '',
                price: row.querySelector('.price') ? row.querySelector('.price').innerText : ""
              }))
            }));
          });
          console.log(`Modal text: ${modalText}`);
  
          extractedData.push({
            itemInfo: itemInfoText,
            meal_type: meal_type,
            priice: itemPrice,
            modalContent: modalText
          });
        }else{
          extractedData.push({
            itemInfo: itemInfoText,
            meal_type: meal_type,
            priice: itemPrice,
            modalContent: ""
          });
        }

        // Close the modal (assuming there's a close button within the modal)
        await page.evaluate(() => {
          const closeButton = document.querySelector('.PORTAL .itemModalCloseButton');
          if (closeButton) closeButton.click();
        });
        await page.waitForSelector('.PORTAL .modal', { hidden: true });
      } catch (error) {
        console.log(`Error while processing item with href ${anchorHref}: ${error.message}`);
      }
    }

    // Save extracted data to a file
    const filePath = `${restaurant.name.replace(/\s+/g, '_').toLowerCase()}_test6.json`;
    fs.writeFileSync(filePath, JSON.stringify(extractedData, null, 2), 'utf-8');
    console.log(`Extracted and saved item info for ${restaurant.name} at ${filePath}`);

    await page.close();
  }

  await browser.close();
  console.log(`All done, check the JSON files. ✨`);
}

module.exports = { scrape };
