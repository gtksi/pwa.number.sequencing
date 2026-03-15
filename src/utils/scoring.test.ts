import { expect, test } from 'vitest';
import { calculateFluencyScore, calculatePercentile } from './scoring';

test('calculateFluencyScore', () => {
  expect(calculateFluencyScore(5.0, 5.0, 0)).toBe(100);
  expect(calculateFluencyScore(4.0, 5.0, 0)).toBe(100);
  expect(calculateFluencyScore(6.0, 5.0, 0)).toBe(95);
  expect(calculateFluencyScore(5.0, 5.0, 1)).toBe(85);
});

test('calculatePercentile', () => {
  expect(calculatePercentile(120, 550)).toBe(90);
  expect(calculatePercentile(120, 250)).toBe(25);
  expect(calculatePercentile(120, 10)).toBe(10);
});
