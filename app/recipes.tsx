import { LinearGradient } from "expo-linear-gradient";
import { get, ref } from "firebase/database";
import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import {
    ActivityIndicator,
    Button,
    Card,
    Chip,
    Text,
    useTheme,
} from "react-native-paper";
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
  const [availableIngredients, setAvailableIngredients] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  useEffect(() => {
    fetchAvailableIngredients();
  }, []);

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
        .map(ing => ing.toLowerCase().trim());

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

      // Prepare the prompt for ChatGPT
      const prompt = `Generate 3 recipes using these ingredients: ${availableIngredients.join(", ")}. 
      For each recipe, provide:
      1. A creative title
      2. List of ingredients (including quantities)
      3. Step-by-step instructions
      4. Preparation time
      5. Difficulty level (Easy/Medium/Hard)
      6. Nutritional information per serving (calories, carbs, protein, fat)
      
      Format the response as a JSON array with this structure:
      [{
        "title": "string",
        "ingredients": ["string"],
        "instructions": ["string"],
        "prepTime": "string",
        "difficulty": "string",
        "nutritionInfo": {
          "calories": number,
          "carbs": number,
          "protein": number,
          "fat": number,
          "carbsPercentage": number,
          "proteinPercentage": number,
          "fatPercentage": number
        }
      }]`;

      // Call ChatGPT API
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
        }),
      });

      const data = await response.json();
      const recipes = JSON.parse(data.choices[0].message.content);
      setRecipes(recipes);
    } catch (error) {
      console.error("Error generating recipes:", error);
      Alert.alert("Error", "Failed to generate recipes");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <LinearGradient
        colors={["#f6f7f9", "#ffffff"]}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading available ingredients...</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#f6f7f9", "#ffffff"]} style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Recipe Generator
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Generate recipes using your available ingredients
          </Text>
        </View>

        <Card style={styles.ingredientsCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Available Ingredients
            </Text>
            <View style={styles.chipContainer}>
              {availableIngredients.map((ingredient, index) => (
                <Chip
                  key={index}
                  style={styles.chip}
                  textStyle={{ color: theme.colors.primary }}
                >
                  {ingredient}
                </Chip>
              ))}
            </View>
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          onPress={generateRecipes}
          loading={generating}
          disabled={generating || availableIngredients.length === 0}
          style={styles.generateButton}
        >
          Generate Recipes
        </Button>

        {recipes.map((recipe, index) => (
          <Card key={index} style={styles.recipeCard}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.recipeTitle}>
                {recipe.title}
              </Text>
              
              <View style={styles.recipeMeta}>
                <Chip icon="clock" style={styles.metaChip}>
                  {recipe.prepTime}
                </Chip>
                <Chip icon="star" style={styles.metaChip}>
                  {recipe.difficulty}
                </Chip>
              </View>

              <View style={styles.nutritionInfo}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Nutrition per serving
                </Text>
                <Text style={styles.calories}>
                  {recipe.nutritionInfo.calories} calories
                </Text>
                <View style={styles.macros}>
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

              <Text variant="titleMedium" style={styles.sectionTitle}>
                Ingredients
              </Text>
              {recipe.ingredients.map((ingredient, idx) => (
                <Text key={idx} style={styles.ingredient}>
                  • {ingredient}
                </Text>
              ))}

              <Text variant="titleMedium" style={styles.sectionTitle}>
                Instructions
              </Text>
              {recipe.instructions.map((step, idx) => (
                <Text key={idx} style={styles.instruction}>
                  {idx + 1}. {step}
                </Text>
              ))}
            </Card.Content>
          </Card>
        ))}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  subtitle: {
    color: "#666",
  },
  ingredientsCard: {
    marginBottom: 24,
    borderRadius: 16,
  },
  sectionTitle: {
    marginBottom: 16,
    color: "#1a1a1a",
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    marginBottom: 8,
  },
  generateButton: {
    marginBottom: 24,
    borderRadius: 12,
  },
  recipeCard: {
    marginBottom: 24,
    borderRadius: 16,
  },
  recipeTitle: {
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 16,
  },
  recipeMeta: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
  },
  metaChip: {
    backgroundColor: "#f0f0f0",
  },
  nutritionInfo: {
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  calories: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 16,
  },
  macros: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  macroItem: {
    alignItems: "center",
  },
  macroValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  macroLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  ingredient: {
    fontSize: 16,
    color: "#1a1a1a",
    marginBottom: 8,
    lineHeight: 24,
  },
  instruction: {
    fontSize: 16,
    color: "#1a1a1a",
    marginBottom: 12,
    lineHeight: 24,
  },
}); 