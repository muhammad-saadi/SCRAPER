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

    wrapShackSections.forEach(section => {
      const sectionName = section.children[0].innerText;

      const items = Array.from(section.querySelectorAll('.menu-item')).flatMap(item => {
        const itemName = item.children[0].innerText;
        let description = null;
        let price = null;

        if (item.children.length > 1) {
          description = item.children[1].innerText.includes('$') ? null : item.children[1].innerText;
          price = description ? item.children[2]?.innerText : item.children[1].innerText;
        }

        return {
          name: itemName,
          description: description,
          price: price,
          food_type: sectionName
        };
      });

      data.push(
        items
      );
    });

    return data;
  });

  console.log(`Menu Data: ${JSON.stringify(menuData, null, 2)}`);

  const filePath = `${restaurant.name.replace(/\s+/g, '_').toLowerCase()}_menu.json`;
  fs.writeFileSync(filePath, JSON.stringify(menuData.flat(), null, 2), 'utf-8');
  console.log(`Extracted and saved menu data for ${restaurant.name} at ${filePath}`);

  await browser.close();
})();
