export const FOOD_EXPIRY_ESTIMATES: Record<string, number> = {
  // Dairy products
  milk: 7,
  cheese: 14,
  yogurt: 10,
  butter: 30,
  cream: 7,
  sour_cream: 14,
  cottage_cheese: 7,
  ice_cream: 60,

  // Meat products
  beef: 3,
  pork: 3,
  chicken: 3,
  turkey: 3,
  lamb: 3,
  meat: 3,
  fish: 2,
  seafood: 2,
  bacon: 7,
  ham: 7,
  sausage: 7,

  // Produce
  apple: 14,
  banana: 7,
  orange: 14,
  tomato: 7,
  lettuce: 7,
  spinach: 7,
  carrot: 14,
  potato: 30,
  onion: 30,
  garlic: 30,
  fruits: 7,
  vegetables: 7,

  // Bakery
  bread: 7,
  bagel: 7,
  muffin: 7,
  cake: 7,
  cookie: 14,
  pastry: 7,
  croissant: 7,
  donut: 7,

  // Canned goods
  canned: 730, // 2 years
  soup: 730,
  beans: 730,
  tuna: 730,
  corn: 730,
  tomato_sauce: 730,

  // Frozen foods
  frozen: 180, // 6 months
  frozen_vegetables: 180,
  frozen_fruits: 180,
  frozen_meat: 180,
  frozen_fish: 180,
  frozen_pizza: 180,

  // Dry goods
  pasta: 365,
  rice: 365,
  flour: 180,
  sugar: 730,
  cereal: 180,
  oats: 180,
  nuts: 180,
  seeds: 180,

  // Beverages
  juice: 7,
  soda: 180,
  water: 365,
  coffee: 180,
  tea: 365,
  beer: 180,
  wine: 365,

  // Snacks
  chips: 90,
  crackers: 90,
  pretzels: 90,
  popcorn: 90,
  granola_bar: 90,
  candy: 180,
  chocolate: 180,

  // Condiments
  ketchup: 180,
  mustard: 180,
  mayonnaise: 90,
  salad_dressing: 90,
  hot_sauce: 365,
  soy_sauce: 365,

  // Default fallback
  default: 14,
}; 