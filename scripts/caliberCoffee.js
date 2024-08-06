const puppeteer = require('puppeteer-extra');
const fs = require('fs');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { title } = require('process');

puppeteer.use(StealthPlugin());

const restaurant = { name: "Caliber Coffee", pos_system: "Unknown", url: 'https://www.calibercoffeeroasters.com/s/order?location=11ee75adff957dffb8aaac1f6bbbd01e#9', scrape_type: "nokogiri" };

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(restaurant.url, { waitUntil: 'networkidle2' });

  await new Promise(resolve => setTimeout(resolve, 10000));

  const itemInfoSelectors = await extractItemInfoSelectors(page);

  console.log(`items: ${JSON.stringify(itemInfoSelectors, null, 2)}`);

  let extractedData = [];
  
  if (itemInfoSelectors.length === 0) {
    console.error('No items found');
  } else {
    for (const { anchorHref, name, price, food_type, description } of itemInfoSelectors) {
      try {
        await page.evaluate((href) => {
          const image = document.querySelector(`img[src="${href}"]`)
          const div = image ? image.parentElement : document.querySelector(`use[xlink:href="${href}"]`).parentElement;
          if (div) div.click();
        }, anchorHref);

        const modalData = await extractModalData(page, name);

        extractedData.push({
          name: name,
          food_type: food_type,
          price: price.split('-')[0],
          description: description,
          modifiers: modalData.length > 0 && modalData[0].name === "Select one" ? modalData.slice(1) : modalData
        });

        console.log(`Modal data: ${JSON.stringify(modalData, null, 2)}`);

        await page.evaluate(() => {
          const closeButton = document.querySelector('.📚19-7-0Am6mM .📚19-7-0smfDa');
          if (closeButton) closeButton.click();
        });
        await page.waitForSelector('.📚19-7-0Am6mM', { hidden: true });

      } catch (error) {
        console.log(`Error while processing item: ${error.message}`);
      }
    }
  }

  const filePath = `${restaurant.name.replace(/\s+/g, '_').toLowerCase()}_menu1.json`;
  fs.writeFileSync(filePath, JSON.stringify(extractedData, null, 2), 'utf-8');
  console.log(`Extracted and saved item info for ${restaurant.name} at ${filePath}`);

  await page.close();
  await browser.close();
  console.log(`All done, check the JSON files. ✨`);
})();

async function extractItemInfoSelectors(page) {
  return await page.evaluate(() => {
    const contents = document.querySelectorAll('.w-wrapper.order-grid');
    return Array.from(contents).flatMap(content => {
      const food_type = content.parentElement.children[0].innerText;
      return Array.from(content.querySelectorAll('.grid__item')).map(item => ({
        name: item.querySelector('.item__title') ? item.querySelector('.item__title').innerText : '',
        price: item.querySelector('.product-price__wrapper') ? item.querySelector('.product-price__wrapper').innerText.trim() : '',
        food_type: food_type,
        description: item.querySelector('.item__description') ? item.querySelector('.item__description').innerText : '',
        anchorHref: item.querySelector('img') ? item.querySelector('img').src : item.querySelector('use').href.animVal
      }));
    });
  });
}

async function extractModalData(page, name) {
  await new Promise(resolve => setTimeout(resolve, 1000));
  if (name === "Espresso" || name === "Assorted Baked Goods"){
    return {}
  } else {
    await page.waitForSelector('.modal__content--scroll', { visible: true });
    await new Promise(resolve => setTimeout(resolve, 3000));

    return await page.$eval('.modal__content--scroll', modal => {
      return Array.from(modal.querySelectorAll('.form-item')).flatMap(itemGroup => {
        const modifierType = itemGroup.querySelector('.form-label').innerText;

        if(itemGroup.querySelector('select')) {
          return Array.from(itemGroup.querySelectorAll('option')).map(item => {
            return {
              name: item.innerText.trim(),
              price: '',
              title: modifierType
            };
          });
        } else if (itemGroup.querySelector('.modifier-content')) {
          return Array.from(itemGroup.querySelectorAll('.modifier-content .Control')).map(item => {
            return {
              name: item.querySelector('label p span').innerText,
              price: item.querySelector('p.Sublabel') ? item.querySelector('p.Sublabel').innerText : '',
              title: modifierType
            };
          });
        } else if(modifierType === "Customers also purchased"){
          return {}
        } else {
          return Array.from(itemGroup.querySelectorAll('.RelatedProductsComponents_ProductRow_ControlListRow--eNJk5')).map(item => {
            return { 
              name: item.querySelector('label').innerText,
              price: item.querySelector('p').innerText,
              title: modifierType
            };
          });
        }
      });
    });
  }
}
