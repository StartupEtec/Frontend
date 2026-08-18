/**
 * TypeScript Interfaces for Onboarding Module
 */

export interface OnboardingSlideData {
  id: string;
  badgeText: string;
  badgeColor: string;
  title: string;
  highlightText?: string;
  description: string;
  iconName: string;
  svgPlaceholderType: "platform" | "client" | "worker" | "welcome";
}

export interface UseOnboardingReturn {
  currentIndex: number;
  isLastSlide: boolean;
  isFirstSlide: boolean;
  slides: OnboardingSlideData[];
  isLoading: boolean;
  handleNext: () => void;
  handlePrev: () => void;
  handleSkip: () => Promise<void>;
  handleComplete: (
    targetRoute?: "AuthWelcome" | "Register" | "Login",
  ) => Promise<void>;
  handleScrollEnd: (index: number) => void;
}

export interface OnboardingSlideProps {
  item: OnboardingSlideData;
  width: number;
  height: number;
}

export interface PaginationDotsProps {
  total: number;
  currentIndex: number;
}

export interface OnboardingHeaderProps {
  onSkip: () => void;
  showSkip: boolean;
}

export interface OnboardingFooterProps {
  currentIndex: number;
  totalSlides: number;
  onNext: () => void;
  onPrev: () => void;
  onStart: () => void;
}

export interface OnboardingScreenProps {
  onFinishOnboarding?: (
    route: "AuthWelcome" | "Register" | "Login" | "Main",
  ) => void;
}
