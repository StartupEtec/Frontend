import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UseOnboardingReturn } from "../types/onboarding";
import {
  onboardingSlidesEs,
  ASYNC_STORAGE_ONBOARDING_KEY,
} from "../i18n/onboardingContent";

export const useOnboarding = (
  onFinish?: (route: "AuthWelcome" | "Register" | "Login" | "Main") => void,
): UseOnboardingReturn => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize loading state on mount if needed
  useEffect(() => {
    setIsLoading(false);
  }, []);

  const totalSlides = onboardingSlidesEs.length;
  const isLastSlide = currentIndex === totalSlides - 1;
  const isFirstSlide = currentIndex === 0;

  const markOnboardingCompleted = async () => {
    try {
      await AsyncStorage.setItem(ASYNC_STORAGE_ONBOARDING_KEY, "true");
    } catch (error) {
      console.error("Error saving onboarding status to AsyncStorage:", error);
    }
  };

  const handleNext = useCallback(() => {
    if (currentIndex < totalSlides - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, totalSlides]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const handleSkip = useCallback(async () => {
    await markOnboardingCompleted();
    if (onFinish) {
      onFinish("AuthWelcome");
    }
  }, [onFinish]);

  const handleComplete = useCallback(
    async (
      targetRoute: "AuthWelcome" | "Register" | "Login" = "AuthWelcome",
    ) => {
      await markOnboardingCompleted();
      if (onFinish) {
        onFinish(targetRoute);
      }
    },
    [onFinish],
  );

  const handleScrollEnd = useCallback(
    (index: number) => {
      if (index >= 0 && index < totalSlides) {
        setCurrentIndex(index);
      }
    },
    [totalSlides],
  );

  return {
    currentIndex,
    isLastSlide,
    isFirstSlide,
    slides: onboardingSlidesEs,
    isLoading,
    handleNext,
    handlePrev,
    handleSkip,
    handleComplete,
    handleScrollEnd,
  };
};
