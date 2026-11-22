import { formatRating, ratingStars, formatReviewDate } from '../../src/utils/rating';

describe('formatRating', () => {
  it('converts a decimal rating to es-AR format', () => {
    expect(formatRating('4.5')).toBe('4,5');
    expect(formatRating('4.0')).toBe('4,0');
    expect(formatRating(5)).toBe('5,0');
  });

  it('returns null for missing or invalid values', () => {
    expect(formatRating(null)).toBeNull();
    expect(formatRating(undefined)).toBeNull();
    expect(formatRating('')).toBeNull();
    expect(formatRating('abc')).toBeNull();
  });
});

describe('ratingStars', () => {
  it('returns the number of filled stars rounded', () => {
    expect(ratingStars(4.5)).toBe(5);
    expect(ratingStars(4.4)).toBe(4);
    expect(ratingStars(0)).toBe(0);
    expect(ratingStars(5)).toBe(5);
  });

  it('clamps to 0-5 and returns 0 for invalid values', () => {
    expect(ratingStars(null)).toBe(0);
    expect(ratingStars(undefined)).toBe(0);
    expect(ratingStars(-1)).toBe(0);
    expect(ratingStars(10)).toBe(5);
    expect(ratingStars('abc' as unknown as number)).toBe(0);
  });
});

describe('formatReviewDate', () => {
  it('formats an ISO date to dd/MM/yyyy', () => {
    expect(formatReviewDate('2026-11-20T10:00:00Z')).toBe('20/11/2026');
  });

  it('returns empty string for missing or invalid dates', () => {
    expect(formatReviewDate(null)).toBe('');
    expect(formatReviewDate(undefined)).toBe('');
    expect(formatReviewDate('')).toBe('');
    expect(formatReviewDate('not-a-date')).toBe('');
  });
});
