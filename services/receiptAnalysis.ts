import { GoogleGenerativeAI } from '@google/generative-ai';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';

interface ReceiptItem {
  id: string;
  name: string;
  purchaseDate: string;
  estimatedExpiryDate: string;
  confidence: number;
  category: string;
  quantity: number;
}

interface ReceiptAnalysisResult {
  purchaseDate: string;
  items: ReceiptItem[];
}

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI('AIzaSyCOHNbozBCb08eOE1Q79-aZDx4OS_gfmiw');

// Food categories and their typical shelf lives (in days)
const FOOD_CATEGORIES = {
  dairy: { shelfLife: 7, keywords: ['milk', 'cheese', 'yogurt', 'cream', 'butter'] },
  meat: { shelfLife: 5, keywords: ['beef', 'chicken', 'pork', 'lamb', 'turkey', 'fish', 'salmon'] },
  produce: { shelfLife: 7, keywords: ['apple', 'banana', 'lettuce', 'tomato', 'carrot', 'fruit', 'vegetable'] },
  bakery: { shelfLife: 5, keywords: ['bread', 'roll', 'bun', 'bagel', 'muffin', 'cake'] },
  frozen: { shelfLife: 30, keywords: ['frozen', 'ice cream', 'pizza'] },
  canned: { shelfLife: 365, keywords: ['can', 'preserved', 'jar', 'sauce', 'soup'] },
  snacks: { shelfLife: 90, keywords: ['chips', 'cookies', 'crackers', 'snack'] },
  beverages: { shelfLife: 14, keywords: ['juice', 'soda', 'water', 'drink'] },
  other: { shelfLife: 30, keywords: [] }
};


export async function analyzeReceipt(imageUri: string): Promise<ReceiptAnalysisResult> {
  try {
    // Process the image for better analysis
    const enhancedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        { resize: { width: 1024 } },
      ],
      { 
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG 
      }
    );

    // Convert image to base64
    const base64Image = await FileSystem.readAsStringAsync(enhancedImage.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Use Gemini Vision to analyze the receipt
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
Analyze this grocery receipt image and extract the following information in JSON format:

{
  "purchaseDate": "YYYY-MM-DD format",
  "items": [
    {
      "name": "item name (cleaned and standardized)",
      "quantity": number,
      "category": "dairy|meat|produce|bakery|frozen|canned|snacks|beverages|other"
    }
  ]
}

Rules:
1. Only include actual food items, not store info, totals, or non-food items
2. Clean up item names (remove prices, codes, etc.)
3. Standardize names (e.g., "BANANAS" → "Bananas")
4. Categorize each item appropriately
5. Extract quantities when visible (default to 1)
6. Find the purchase date from the receipt
7. If no clear date is found, use today's date
8. Return valid JSON only, no other text

Focus on identifying common grocery items like:
- Dairy: milk, cheese, yogurt, butter
- Meat: chicken, beef, pork, fish
- Produce: fruits, vegetables
- Bakery: bread, rolls, pastries
- Frozen: ice cream, frozen meals
- Canned: soups, sauces, canned goods
- Snacks: chips, cookies, crackers
- Beverages: juice, soda, water
`;

    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: "image/jpeg"
      }
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    console.log('Gemini raw response:', text);

    // Parse the JSON response
    let geminiResult;
    try {
      // Clean the response to extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        geminiResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', text);
      throw new Error('Failed to parse receipt analysis results');
    }

    if (!geminiResult.items || geminiResult.items.length === 0) {
      throw new Error('No food items found in the receipt. Please try again with a clearer image.');
    }

    // Ensure we have a valid purchase date
    const purchaseDate = geminiResult.purchaseDate || new Date().toISOString().split('T')[0];

    // Process each item to add expiry dates and confidence scores
    const items: ReceiptItem[] = await Promise.all(
      geminiResult.items.map(async (item: any, index: number) => {
        const { estimatedExpiryDate, confidence, category } = await predictExpiryDate(
          item.name, 
          purchaseDate,
          item.category
        );
        
        return {
          id: `item-${index}`,
          name: item.name,
          purchaseDate: purchaseDate,
          estimatedExpiryDate,
          confidence,
          category,
          quantity: item.quantity || 1
        };
      })
    );

    return {
      purchaseDate: purchaseDate,
      items
    };

  } catch (error) {
    console.error('Error analyzing receipt with Gemini:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to analyze receipt: ${error.message}`);
    }
    throw new Error('Failed to analyze receipt. Please try again.');
  }
}

