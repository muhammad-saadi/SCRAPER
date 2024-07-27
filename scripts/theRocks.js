const puppeteer = require('puppeteer-extra');
const fs = require('fs');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const restaurant = { name: "The Rocks", pos_system: "None", url: 'https://postmates.com/store/the-rocks-tasting-room-and-liquor-store/nn6DK7ZXVC6mS4n2GkEvfg', scrape_type: "pdf_rip" };

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(restaurant.url, { waitUntil: 'networkidle2' });

  const itemInfoSelectors = await extractItemInfoSelectors(page);

  let extractedData = [];

  for (const { anchorHref, name, itemPrice, meal_type, description } of itemInfoSelectors) {
    try {
      console.log(`Clicking on ${anchorHref}`);
      await clickItemLink(page, anchorHref);

      await new Promise(resolve => setTimeout(resolve, 2000));

      const modifiers = await extractModalContent(page);

      extractedData.push({
        name: name,
        description: description,
        meal_type: meal_type,
        price: itemPrice,
        modifiers: modifiers
      });

      await closeModal(page);
    } catch (error) {
      console.log(`Error while processing item with href ${anchorHref}: ${error.message}`);
    }
  }

  const filePath = `${restaurant.name.replace(/\s+/g, '_').toLowerCase()}_menu.json`;
  fs.writeFileSync(filePath, JSON.stringify(extractedData, null, 2), 'utf-8');
  console.log(`Extracted and saved item info for ${restaurant.name} at ${filePath}`);

  await page.close();
  await browser.close();
  console.log(`All done, check the JSON files. ✨`);
})();

async function extractItemInfoSelectors(page) {
  return await page.$$eval('.md', contents => {
    return contents.flatMap(content => {
      const mealType = content.querySelector('.al').innerText;
      const items = content.querySelectorAll('.im.mr.ms.mt.ak.j5.f1.bm');
      return Array.from(items).map(item => ({
        anchorHref: item.querySelector('.al.ec.d8.dd.mu.mv.mw') ? item.querySelector('.al.ec.d8.dd.mu.mv.mw').getAttribute('href') : '',
        name: item.querySelector('.dl') ? item.querySelector('.dl').innerText : '',
        itemPrice: item.querySelector('.g2.fv.g3.be.bf.g4.bh.bi.b1') ? item.querySelector('.g2.fv.g3.be.bf.g4.bh.bi.b1').innerText : '',
        meal_type: mealType,
        description: item.querySelector('.ld.jl.jn.jm.bm.mz.n0') ? item.querySelector('.ld.jl.jn.jm.bm.mz.n0').innerText : '',
      }));
    });
  });
}

async function clickItemLink(page, href) {
  await page.evaluate((href) => {
    const link = document.querySelector(`a[href="${href}"]`);
    if (link) link.click();
  }, href);
}

async function extractModalContent(page) {
  await page.waitForSelector('div.ar.kw.l0.jr.as.at');
  return await page.evaluate(() => {
    const modal = document.querySelector('div [role="dialog"]').children[1].querySelector('.ld').children;
    if (modal.length > 1) {
      const items = modal[0].querySelector('[data-testid="customization-pick-many"]').children[1].querySelectorAll('label');
      return Array.from(items).map(item => ({
        name: item.querySelector('.be.bf.bg.bh.bi.g5.mz') ? item.querySelector('.be.bf.bg.bh.bi.g5.mz').innerText : '',
        price: item.querySelector('.be.bf.g4.bh.bi.g5.bo') ? item.querySelector('.be.bf.g4.bh.bi.g5.bo').innerText : ''
      }));
    } else {
      return null;
    }
  });
}

async function closeModal(page) {
  await page.evaluate(() => {
    const closeButton = document.querySelector('cw.aq.cj.cx.cy.cz.d0.d1.d2.d3.d4.d5.d6.d7.d8.d9.da.db.dc.dd.de.hm.dg.dh.di.dj.dk.be.dl.bg.dm.dn.do.dp.dq.dr.ds.dt.du.b1.b0.dx.dy.dz.e0');
    if (closeButton) closeButton.click();
  });
  await page.waitForSelector('.ar', { hidden: true });
}
