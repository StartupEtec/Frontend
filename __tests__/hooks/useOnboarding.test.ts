import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOnboarding } from '../../src/hooks/useOnboarding';
import { ASYNC_STORAGE_ONBOARDING_KEY } from '../../src/i18n/onboardingContent';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe('useOnboarding Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize at index 0 and with 4 slides', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    const { result } = renderHook(() => useOnboarding());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.currentIndex).toBe(0);
    expect(result.current.slides.length).toBe(4);
    expect(result.current.isFirstSlide).toBe(true);
    expect(result.current.isLastSlide).toBe(false);
  });

  it('should advance to next slide when handleNext is called', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    const { result } = renderHook(() => useOnboarding());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.handleNext();
    });

    expect(result.current.currentIndex).toBe(1);
    expect(result.current.isFirstSlide).toBe(false);
  });

  it('should save onboarding_completed = "true" on handleSkip', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    const mockOnFinish = jest.fn();
    const { result } = renderHook(() => useOnboarding(mockOnFinish));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.handleSkip();
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(ASYNC_STORAGE_ONBOARDING_KEY, 'true');
    expect(mockOnFinish).toHaveBeenCalledWith('Login');
  });

  it('should save onboarding_completed = "true" on handleComplete', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    const mockOnFinish = jest.fn();
    const { result } = renderHook(() => useOnboarding(mockOnFinish));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.handleComplete('Register');
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(ASYNC_STORAGE_ONBOARDING_KEY, 'true');
    expect(mockOnFinish).toHaveBeenCalledWith('Register');
  });
});
