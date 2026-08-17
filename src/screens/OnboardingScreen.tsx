import React, { useRef, useEffect } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { useOnboarding } from "../hooks/useOnboarding";
import { OnboardingSlide } from "../components/onboarding/OnboardingSlide";
import { OnboardingHeader } from "../components/onboarding/OnboardingHeader";
import { OnboardingFooter } from "../components/onboarding/OnboardingFooter";
import {
  OnboardingScreenProps,
  OnboardingSlideData,
} from "../types/onboarding";
import { colors } from "../theme/tokens";

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  onFinishOnboarding,
}) => {
  const { width, height } = useWindowDimensions();
  const flatListRef = useRef<FlatList<OnboardingSlideData>>(null);

  const {
    currentIndex,
    isLastSlide,
    slides,
    isLoading,
    handleNext,
    handlePrev,
    handleSkip,
    handleComplete,
    handleScrollEnd,
  } = useOnboarding(onFinishOnboarding);

  // Sync FlatList position when currentIndex updates via next/prev buttons
  useEffect(() => {
    if (flatListRef.current && !isLoading) {
      flatListRef.current.scrollToIndex({
        index: currentIndex,
        animated: true,
      });
    }
  }, [currentIndex, isLoading]);

  const onMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / width);
    handleScrollEnd(index);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Top Header with Skip action */}
      <OnboardingHeader onSkip={handleSkip} showSkip={!isLastSlide} />

      {/* Horizontal Slide Carousel */}
      <FlatList
        ref={flatListRef}
        data={slides}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        renderItem={({ item }) => (
          <OnboardingSlide item={item} width={width} height={height} />
        )}
      />

      {/* Bottom Footer with Navigation & Action CTAs */}
      <OnboardingFooter
        currentIndex={currentIndex}
        totalSlides={slides.length}
        onNext={handleNext}
        onPrev={handlePrev}
        onStart={() => handleComplete("AuthWelcome")}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default OnboardingScreen;
