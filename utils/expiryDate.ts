import { FOOD_EXPIRY_ESTIMATES } from '../constants/expiryEstimates';

interface ProductInfo {
  product_name: string;
  brands?: string;
  categories_tags?: string[];
  image_url?: string;
  nutritionInfo?: any;
  ingredients?: string[];
  expiration_date?: string;
  best_before_date?: string;
  use_by_date?: string;
}

export const getExpiryDate = (productInfo: ProductInfo): Date => {
  // Layer 1: Check for explicit expiry dates in the product info
  if (productInfo.expiration_date) {
    return new Date(productInfo.expiration_date);
  }
  if (productInfo.best_before_date) {
    return new Date(productInfo.best_before_date);
  }
  if (productInfo.use_by_date) {
    return new Date(productInfo.use_by_date);
  }

  // Layer 2: Check for expiry date in product name or brand
  const nameAndBrand = `${productInfo.product_name} ${productInfo.brands || ''}`.toLowerCase();
  
  // Look for common date patterns in the name/brand
  const datePatterns = [
    /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/, // MM/DD/YYYY or DD/MM/YYYY
    /(\d{1,2})-(\d{1,2})-(\d{2,4})/,  // MM-DD-YYYY or DD-MM-YYYY
    /exp(?:iry|ires)?\s*(?:date|on)?\s*:?\s*(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/i,
    /best\s*before\s*:?\s*(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/i,
    /use\s*by\s*:?\s*(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/i,
  ];

  for (const pattern of datePatterns) {
    const match = nameAndBrand.match(pattern);
    if (match) {
      const [_, month, day, year] = match;
      const fullYear = year.length === 2 ? `20${year}` : year;
      return new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    }
  }

  // Layer 3: Check for expiry-related keywords and extract numbers
  const expiryKeywords = [
    { pattern: /exp(?:iry|ires)?\s*(?:in|after)?\s*(\d+)\s*(?:days|day)/i, multiplier: 1 },
    { pattern: /exp(?:iry|ires)?\s*(?:in|after)?\s*(\d+)\s*(?:weeks|week)/i, multiplier: 7 },
    { pattern: /exp(?:iry|ires)?\s*(?:in|after)?\s*(\d+)\s*(?:months|month)/i, multiplier: 30 },
  ];

  for (const { pattern, multiplier } of expiryKeywords) {
    const match = nameAndBrand.match(pattern);
    if (match) {
      const days = parseInt(match[1]) * multiplier;
      const date = new Date();
      date.setDate(date.getDate() + days);
      return date;
    }
  }

  // Layer 4: Use category-based estimation
  if (productInfo.categories_tags && productInfo.categories_tags.length > 0) {
    const category = productInfo.categories_tags[0].toLowerCase();
    const matchedCategory = Object.keys(FOOD_EXPIRY_ESTIMATES).find(key => 
      category.includes(key)
    ) || 'default';
    
    const days = FOOD_EXPIRY_ESTIMATES[matchedCategory];
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  // Layer 5: Use product name-based estimation
  const nameLower = productInfo.product_name.toLowerCase();
  const matchedCategory = Object.keys(FOOD_EXPIRY_ESTIMATES).find(key => 
    nameLower.includes(key)
  ) || 'default';
  
  const days = FOOD_EXPIRY_ESTIMATES[matchedCategory];
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}; 