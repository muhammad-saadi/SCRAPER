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

const pizzaModifiers = () => {
  return [
  {
    name: "Pizza Toppings/Cheese",
    description: "Mozzarella, Fresh Mozz, Ricotta, Chevre, Feta",
    price: "$3",
  
  },
  {
    name: "Pizza Toppings/Meats",
    description: "Pepperoni, Fennel Sausage, Elk Sausage, Anchovies, Egg",
    price: "$3",
       
  },
  {
    name: "Pizza Toppings/Veggies",
    description: "Mushrooms, Pickled Red Onion, Sweet Onion, Raw Onion, Roasted Red Peppers, Pepperoncini, Jalapeno, Fresh Garlic, Roasted Garlic, Artichoke Hearts, Black Olives, Kalamata Olives, Fresh Tomato, Pineapple, Potato, Spinach, Arugula, Basil, Rosemary & Sage",
    price: "$3",
  
  },
  {
    name: "Premium Toppings",
    description: "Meatballs, Prosciutto, Pork Belly, Chicken, Wild Mushrooms",
    price: "$5"
  },
  {
    name: "Local Bread Available Upon Request",
    description: "Served with Balsamic Vinegar & Extra Virgin Olive Oil",
    price: "$4"
  }]
}

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(restaurant.url, { waitUntil: 'networkidle2' });

  await new Promise(resolve => setTimeout(resolve, 1000));

  const itemInfoSelectors = await scrapeData(page, pizzaModifiers());

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
const scrapeData = async (page, pizzaModifiers) => {
  return await page.evaluate((pizzaModifiers) => {
    const extractItemInfoSelectors = (section) => {
      let sectionTitle = section.querySelector('.menu-section-title') ? section.querySelector('.menu-section-title').innerText : '';
      return Array.from(section.querySelectorAll('.menu-item')).map(item => {
        const name = item.querySelector('.menu-item-title') ? item.querySelector('.menu-item-title').innerText : '';
        const description = item.querySelector('.menu-item-description') ? item.querySelector('.menu-item-description').innerText : '';
        const bottomPrice = item.querySelector('.menu-item-price-bottom') ? item.querySelector('.menu-item-price-bottom').innerText.trim() : '';
        let topPrice = item.querySelector('.menu-item-price-top') ? item.querySelector('.menu-item-price-top').innerText : '';
        let modifiers = [];
        let isPizzaSection = topPrice.split(',')[0].split('$')[1] >= 18
        if (sectionTitle === ''){
          if (isPizzaSection){
            sectionTitle = 'pizza';
          }
        }
        
        if (sectionTitle == "SALAD"){
          Array.from(item.querySelectorAll('.menu-item-option')).map(modifier => {
            const [name, price] = modifier.innerText.split('$');
            modifiers.push({
              name: name,
              price: price
            })
          })
        }

        return {
          food_type: sectionTitle,
          name: name,
          description: description,
          price: sectionTitle === 'pizza' & isPizzaSection ? topPrice.split(',')[0] : topPrice,
          modifiers: sectionTitle === 'pizza' & isPizzaSection ? pizzaModifiers : modifiers
        };
      });
    };

    const sections = document.querySelectorAll('.menu-section');
    return Array.from(sections).flatMap(section => extractItemInfoSelectors(section));
  }, pizzaModifiers);
};

// Function to save data to a JSON file
const saveData = (data, filePath) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`Extracted and saved item info at ${filePath}`);
};