export async function predictExpiryDate(
  itemName: string, 
  purchaseDate: string, 
  suggestedCategory?: string
): Promise<{
  estimatedExpiryDate: string;
  confidence: number;
  category: string;
}> {
  try {
    // Import the advanced calculator
    const { AdvancedExpiryCalculator } = await import('./advancedExpiryCalculator');
    
    // Use the advanced calculator for more precise predictions
    const result = await AdvancedExpiryCalculator.calculateExpiry(itemName);
    
    // Adjust expiry date based on purchase date instead of current date
    const purchaseDateObj = new Date(purchaseDate);
    const currentDate = new Date();
    const daysDifference = Math.ceil((currentDate.getTime() - purchaseDateObj.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate expiry date from purchase date
    const expiryFromPurchase = new Date(purchaseDate);
    expiryFromPurchase.setDate(expiryFromPurchase.getDate() + result.shelfLifeDays);
    
    // Override category if suggested and different
    const finalCategory = suggestedCategory && suggestedCategory !== 'unknown' ? suggestedCategory : result.category;
    
    // Boost confidence if we have a suggested category that matches
    let finalConfidence = result.confidence;
    if (suggestedCategory && suggestedCategory === result.category) {
      finalConfidence = Math.min(0.95, result.confidence + 0.1);
    }
    
    console.log(`Advanced prediction for "${itemName}": ${result.shelfLifeDays} days via ${result.method} (confidence: ${finalConfidence})`);
    
    return {
      estimatedExpiryDate: expiryFromPurchase.toISOString().split('T')[0],
      confidence: finalConfidence,
      category: finalCategory
    };
  } catch (error) {
    console.error('Advanced expiry calculation failed, falling back to simple method:', error);
    
    // Fallback to original simple method
    const itemNameLower = itemName.toLowerCase();
    let bestMatch = {
      category: suggestedCategory || 'other',
      shelfLife: FOOD_CATEGORIES.other.shelfLife,
      confidence: 0.85
    };

    // Use suggested category if provided, otherwise find best match
    if (suggestedCategory && FOOD_CATEGORIES[suggestedCategory as keyof typeof FOOD_CATEGORIES]) {
      bestMatch = {
        category: suggestedCategory,
        shelfLife: FOOD_CATEGORIES[suggestedCategory as keyof typeof FOOD_CATEGORIES].shelfLife,
        confidence: 0.95
      };
    } else {
      // Find the best matching category based on keywords
      for (const [category, data] of Object.entries(FOOD_CATEGORIES)) {
        if (data.keywords.some(keyword => itemNameLower.includes(keyword))) {
          bestMatch = {
            category,
            shelfLife: data.shelfLife,
            confidence: 0.95
          };
          break;
        }
      }
    }

    const purchaseDateObj = new Date(purchaseDate);
    const expiryDate = new Date(purchaseDateObj.getTime() + bestMatch.shelfLife * 24 * 60 * 60 * 1000);

    console.log(`Fallback prediction for "${itemName}": ${bestMatch.shelfLife} days (confidence: ${bestMatch.confidence})`);

    return {
      estimatedExpiryDate: expiryDate.toISOString().split('T')[0],
      confidence: bestMatch.confidence,
      category: bestMatch.category
    };
  }
}

// Legacy functions kept for compatibility (not used with Gemini)
export function extractPurchaseDate(receiptText: string): string {
  return new Date().toISOString().split('T')[0];
}

export function extractItems(receiptText: string): Array<{
  name: string;
  quantity: number;
}> {
  return [];
} 