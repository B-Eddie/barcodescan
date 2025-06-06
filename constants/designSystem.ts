// Modern Minimalist Design System
import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

// Color Palette
export const Colors = {
  // Neutral Base Colors
  white: '#FFFFFF',
  gray50: '#FAFAFA',
  gray100: '#F5F5F5',
  gray200: '#EEEEEE',
  gray300: '#E0E0E0',
  gray400: '#BDBDBD',
  gray500: '#9E9E9E',
  gray600: '#757575',
  gray700: '#616161',
  gray800: '#424242',
  gray900: '#212121',
  black: '#000000',

  // Accent Colors (Teal/Blue theme)
  primary50: '#E0F2F1',
  primary100: '#B2DFDB',
  primary200: '#80CBC4',
  primary300: '#4DB6AC',
  primary400: '#26A69A',
  primary500: '#009688', // Main accent
  primary600: '#00897B',
  primary700: '#00796B',
  primary800: '#00695C',
  primary900: '#004D40',

  // Semantic Colors
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',

  // Status Colors for Food Items
  fresh: '#4CAF50',
  expiring: '#FF9800',
  expired: '#F44336',

  // Background Colors
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceVariant: '#F5F5F5',
};

// Typography Scale
export const Typography = {
  // Font Family
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },

  // Font Sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },

  // Line Heights
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },

  // Font Weights
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};

// Spacing System (4px base unit)
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
  '4xl': 96,
};

// Border Radius
export const BorderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
};

// Shadows
export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
};

// Safe Area Constants
export const SafeArea = {
  top: 44, // Status bar + safe area
  bottom: 34, // Home indicator area
  horizontal: 16,
};

// Component Specific Styles
export const Components = {
  // Button Styles
  button: {
    height: 48,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
  },
  
  // Input Styles
  input: {
    height: 48,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
  },

  // Card Styles
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },

  // Header Styles
  header: {
    height: 56,
    paddingHorizontal: Spacing.md,
  },
};

// React Native Paper Theme Customization
export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: Colors.primary500,
    primaryContainer: Colors.primary50,
    secondary: Colors.gray600,
    secondaryContainer: Colors.gray100,
    tertiary: Colors.gray500,
    surface: Colors.surface,
    surfaceVariant: Colors.surfaceVariant,
    background: Colors.background,
    error: Colors.error,
    onPrimary: Colors.white,
    onPrimaryContainer: Colors.primary800,
    onSecondary: Colors.white,
    onSecondaryContainer: Colors.gray800,
    onSurface: Colors.gray900,
    onSurfaceVariant: Colors.gray700,
    onBackground: Colors.gray900,
    outline: Colors.gray300,
    outlineVariant: Colors.gray200,
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: Colors.primary300,
    primaryContainer: Colors.primary800,
    secondary: Colors.gray400,
    secondaryContainer: Colors.gray800,
    tertiary: Colors.gray500,
    surface: Colors.gray900,
    surfaceVariant: Colors.gray800,
    background: Colors.black,
    error: Colors.error,
    onPrimary: Colors.black,
    onPrimaryContainer: Colors.primary50,
    onSecondary: Colors.black,
    onSecondaryContainer: Colors.gray100,
    onSurface: Colors.gray100,
    onSurfaceVariant: Colors.gray300,
    onBackground: Colors.gray100,
    outline: Colors.gray600,
    outlineVariant: Colors.gray700,
  },
};

// Common Styles
export const CommonStyles = {
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  
  safeContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: SafeArea.top,
    paddingBottom: SafeArea.bottom,
    paddingHorizontal: SafeArea.horizontal,
  },

  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: Components.header.height,
    paddingHorizontal: Components.header.paddingHorizontal,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },

  headerTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.gray900,
  },

  headerSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray600,
    marginTop: 2,
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Components.card.borderRadius,
    padding: Components.card.padding,
    marginBottom: Components.card.marginBottom,
    ...Shadows.sm,
  },

  button: {
    height: Components.button.height,
    borderRadius: Components.button.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary500,
  },

  buttonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.white,
  },

  outlineButton: {
    height: Components.button.height,
    borderRadius: Components.button.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary500,
  },

  outlineButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.primary500,
  },

  input: {
    height: Components.input.height,
    borderRadius: Components.input.borderRadius,
    paddingHorizontal: Components.input.paddingHorizontal,
    borderWidth: Components.input.borderWidth,
    borderColor: Colors.gray300,
    backgroundColor: Colors.surface,
    fontSize: Typography.fontSize.base,
    color: Colors.gray900,
  },

  inputFocused: {
    borderColor: Colors.primary500,
  },

  // Text Styles
  h1: {
    fontSize: Typography.fontSize['4xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.gray900,
    lineHeight: Typography.fontSize['4xl'] * Typography.lineHeight.tight,
  },

  h2: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.gray900,
    lineHeight: Typography.fontSize['3xl'] * Typography.lineHeight.tight,
  },

  h3: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.gray900,
    lineHeight: Typography.fontSize['2xl'] * Typography.lineHeight.tight,
  },

  h4: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.gray900,
    lineHeight: Typography.fontSize.xl * Typography.lineHeight.normal,
  },

  body: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.normal,
    color: Colors.gray800,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
  },

  caption: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.normal,
    color: Colors.gray600,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.normal,
  },

  small: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.normal,
    color: Colors.gray500,
    lineHeight: Typography.fontSize.xs * Typography.lineHeight.normal,
  },
};

export default {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  SafeArea,
  Components,
  lightTheme,
  darkTheme,
  CommonStyles,
}; 