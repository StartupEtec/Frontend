import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { colors, spacing, borderRadius, typography } from "../theme/tokens";

interface SuccessToastProps {
  visible: boolean;
  message: string;
  onFinish?: () => void;
  testID?: string;
}

export const SuccessToast: React.FC<SuccessToastProps> = ({
  visible,
  message,
  onFinish,
  testID,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const onFinishRef = useRef(onFinish);
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    if (!visible) return;

    setIsRendered(true);
    opacity.setValue(0);

    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2500),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsRendered(false);
      onFinishRef.current?.();
    });
  }, [visible, opacity]);

  if (!isRendered) return null;

  return (
    <Animated.View
      style={[styles.toast, { opacity }]}
      testID={testID}
      pointerEvents="none"
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    bottom: spacing.xl,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.success,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
  },
  text: {
    color: colors.onPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    textAlign: "center",
  },
});

export default SuccessToast;
