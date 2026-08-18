import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { OnboardingSlideProps } from "../../types/onboarding";
import { colors, spacing, borderRadius, typography } from "../../theme/tokens";

export const OnboardingSlide: React.FC<OnboardingSlideProps> = ({
  item,
  width,
  height,
}) => {
  // Render visual graphic badge according to slide type
  const renderGraphic = () => {
    switch (item.svgPlaceholderType) {
      case "platform":
        return (
          <View style={styles.graphicContainer}>
            <View style={[styles.outerCircle, { borderColor: colors.primary }]}>
              <View
                style={[
                  styles.innerCard,
                  { backgroundColor: colors.cardBackground },
                ]}
              >
                <View style={styles.iconCircle}>
                  <Text style={styles.iconText}>⚡</Text>
                </View>
                <View style={styles.mockLineLong} />
                <View style={styles.mockLineShort} />
              </View>
            </View>
          </View>
        );
      case "client":
        return (
          <View style={styles.graphicContainer}>
            <View
              style={[styles.outerCircle, { borderColor: colors.clientAccent }]}
            >
              <View
                style={[
                  styles.innerCard,
                  { backgroundColor: colors.cardBackground },
                ]}
              >
                <View style={styles.badgeTag}>
                  <Text style={styles.badgeTagText}>CLIENTE</Text>
                </View>
                <View style={styles.iconCircleClient}>
                  <Text style={styles.iconText}>🔍</Text>
                </View>
                <Text style={styles.cardTitleMock}>Buscar Servicios</Text>
                <View style={styles.priceTag}>
                  <Text style={styles.priceTagText}>Escrow Protegido 🛡️</Text>
                </View>
              </View>
            </View>
          </View>
        );
      case "worker":
        return (
          <View style={styles.graphicContainer}>
            <View
              style={[styles.outerCircle, { borderColor: colors.workerAccent }]}
            >
              <View
                style={[
                  styles.innerCard,
                  { backgroundColor: colors.cardBackground },
                ]}
              >
                <View
                  style={[
                    styles.badgeTag,
                    { backgroundColor: colors.workerAccent },
                  ]}
                >
                  <Text style={styles.badgeTagText}>PROVEEDOR</Text>
                </View>
                <View style={styles.iconCircleWorker}>
                  <Text style={styles.iconText}>🛠️</Text>
                </View>
                <Text style={styles.cardTitleMock}>Monetizar Talento</Text>
                <View style={styles.incomeBadge}>
                  <Text style={styles.incomeText}>
                    +100% Pagos Garantizados
                  </Text>
                </View>
              </View>
            </View>
          </View>
        );
      case "welcome":
      default:
        return (
          <View style={styles.graphicContainer}>
            <View
              style={[styles.outerCircle, { borderColor: colors.primaryLight }]}
            >
              <View
                style={[
                  styles.innerCard,
                  { backgroundColor: colors.cardBackground },
                ]}
              >
                <View style={styles.iconCircleWelcome}>
                  <Text style={styles.iconText}>🚀</Text>
                </View>
                <Text style={styles.cardTitleMock}>Rol Dual Activado</Text>
                <View style={styles.dualPill}>
                  <Text style={styles.dualPillText}>Cliente ⇆ Proveedor</Text>
                </View>
              </View>
            </View>
          </View>
        );
    }
  };

  return (
    <View style={[styles.container, { width, height: height * 0.72 }]}>
      {renderGraphic()}

      <View style={styles.textContainer}>
        <View style={[styles.badge, { backgroundColor: item.badgeColor }]}>
          <Text style={styles.badgeText}>{item.badgeText}</Text>
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>

        <Text style={styles.description}>{item.description}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  graphicContainer: {
    height: 240,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  outerCircle: {
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  innerCard: {
    width: 170,
    height: 170,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(99, 102, 241, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  iconCircleClient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  iconCircleWorker: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  iconCircleWelcome: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(129, 140, 248, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  iconText: {
    fontSize: 24,
  },
  mockLineLong: {
    width: 100,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    marginTop: spacing.xs,
  },
  mockLineShort: {
    width: 60,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: spacing.xs,
  },
  badgeTag: {
    position: "absolute",
    top: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.clientAccent,
  },
  badgeTagText: {
    color: "#FFF",
    fontSize: 9,
    fontWeight: "bold",
  },
  cardTitleMock: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
    textAlign: "center",
  },
  priceTag: {
    marginTop: 6,
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  priceTagText: {
    color: colors.clientAccent,
    fontSize: 11,
    fontWeight: "600",
  },
  incomeBadge: {
    marginTop: 6,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  incomeText: {
    color: colors.workerAccent,
    fontSize: 11,
    fontWeight: "600",
  },
  dualPill: {
    marginTop: 6,
    backgroundColor: "rgba(99, 102, 241, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
  },
  dualPillText: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: "700",
  },

  // Text Box
  textContainer: {
    alignItems: "center",
    paddingHorizontal: spacing.md,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.pill,
    marginBottom: spacing.sm,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    textAlign: "center",
    marginBottom: spacing.sm,
    lineHeight: 32,
  },
  description: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.regular,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: spacing.xs,
  },
});
