import React from "react";
import { OnboardingScreen } from "../../screens/OnboardingScreen";
import { OnboardingSlide } from "./OnboardingSlide";
import { PaginationDots } from "./PaginationDots";
import { onboardingSlidesEs } from "../../i18n/onboardingContent";

export default {
  title: "Components/Onboarding",
  component: OnboardingScreen,
};

export const FullOnboardingFlow = () => (
  <OnboardingScreen
    onFinishOnboarding={(route) =>
      console.log("Finished onboarding to:", route)
    }
  />
);

export const SinglePlatformSlide = () => (
  <OnboardingSlide item={onboardingSlidesEs[0]} width={375} height={812} />
);

export const SingleClientSlide = () => (
  <OnboardingSlide item={onboardingSlidesEs[1]} width={375} height={812} />
);

export const SingleWorkerSlide = () => (
  <OnboardingSlide item={onboardingSlidesEs[2]} width={375} height={812} />
);

export const PaginationDotsActiveFirst = () => (
  <PaginationDots total={4} currentIndex={0} />
);

export const PaginationDotsActiveThird = () => (
  <PaginationDots total={4} currentIndex={2} />
);
