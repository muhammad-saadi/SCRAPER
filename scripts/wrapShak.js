const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const restaurant = { name: "Wrap Shack", pos_system: "Unknown", url: 'https://www.werollemfat.com/' };
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(restaurant.url, { waitUntil: 'networkidle2' });

  await new Promise(resolve => setTimeout(resolve, 5000));

  const menuData = await page.evaluate(() => {
    const wrapShackSections = document.querySelectorAll('.menu-section');
    const data = [];
    let lastSectionItems = [];

    wrapShackSections.forEach(section => {
      const sectionName = section.children[0]?.innerText;

      if (sectionName === "TOPPINGS FOR YOUR MEAL") {
        // Add the current section's items as modifiers to the last section's items
        const modifiers = Array.from(section.querySelectorAll('.menu-item')).map(item => {
          const itemName = item.querySelector('.menu-item-name')?.innerText || '';
          let itemPrice = item.childNodes[1]?.data || '';
          if(itemPrice.includes('big')){
            itemPrice = itemPrice.match(/\$\d+\.\d+/g)[0]
          }
          return {
            name: itemName,
            price: itemPrice,
            title: sectionName
          };
        });

        lastSectionItems.forEach(item => {
          item.modifiers = modifiers;
        });

        return; // Skip processing this section as items
      }

      const items = Array.from(section.querySelectorAll('.menu-item')).map(item => {
        const itemName = item.querySelector('.menu-item-name')?.innerText || '';
        let description = '';
        let price = '';

        if (item.childNodes.length > 1) {
          description = item.childNodes[1]?.data.includes('$') ? null : item.childNodes[1]?.data;
          price = description ? item.childNodes[2]?.data : item.childNodes[1]?.data;
        }

        if(price?.includes('Big')){
          price = price.match(/\$\d+\.\d+/g)[0]
        }

        return {
          name: itemName,
          description: description,
          price: price,
          food_type: sectionName,
          modifiers: []
        };
      });

      data.push(...items);
      lastSectionItems = items; // Update lastSectionItems for future sections
    });

    return data;
  });

  console.log(`Menu Data: ${JSON.stringify(menuData, null, 2)}`);

  const filePath = `${restaurant.name.replace(/\s+/g, '_').toLowerCase()}_menu1.json`;
  fs.writeFileSync(filePath, JSON.stringify(menuData, null, 2), 'utf-8');
  console.log(`Extracted and saved menu data for ${restaurant.name} at ${filePath}`);

  await browser.close();
})();
