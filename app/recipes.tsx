import { GoogleGenerativeAI } from "@google/generative-ai";
import { useFocusEffect } from "expo-router";
import { get, ref } from "firebase/database";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  IconButton,
  Text,
  useTheme,
} from "react-native-paper";
import {
  Colors,
  CommonStyles,
  SafeArea,
  Shadows,
  Spacing,
} from "../constants/designSystem";
import { auth, database } from "../firebaseConfig";

interface Recipe {
  title: string;
  ingredients: string[];
  instructions: string[];
  prepTime: string;
  difficulty: string;
  nutritionInfo: {
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
    carbsPercentage: number;
    proteinPercentage: number;
    fatPercentage: number;
  };
}

export default function RecipesScreen() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [availableIngredients, setAvailableIngredients] = useState<string[]>(
    []
  );
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  useEffect(() => {
    fetchAvailableIngredients();
  }, []);

  // Refresh ingredients when page comes into focus (to reflect deletions)
  useFocusEffect(
    useCallback(() => {
      fetchAvailableIngredients();
    }, [])
  );

  const fetchAvailableIngredients = async () => {
    try {
      setLoading(true);
      const currentUser = auth.currentUser;
      if (!currentUser?.email) return;

      const encodedEmail = encodeURIComponent(
        currentUser.email.replace(/\./g, ",")
      );
      const productsRef = ref(database, `users/${encodedEmail}/products`);
      const snapshot = await get(productsRef);

      const ingredients: string[] = [];
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const data = childSnapshot.val();
          if (data.name) {
            ingredients.push(data.name);
          }
        });
      }

      // Remove duplicates and clean up
      const uniqueIngredients = [...new Set(ingredients)]
        .filter(Boolean)
        .map((ing) => ing.toLowerCase().trim());

      setAvailableIngredients(uniqueIngredients);
    } catch (error) {
      console.error("Error fetching ingredients:", error);
      Alert.alert("Error", "Failed to load available ingredients");
    } finally {
      setLoading(false);
    }
  };

  const generateRecipes = async () => {
    try {
      setGenerating(true);

      if (availableIngredients.length === 0) {
        Alert.alert(
          "No Ingredients",
          "Please add some food items to your pantry first."
        );
        return;
      }

      // Initialize Gemini AI
      const genAI = new GoogleGenerativeAI(
        "AIzaSyCOHNbozBCb08eOE1Q79-aZDx4OS_gfmiw"
      );
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      // Prepare the prompt for Gemini
      const prompt = `Generate 3 recipes using these available ingredients: ${availableIngredients.join(
        ", "
      )}. 

For each recipe, provide:
1. A creative title
2. List of ingredients with quantities (you can include additional common ingredients not in the list)
3. Step-by-step cooking instructions
4. Preparation time (e.g., "30 minutes")
5. Difficulty level (Easy, Medium, or Hard)
6. Nutritional information per serving

IMPORTANT: Return ONLY a valid JSON array with no additional text, explanations, or markdown formatting. The response must be parseable JSON.

Use this exact structure:
[
  {
    "title": "Recipe Name",
    "ingredients": ["1 cup ingredient1", "2 tbsp ingredient2"],
    "instructions": ["Step 1 description", "Step 2 description"],
    "prepTime": "30 minutes",
    "difficulty": "Easy",
    "nutritionInfo": {
      "calories": 450,
      "carbs": 35,
      "protein": 25,
      "fat": 15,
      "carbsPercentage": 45,
      "proteinPercentage": 35,
      "fatPercentage": 20
    }
  }
]`;

      // Call Gemini API
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log("Gemini raw response:", text);

      // Clean the response to extract JSON
      let cleanedText = text.trim();

      // Remove markdown code blocks if present
      cleanedText = cleanedText.replace(/```json\s*/gi, "");
      cleanedText = cleanedText.replace(/```\s*/g, "");
      cleanedText = cleanedText.replace(/^[^[]*/, ""); // Remove everything before first [
      cleanedText = cleanedText.replace(/[^\]]*$/, "]"); // Remove everything after last ]

      // Remove any leading/trailing text that isn't JSON
      const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        cleanedText = jsonMatch[0];
      }

      // Parse the JSON
      let recipes;
      try {
        recipes = JSON.parse(cleanedText);
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        console.error("Cleaned text:", cleanedText);

        // Try to fix common JSON issues
        cleanedText = cleanedText
          .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":') // Fix unquoted keys
          .replace(/,\s*}/g, "}") // Remove trailing commas
          .replace(/,\s*]/g, "]"); // Remove trailing commas in arrays

        recipes = JSON.parse(cleanedText);
      }

      if (!Array.isArray(recipes) || recipes.length === 0) {
        throw new Error("Invalid recipe format received");
      }

      setRecipes(recipes);
    } catch (error) {
      console.error("Error generating recipes:", error);
      Alert.alert(
        "Error",
        `Failed to generate recipes: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[CommonStyles.container, CommonStyles.centerContent]}
      >
        <ActivityIndicator size="large" color={Colors.primary500} />
        <Text style={styles.loadingText}>Loading available ingredients...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={CommonStyles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={CommonStyles.h2}>Recipe Generator</Text>
        <Text style={CommonStyles.caption}>
          Create delicious recipes from your pantry items
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Available Ingredients */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={CommonStyles.h4}>Available Ingredients</Text>
            <Text style={CommonStyles.caption}>
              {availableIngredients.length} items in your pantry
            </Text>
          </View>

          <View style={styles.ingredientsContainer}>
            {availableIngredients.length === 0 ? (
              <View style={styles.emptyState}>
                <IconButton
                  icon="basket-outline"
                  size={48}
                  iconColor={Colors.gray400}
                />
                <Text style={CommonStyles.body}>No ingredients available</Text>
                <Text style={CommonStyles.caption}>
                  Add items to your pantry to generate recipes
                </Text>
              </View>
            ) : (
              <View style={styles.chipContainer}>
                {availableIngredients.map((ingredient, index) => (
                  <Chip
                    key={index}
                    style={styles.chip}
                    textStyle={styles.chipText}
                    icon="food"
                  >
                    {ingredient}
                  </Chip>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Generate Button */}
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={generateRecipes}
            loading={generating}
            disabled={generating || availableIngredients.length === 0}
            style={styles.generateButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
            icon="chef-hat"
          >
            {generating ? "Generating Recipes..." : "Generate Recipes"}
          </Button>
        </View>

        {/* Recipes */}
        {recipes.map((recipe, index) => (
          <Card key={index} style={styles.recipeCard}>
            <Card.Content style={styles.recipeContent}>
              {/* Recipe Header */}
              <View style={styles.recipeHeader}>
                <Text style={CommonStyles.h3}>{recipe.title}</Text>
                <View style={styles.recipeMeta}>
                  <Chip
                    icon="clock-outline"
                    style={styles.metaChip}
                    textStyle={styles.metaChipText}
                    compact
                  >
                    {recipe.prepTime}
                  </Chip>
                  <Chip
                    icon="star-outline"
                    style={[
                      styles.metaChip,
                      {
                        backgroundColor:
                          recipe.difficulty === "Easy"
                            ? Colors.success
                            : recipe.difficulty === "Medium"
                            ? Colors.warning
                            : Colors.error,
                      },
                    ]}
                    textStyle={[styles.metaChipText, { color: Colors.white }]}
                    compact
                  >
                    {recipe.difficulty}
                  </Chip>
                </View>
              </View>

              {/* Nutrition Info */}
              <View style={styles.nutritionCard}>
                <Text style={CommonStyles.h4}>Nutrition per serving</Text>
                <View style={styles.caloriesRow}>
                  <Text style={styles.caloriesText}>
                    {recipe.nutritionInfo.calories} calories
                  </Text>
                </View>
                <View style={styles.macrosContainer}>
                  <View style={styles.macroItem}>
                    <Text style={styles.macroValue}>
                      {recipe.nutritionInfo.carbsPercentage}%
                    </Text>
                    <Text style={styles.macroLabel}>Carbs</Text>
                  </View>
                  <View style={styles.macroItem}>
                    <Text style={styles.macroValue}>
                      {recipe.nutritionInfo.proteinPercentage}%
                    </Text>
                    <Text style={styles.macroLabel}>Protein</Text>
                  </View>
                  <View style={styles.macroItem}>
                    <Text style={styles.macroValue}>
                      {recipe.nutritionInfo.fatPercentage}%
                    </Text>
                    <Text style={styles.macroLabel}>Fat</Text>
                  </View>
                </View>
              </View>

              {/* Ingredients */}
              <View style={styles.recipeSection}>
                <Text style={CommonStyles.h4}>Ingredients</Text>
                {recipe.ingredients.map((ingredient, idx) => (
                  <Text key={idx} style={styles.listItem}>
                    • {ingredient}
                  </Text>
                ))}
              </View>

              {/* Instructions */}
              <View style={styles.recipeSection}>
                <Text style={CommonStyles.h4}>Instructions</Text>
                {recipe.instructions.map((step, idx) => (
                  <View key={idx} style={styles.instructionStep}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))}
              </View>
            </Card.Content>
          </Card>
        ))}

        {/* Bottom padding for safe area */}
        <View style={{ height: SafeArea.bottom + Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: SafeArea.horizontal,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },

  scrollView: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  section: {
    paddingHorizontal: SafeArea.horizontal,
    paddingVertical: Spacing.lg,
  },

  sectionHeader: {
    marginBottom: Spacing.md,
  },

  ingredientsContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.lg,
    ...Shadows.sm,
  },

  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },

  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },

  chip: {
    backgroundColor: Colors.primary50,
    marginBottom: Spacing.xs,
  },

  chipText: {
    color: Colors.primary700,
    fontSize: 14,
  },

  buttonContainer: {
    paddingHorizontal: SafeArea.horizontal,
    paddingVertical: Spacing.md,
  },

  generateButton: {
    backgroundColor: Colors.primary500,
    borderRadius: 12,
  },

  buttonContent: {
    height: 52,
  },

  buttonLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.white,
  },

  loadingText: {
    ...CommonStyles.body,
    marginTop: Spacing.md,
    textAlign: "center",
  },

  recipeCard: {
    marginHorizontal: SafeArea.horizontal,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    ...Shadows.md,
  },

  recipeContent: {
    padding: Spacing.lg,
  },

  recipeHeader: {
    marginBottom: Spacing.lg,
  },

  recipeMeta: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },

  metaChip: {
    backgroundColor: Colors.gray100,
  },

  metaChipText: {
    color: Colors.gray700,
    fontSize: 12,
  },

  nutritionCard: {
    backgroundColor: Colors.primary50,
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },

  caloriesRow: {
    marginVertical: Spacing.sm,
  },

  caloriesText: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.primary800,
  },

  macrosContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.md,
  },

  macroItem: {
    alignItems: "center",
  },

  macroValue: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.primary700,
  },

  macroLabel: {
    fontSize: 12,
    color: Colors.primary600,
    marginTop: Spacing.xs,
  },

  recipeSection: {
    marginBottom: Spacing.lg,
  },

  listItem: {
    ...CommonStyles.body,
    marginBottom: Spacing.sm,
    paddingLeft: Spacing.sm,
  },

  instructionStep: {
    flexDirection: "row",
    marginBottom: Spacing.md,
    alignItems: "flex-start",
  },

  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary500,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
    marginTop: 2,
  },

  stepNumberText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "600",
  },

  stepText: {
    ...CommonStyles.body,
    flex: 1,
    lineHeight: 22,
  },
});
