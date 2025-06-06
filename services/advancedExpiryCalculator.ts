interface ExpiryResult {
  expiryDate: string;
  confidence: number;
  method: string;
  category: string;
  shelfLifeDays: number;
}

interface ProductData {
  name: string;
  brand?: string;
  category?: string;
  shelfLife?: number;
  packaging?: string;
}

// Method 1: Product Database Lookup
class ProductDatabaseLookup {
  static async calculate(itemName: string): Promise<ExpiryResult | null> {
    try {
      // Try OpenFoodFacts API first
      const searchUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(itemName)}&search_simple=1&action=process&json=1`;
      const response = await fetch(searchUrl);
      const data = await response.json();
      
      if (data.products && data.products.length > 0) {
        const product = data.products[0];
        
        // Extract shelf life from product data
        let shelfLife = this.extractShelfLifeFromProduct(product);
        if (!shelfLife) {
          shelfLife = this.inferFromCategory(product.categories_tags);
        }
        
        if (shelfLife) {
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + shelfLife);
          
          return {
            expiryDate: expiryDate.toISOString().split('T')[0],
            confidence: 0.9,
            method: 'Product Database',
            category: product.categories_tags?.[0] || 'unknown',
            shelfLifeDays: shelfLife
          };
        }
      }
    } catch (error) {
      console.log('Product database lookup failed:', error);
    }
    return null;
  }

  private static extractShelfLifeFromProduct(product: any): number | null {
    // Look for expiry-related fields
    const expiryFields = ['expiration_date', 'best_before_date', 'use_by_date'];
    for (const field of expiryFields) {
      if (product[field]) {
        const days = Math.ceil((new Date(product[field]).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        if (days > 0) return days;
      }
    }
    return null;
  }

  private static inferFromCategory(categories: string[]): number | null {
    if (!categories) return null;
    
    const categoryMap: Record<string, number> = {
      'dairy': 7,
      'meat': 3,
      'fish': 2,
      'vegetables': 7,
      'fruits': 7,
      'bread': 5,
      'canned': 730,
      'frozen': 180
    };
    
    for (const category of categories) {
      for (const [key, days] of Object.entries(categoryMap)) {
        if (category.toLowerCase().includes(key)) {
          return days;
        }
      }
    }
    return null;
  }
}

// Method 2: Advanced Keyword Analysis
class AdvancedKeywordAnalysis {
  private static readonly ADVANCED_PATTERNS = {
    // Dairy products with specific variations
    dairy: {
      patterns: [
        /\b(milk|whole milk|skim milk|2% milk|almond milk|oat milk|soy milk)\b/i,
        /\b(cheese|cheddar|mozzarella|parmesan|gouda|brie|feta)\b/i,
        /\b(yogurt|greek yogurt|plain yogurt|vanilla yogurt)\b/i,
        /\b(butter|margarine|cream|heavy cream|sour cream)\b/i,
        /\b(cottage cheese|ricotta|cream cheese)\b/i
      ],
      shelfLife: { min: 5, max: 14, default: 7 }
    },
    
    // Meat products with packaging considerations
    meat: {
      patterns: [
        /\b(chicken|turkey|duck|poultry)\b/i,
        /\b(beef|steak|ground beef|hamburger|roast)\b/i,
        /\b(pork|bacon|ham|sausage|pepperoni)\b/i,
        /\b(fish|salmon|tuna|cod|tilapia|shrimp|lobster)\b/i,
        /\b(deli meat|lunch meat|cold cuts)\b/i
      ],
      shelfLife: { min: 1, max: 10, default: 3 }
    },
    
    // Fresh produce with specific items
    produce: {
      patterns: [
        /\b(apple|banana|orange|grape|berry|strawberry|blueberry)\b/i,
        /\b(lettuce|spinach|kale|arugula|cabbage|broccoli)\b/i,
        /\b(tomato|cucumber|carrot|onion|garlic|potato)\b/i,
        /\b(avocado|lemon|lime|grapefruit)\b/i
      ],
      shelfLife: { min: 3, max: 21, default: 7 }
    },
    
    // Packaged goods
    packaged: {
      patterns: [
        /\b(cereal|granola|oats|crackers|chips|cookies)\b/i,
        /\b(pasta|rice|quinoa|bread|bagel|muffin)\b/i,
        /\b(canned|jarred|bottled|packaged|sealed)\b/i
      ],
      shelfLife: { min: 30, max: 730, default: 180 }
    }
  };

  static async calculate(itemName: string): Promise<ExpiryResult | null> {
    const nameLower = itemName.toLowerCase();
    
    // Check for packaging indicators that affect shelf life
    const packagingMultipliers = this.getPackagingMultipliers(nameLower);
    
    for (const [category, data] of Object.entries(this.ADVANCED_PATTERNS)) {
      for (const pattern of data.patterns) {
        if (pattern.test(nameLower)) {
          let shelfLife = data.shelfLife.default;
          
          // Apply packaging multipliers
          shelfLife *= packagingMultipliers.total;
          
          // Apply specific item adjustments
          shelfLife = this.applySpecificItemAdjustments(nameLower, shelfLife);
          
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + Math.round(shelfLife));
          
          return {
            expiryDate: expiryDate.toISOString().split('T')[0],
            confidence: 0.8,
            method: 'Advanced Keyword Analysis',
            category,
            shelfLifeDays: Math.round(shelfLife)
          };
        }
      }
    }
    
    return null;
  }

  private static getPackagingMultipliers(itemName: string): { total: number; factors: string[] } {
    const factors: string[] = [];
    let multiplier = 1.0;
    
    // Packaging type indicators
    if (/\b(frozen|freeze)\b/i.test(itemName)) {
      multiplier *= 6.0;
      factors.push('frozen');
    }
    if (/\b(canned|can)\b/i.test(itemName)) {
      multiplier *= 20.0;
      factors.push('canned');
    }
    if (/\b(vacuum|sealed|pack)\b/i.test(itemName)) {
      multiplier *= 2.0;
      factors.push('vacuum-sealed');
    }
    if (/\b(dried|dehydrated)\b/i.test(itemName)) {
      multiplier *= 15.0;
      factors.push('dried');
    }
    if (/\b(organic|natural)\b/i.test(itemName)) {
      multiplier *= 0.8;
      factors.push('organic');
    }
    
    return { total: multiplier, factors };
  }

  private static applySpecificItemAdjustments(itemName: string, baseShelfLife: number): number {
    const adjustments: Record<string, number> = {
      // Specific items with known shorter/longer shelf lives
      'milk': 7,
      'ground beef': 2,
      'chicken breast': 3,
      'salmon': 2,
      'lettuce': 5,
      'spinach': 4,
      'banana': 5,
      'apple': 14,
      'potato': 30,
      'onion': 30,
      'bread': 5,
      'bagel': 7
    };
    
    for (const [item, days] of Object.entries(adjustments)) {
      if (itemName.includes(item)) {
        return days;
      }
    }
    
    return baseShelfLife;
  }
}

// Method 3: Brand-Specific Data Analysis
class BrandSpecificAnalysis {
  private static readonly BRAND_DATA = {
    // Dairy brands
    'horizon': { multiplier: 1.5, note: 'Ultra-pasteurized' },
    'organic valley': { multiplier: 0.8, note: 'Organic, fewer preservatives' },
    'silk': { multiplier: 1.2, note: 'Plant-based, shelf-stable' },
    
    // Meat brands
    'tyson': { multiplier: 1.1, note: 'Better packaging' },
    'perdue': { multiplier: 1.1, note: 'Premium processing' },
    'foster farms': { multiplier: 1.0, note: 'Standard processing' },
    
    // Produce brands
    'dole': { multiplier: 1.1, note: 'Better supply chain' },
    'organic girl': { multiplier: 0.9, note: 'Organic, shorter shelf life' },
    
    // Packaged goods
    'pepperidge farm': { multiplier: 1.2, note: 'Better preservatives' },
    'wonder bread': { multiplier: 0.9, note: 'Mass production' },
    'kelloggs': { multiplier: 1.3, note: 'Cereal, long shelf life' }
  };

  static async calculate(itemName: string): Promise<ExpiryResult | null> {
    const nameLower = itemName.toLowerCase();
    
    for (const [brand, data] of Object.entries(this.BRAND_DATA)) {
      if (nameLower.includes(brand)) {
        // Get base category shelf life
        const baseShelfLife = this.getBaseCategoryShelfLife(nameLower);
        if (baseShelfLife) {
          const adjustedShelfLife = Math.round(baseShelfLife * data.multiplier);
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + adjustedShelfLife);
          
          return {
            expiryDate: expiryDate.toISOString().split('T')[0],
            confidence: 0.85,
            method: `Brand-Specific (${brand})`,
            category: this.inferCategory(nameLower),
            shelfLifeDays: adjustedShelfLife
          };
        }
      }
    }
    
    return null;
  }

  private static getBaseCategoryShelfLife(itemName: string): number | null {
    const categories = [
      { keywords: ['milk', 'cheese', 'yogurt', 'butter'], shelfLife: 7 },
      { keywords: ['chicken', 'beef', 'pork', 'fish'], shelfLife: 3 },
      { keywords: ['apple', 'banana', 'lettuce', 'tomato'], shelfLife: 7 },
      { keywords: ['bread', 'bagel', 'muffin'], shelfLife: 5 },
      { keywords: ['cereal', 'crackers', 'chips'], shelfLife: 90 }
    ];
    
    for (const category of categories) {
      if (category.keywords.some(keyword => itemName.includes(keyword))) {
        return category.shelfLife;
      }
    }
    
    return null;
  }

  private static inferCategory(itemName: string): string {
    if (/milk|cheese|yogurt|butter/.test(itemName)) return 'dairy';
    if (/chicken|beef|pork|fish/.test(itemName)) return 'meat';
    if (/apple|banana|lettuce|tomato/.test(itemName)) return 'produce';
    if (/bread|bagel|muffin/.test(itemName)) return 'bakery';
    if (/cereal|crackers|chips/.test(itemName)) return 'packaged';
    return 'other';
  }
}

// Method 4: Nutritional Inference
class NutritionalInference {
  static async calculate(itemName: string): Promise<ExpiryResult | null> {
    const nameLower = itemName.toLowerCase();
    
    const nutritionalFactors = {
      highWater: {
        keywords: ['lettuce', 'cucumber', 'watermelon', 'tomato', 'milk'],
        multiplier: 0.7,
        note: 'High water content'
      },
      highFat: {
        keywords: ['butter', 'cheese', 'nuts', 'avocado', 'oil'],
        multiplier: 0.8,
        note: 'High fat, rancidity risk'
      },
      highSugar: {
        keywords: ['fruit', 'juice', 'honey', 'jam'],
        multiplier: 0.9,
        note: 'High sugar, bacterial growth'
      },
      acidic: {
        keywords: ['lemon', 'lime', 'vinegar', 'pickles', 'yogurt'],
        multiplier: 1.3,
        note: 'Acidic, longer shelf life'
      },
      preservatives: {
        keywords: ['processed', 'canned', 'packaged', 'frozen'],
        multiplier: 1.5,
        note: 'Contains preservatives'
      }
    };
    
    let multiplier = 1.0;
    const appliedFactors: string[] = [];
    
    for (const [factor, data] of Object.entries(nutritionalFactors)) {
      if (data.keywords.some(keyword => nameLower.includes(keyword))) {
        multiplier *= data.multiplier;
        appliedFactors.push(data.note);
      }
    }
    
    if (appliedFactors.length > 0) {
      const baseShelfLife = 7; // Default base
      const adjustedShelfLife = Math.round(baseShelfLife * multiplier);
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + adjustedShelfLife);
      
      return {
        expiryDate: expiryDate.toISOString().split('T')[0],
        confidence: 0.7,
        method: 'Nutritional Inference',
        category: 'inferred',
        shelfLifeDays: adjustedShelfLife
      };
    }
    
    return null;
  }
}

// Method 5: Seasonal Adjustments
class SeasonalAdjustments {
  static async calculate(itemName: string): Promise<ExpiryResult | null> {
    const currentMonth = new Date().getMonth();
    const season = this.getCurrentSeason(currentMonth);
    
    const seasonalFactors = {
      summer: { multiplier: 0.8, note: 'Hot weather reduces shelf life' },
      winter: { multiplier: 1.1, note: 'Cold weather extends shelf life' },
      spring: { multiplier: 1.0, note: 'Moderate weather' },
      fall: { multiplier: 1.0, note: 'Moderate weather' }
    };
    
    const baseShelfLife = this.getBaseShelfLife(itemName);
    if (baseShelfLife) {
      const factor = seasonalFactors[season];
      const adjustedShelfLife = Math.round(baseShelfLife * factor.multiplier);
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + adjustedShelfLife);
      
      return {
        expiryDate: expiryDate.toISOString().split('T')[0],
        confidence: 0.6,
        method: `Seasonal Adjustment (${season})`,
        category: 'seasonal',
        shelfLifeDays: adjustedShelfLife
      };
    }
    
    return null;
  }

  private static getCurrentSeason(month: number): 'spring' | 'summer' | 'fall' | 'winter' {
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  private static getBaseShelfLife(itemName: string): number | null {
    const nameLower = itemName.toLowerCase();
    
    if (/milk|cheese|yogurt/.test(nameLower)) return 7;
    if (/meat|chicken|beef|fish/.test(nameLower)) return 3;
    if (/fruit|vegetable|produce/.test(nameLower)) return 7;
    if (/bread|bakery/.test(nameLower)) return 5;
    if (/canned|packaged/.test(nameLower)) return 180;
    
    return 14; // Default fallback
  }
}

// Method 6: Fallback with Enhanced Categories
class EnhancedFallback {
  private static readonly ENHANCED_CATEGORIES = {
    dairy: { keywords: ['milk', 'cheese', 'yogurt', 'butter', 'cream'], shelfLife: 7 },
    meat: { keywords: ['chicken', 'beef', 'pork', 'fish', 'turkey', 'ham'], shelfLife: 3 },
    produce: { keywords: ['apple', 'banana', 'lettuce', 'tomato', 'carrot', 'onion'], shelfLife: 7 },
    bakery: { keywords: ['bread', 'bagel', 'muffin', 'cake', 'cookie'], shelfLife: 5 },
    canned: { keywords: ['canned', 'jar', 'sauce', 'soup', 'beans'], shelfLife: 365 },
    frozen: { keywords: ['frozen', 'ice', 'freeze'], shelfLife: 90 },
    snacks: { keywords: ['chips', 'crackers', 'nuts', 'candy'], shelfLife: 60 },
    beverages: { keywords: ['juice', 'soda', 'water', 'tea', 'coffee'], shelfLife: 30 },
    condiments: { keywords: ['ketchup', 'mustard', 'mayo', 'dressing'], shelfLife: 180 },
    default: { keywords: [], shelfLife: 14 }
  };

  static async calculate(itemName: string): Promise<ExpiryResult> {
    const nameLower = itemName.toLowerCase();
    
    for (const [category, data] of Object.entries(this.ENHANCED_CATEGORIES)) {
      if (category === 'default') continue;
      
      if (data.keywords.some(keyword => nameLower.includes(keyword))) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + data.shelfLife);
        
        return {
          expiryDate: expiryDate.toISOString().split('T')[0],
          confidence: 0.5,
          method: 'Enhanced Category Fallback',
          category,
          shelfLifeDays: data.shelfLife
        };
      }
    }
    
    // Ultimate fallback
    const defaultShelfLife = this.ENHANCED_CATEGORIES.default.shelfLife;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + defaultShelfLife);
    
    return {
      expiryDate: expiryDate.toISOString().split('T')[0],
      confidence: 0.3,
      method: 'Default Fallback',
      category: 'unknown',
      shelfLifeDays: defaultShelfLife
    };
  }
}

// Main Advanced Expiry Calculator
export class AdvancedExpiryCalculator {
  private static readonly METHODS = [
    ProductDatabaseLookup,
    AdvancedKeywordAnalysis,
    BrandSpecificAnalysis,
    NutritionalInference,
    SeasonalAdjustments,
    EnhancedFallback // This one always returns a result
  ];

  static async calculateExpiry(itemName: string): Promise<ExpiryResult> {
    console.log(`Calculating expiry for: ${itemName}`);
    
    for (const method of this.METHODS) {
      try {
        console.log(`Trying method: ${method.name}`);
        const result = await method.calculate(itemName);
        
        if (result) {
          console.log(`Success with ${result.method}: ${result.shelfLifeDays} days (confidence: ${result.confidence})`);
          return result;
        }
      } catch (error) {
        console.log(`Method ${method.name} failed:`, error);
        continue;
      }
    }
    
    // This should never happen since EnhancedFallback always returns a result
    throw new Error('All expiry calculation methods failed');
  }
  
  // Utility method to get multiple estimates for comparison
  static async getAllEstimates(itemName: string): Promise<ExpiryResult[]> {
    const results: ExpiryResult[] = [];
    
    for (const method of this.METHODS.slice(0, -1)) { // Exclude the fallback for comparison
      try {
        const result = await method.calculate(itemName);
        if (result) {
          results.push(result);
        }
      } catch (error) {
        console.log(`Method ${method.name} failed:`, error);
      }
    }
    
    return results;
  }
}

export default AdvancedExpiryCalculator; 