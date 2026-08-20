/**
 * Design Tokens for Startup App
 * Premium Dark Mode Palette with High-Contrast WCAG AA Compliance
 */

export const colors = {
  // Backgrounds
  background: "#0F172A", // Slate 900
  cardBackground: "#1E293B", // Slate 800
  surface: "#1E293B", // Slate 800 – input / picker backgrounds
  overlayBackground: "rgba(15, 23, 42, 0.75)",

  // Accents & Brand
  primary: "#6366F1", // Indigo 500
  primaryHover: "#4F46E5", // Indigo 600
  primaryLight: "#818CF8", // Indigo 400
  secondary: "#10B981", // Emerald 500 (Worker Accent)
  secondaryLight: "#34D399",

  // Client vs Worker Dual-Role Accents
  clientAccent: "#3B82F6", // Blue 500
  workerAccent: "#10B981", // Emerald 500

  // Text Colors (High Contrast WCAG AA)
  textPrimary: "#F8FAFC", // Slate 50
  textSecondary: "#94A3B8", // Slate 400
  textMuted: "#64748B", // Slate 500
  textInverse: "#0F172A",

  // Interactive UI
  border: "#334155", // Slate 700
  dotInactive: "#334155",
  dotActive: "#6366F1",
  error: "#EF4444",
  success: "#22C55E",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const borderRadius = {
  sm: 6,
  md: 12,
  lg: 20,
  xl: 24,
  pill: 9999,
} as const;

export const typography = {
  fontSizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 26,
    xxl: 32,
  },
  fontWeights: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },
} as const;

export const shadows = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  button: {
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;
