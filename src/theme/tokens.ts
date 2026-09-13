/**
 * Design Tokens — ProLink Core
 * Material 3-based light system (Service Blue)
 * Modern Professionalism: trust, efficiency, clarity.
 */

export const colors = {
  // Raw ProLink Core palette
  surface: "#f9f9f9",
  surfaceDim: "#dadada",
  surfaceBright: "#f9f9f9",
  surfaceContainerLowest: "#ffffff",
  surfaceContainerLow: "#f3f3f3",
  surfaceContainer: "#eeeeee",
  surfaceContainerHigh: "#e8e8e8",
  surfaceContainerHighest: "#e2e2e2",
  onSurface: "#1a1c1c",
  onSurfaceVariant: "#424656",
  inverseSurface: "#2f3131",
  inverseOnSurface: "#f1f1f1",
  outline: "#737687",
  outlineVariant: "#c3c6d8",
  surfaceTint: "#0052dd",
  primary: "#004ccd",
  onPrimary: "#ffffff",
  primaryContainer: "#0f62fe",
  onPrimaryContainer: "#f3f3ff",
  inversePrimary: "#b4c5ff",
  secondary: "#3855c1",
  onSecondary: "#ffffff",
  secondaryContainer: "#748ffe",
  onSecondaryContainer: "#002380",
  tertiary: "#565757",
  onTertiary: "#ffffff",
  tertiaryContainer: "#6f6f6f",
  onTertiaryContainer: "#f5f3f3",
  error: "#ba1a1a",
  onError: "#ffffff",
  errorContainer: "#ffdad6",
  onErrorContainer: "#93000a",
  primaryFixed: "#dbe1ff",
  primaryFixedDim: "#b4c5ff",
  onPrimaryFixed: "#00174c",
  onPrimaryFixedVariant: "#003da9",
  secondaryFixed: "#dde1ff",
  secondaryFixedDim: "#b8c4ff",
  onSecondaryFixed: "#001453",
  onSecondaryFixedVariant: "#1a3ca8",
  tertiaryFixed: "#e4e2e2",
  tertiaryFixedDim: "#c7c6c6",
  onTertiaryFixed: "#1b1c1c",
  onTertiaryFixedVariant: "#464747",
  background: "#f9f9f9",
  onBackground: "#1a1c1c",
  surfaceVariant: "#e2e2e2",

  // Semantic (extended beyond the given palette)
  success: "#2e7d32",
  successContainer: "#e4f2e4",
  onSuccessContainer: "#0d3d14",
  warning: "#ea580c",
  warningContainer: "#ffead2",
  onWarningContainer: "#7a3a00",

  // Role accents
  clientAccent: "#0f62fe",
  workerAccent: "#15803d",

  // App-level aliases (backwards compatible UI API)
  cardBackground: "#ffffff",
  textPrimary: "#1a1c1c",
  textSecondary: "#424656",
  textMuted: "#737687",
  textInverse: "#ffffff",
  border: "#c3c6d8",
  inputBorder: "#d1d1d1",
  cardStroke: "#eeeeee",
  primaryHover: "#0f62fe",
  primaryLight: "#b4c5ff",
  secondaryLight: "#748ffe",
  overlayBackground: "rgba(0, 0, 0, 0.5)",
  dotActive: "#004ccd",
  dotInactive: "#c3c6d8",
} as const;

export type AppRole = "client" | "worker";

/**
 * Accent color for a screen based on the active role.
 * Trabajador → verde, Cliente → azul. Fallback: azul (cliente).
 */
export const roleAccent = (role: AppRole | null | undefined): string =>
  role === "worker" ? colors.workerAccent : colors.clientAccent;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  marginMobile: 16,
  gutterMobile: 12,
} as const;

export const borderRadius = {
  sm: 4,
  DEFAULT: 8,
  md: 8,
  lg: 16,
  xl: 24,
  pill: 9999,
} as const;

export const typography = {
  fontFamily: "Inter",
  fontSizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 22,
    xxl: 24,
  },
  fontWeights: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.45,
    relaxed: 1.6,
  },
  fonts: {
    displayLg: {
      fontFamily: "Inter",
      fontSize: 34,
      fontWeight: "700" as const,
      lineHeight: 42,
      letterSpacing: -0.5,
    },
    headlineLg: {
      fontFamily: "Inter",
      fontSize: 24,
      fontWeight: "600" as const,
      lineHeight: 32,
      letterSpacing: -0.2,
    },
    headlineLgMobile: {
      fontFamily: "Inter",
      fontSize: 22,
      fontWeight: "600" as const,
      lineHeight: 28,
    },
    headlineMd: {
      fontFamily: "Inter",
      fontSize: 20,
      fontWeight: "600" as const,
      lineHeight: 28,
    },
    headlineSm: {
      fontFamily: "Inter",
      fontSize: 18,
      fontWeight: "600" as const,
      lineHeight: 24,
    },
    bodyLg: {
      fontFamily: "Inter",
      fontSize: 16,
      fontWeight: "400" as const,
      lineHeight: 24,
    },
    bodyMd: {
      fontFamily: "Inter",
      fontSize: 14,
      fontWeight: "400" as const,
      lineHeight: 20,
    },
    labelMd: {
      fontFamily: "Inter",
      fontSize: 12,
      fontWeight: "500" as const,
      lineHeight: 16,
      letterSpacing: 0.5,
    },
  } as const,
} as const;

export const shadows = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  button: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
} as const;