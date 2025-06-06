// Test file to demonstrate the advanced expiry calculator
// Run with: node test-expiry-calculator.js

const testItems = [
  // Items that should match different methods
  "Horizon Organic Milk", // Should use Brand-Specific Analysis
  "frozen chicken breast", // Should use Advanced Keyword Analysis with packaging
  "canned tomato soup", // Should use Advanced Keyword Analysis with packaging
  "organic spinach", // Should use Nutritional Inference
  "ground beef", // Should use Advanced Keyword Analysis with specific adjustment
  "apple", // Should use seasonal adjustments
  "bread", // Should use Enhanced Fallback
  "weird unknown food item", // Should fall back to default
  "Pepperidge Farm cookies", // Should use Brand-Specific Analysis
  "vacuum sealed salmon", // Should use packaging multipliers
];

async function testAdvancedCalculator() {
  console.log("🧪 Testing Advanced Expiry Calculator\n");
  console.log("=".repeat(80));

  try {
    // Try to import the calculator
    const { AdvancedExpiryCalculator } = await import(
      "./services/advancedExpiryCalculator.js"
    );

    for (const item of testItems) {
      console.log(`\n📦 Testing: "${item}"`);
      console.log("-".repeat(50));

      try {
        const result = await AdvancedExpiryCalculator.calculateExpiry(item);
        console.log(`✅ Method: ${result.method}`);
        console.log(`📅 Expiry: ${result.expiryDate}`);
        console.log(`📊 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
        console.log(`🏷️  Category: ${result.category}`);
        console.log(`⏱️  Shelf Life: ${result.shelfLifeDays} days`);

        // Also test getting all estimates for comparison
        const allEstimates = await AdvancedExpiryCalculator.getAllEstimates(
          item
        );
        if (allEstimates.length > 1) {
          console.log(`\n🔍 Alternative estimates found:`);
          allEstimates.forEach((est, idx) => {
            if (est.method !== result.method) {
              console.log(
                `   ${idx + 1}. ${est.method}: ${est.shelfLifeDays} days (${(
                  est.confidence * 100
                ).toFixed(1)}%)`
              );
            }
          });
        }
      } catch (error) {
        console.error(`❌ Error testing "${item}":`, error.message);
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log("🎉 Testing complete!");
  } catch (importError) {
    console.error(
      "❌ Failed to import AdvancedExpiryCalculator:",
      importError.message
    );
    console.log("\n💡 Make sure to run this from the project root directory");
    console.log(
      "💡 And ensure the advancedExpiryCalculator.ts file is compiled to .js"
    );
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testAdvancedCalculator().catch(console.error);
}

export { testAdvancedCalculator };
