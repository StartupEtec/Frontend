import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { OnboardingSlideProps } from "../../types/onboarding";
import { colors, spacing, borderRadius, typography, shadows } from "../../theme/tokens";

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
                <View style={[styles.iconCircle, styles.iconCirclePrimary]}>
                  <Feather name="zap" size={24} color={colors.primary} />
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
                <View style={[styles.badgeTag, styles.badgeTagClient]}>
                  <Text style={styles.badgeTagText}>CLIENTE</Text>
                </View>
                <View style={[styles.iconCircle, styles.iconCircleClient]}>
                  <Feather name="search" size={24} color={colors.clientAccent} />
                </View>
                <Text style={styles.cardTitleMock}>Buscar Servicios</Text>
                <View style={styles.priceTag}>
                  <Feather name="shield" size={13} color={colors.primary} />
                  <Text style={styles.priceTagText}> Escrow Protegido</Text>
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
                  style={[styles.badgeTag, { backgroundColor: colors.workerAccent }]}
                >
                  <Text style={styles.badgeTagText}>PROVEEDOR</Text>
                </View>
                <View style={[styles.iconCircle, styles.iconCircleWorker]}>
                  <Feather name="tool" size={24} color={colors.workerAccent} />
                </View>
                <Text style={styles.cardTitleMock}>Monetizar Talento</Text>
                <View style={styles.incomeBadge}>
                  <Feather name="check-circle" size={13} color={colors.success} />
                  <Text style={styles.incomeText}> Pagos Garantizados</Text>
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
              style={[styles.outerCircle, { borderColor: colors.primary }]}
            >
              <View
                style={[
                  styles.innerCard,
                  { backgroundColor: colors.cardBackground },
                ]}
              >
                <View style={[styles.iconCircle, styles.iconCirclePrimary]}>
                  <Feather name="repeat" size={24} color={colors.primary} />
                </View>
                <Text style={styles.cardTitleMock}>Rol Dual Activado</Text>
                <View style={styles.dualPill}>
                  <Feather name="repeat" size={12} color={colors.primary} />
                  <Text style={styles.dualPillText}> Cliente / Proveedor</Text>
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
    ...shadows.card,
    borderWidth: 1,
    borderColor: colors.cardStroke,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  iconCirclePrimary: {
    backgroundColor: colors.primaryFixed,
  },
  iconCircleClient: {
    backgroundColor: colors.primaryFixed,
  },
  iconCircleWorker: {
    backgroundColor: colors.successContainer,
  },
  mockLineLong: {
    width: 100,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.outlineVariant,
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
  },
  badgeTagClient: {
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
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  priceTagText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "600",
  },
  incomeBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    backgroundColor: colors.successContainer,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  incomeText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: "600",
  },
  dualPill: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
  },
  dualPillText: {
    color: colors.primary,
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
    lineHeight: 28,
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