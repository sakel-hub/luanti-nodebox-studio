import { describe, it, expect } from 'vitest';
import {
  gcd,
  simplifyFraction,
  formatCoordinate,
  parseCoordinateString,
  floatToGridStep,
  gridStepToFloat
} from './fraction.utils';

describe('Fraction Utilities', () => {
  it('calculates greatest common divisor correctly', () => {
    expect(gcd(16, 8)).toBe(8);
    expect(gcd(8, 16)).toBe(8);
    expect(gcd(12, 18)).toBe(6);
    expect(gcd(7, 13)).toBe(1);
    expect(gcd(-8, 16)).toBe(8);
  });

  it('simplifies fractions properly', () => {
    expect(simplifyFraction(8, 16)).toEqual({ num: 1, den: 2 });
    expect(simplifyFraction(-8, 16)).toEqual({ num: -1, den: 2 });
    expect(simplifyFraction(0, 16)).toEqual({ num: 0, den: 1 });
    expect(simplifyFraction(5, 16)).toEqual({ num: 5, den: 16 });
    expect(simplifyFraction(16, 8)).toEqual({ num: 2, den: 1 });
  });

  it('converts float to grid steps and back', () => {
    expect(floatToGridStep(-0.5, 16)).toBe(-8);
    expect(floatToGridStep(0.5, 16)).toBe(8);
    expect(floatToGridStep(0.0625, 16)).toBe(1);

    expect(gridStepToFloat(-8, 16)).toBe(-0.5);
    expect(gridStepToFloat(8, 16)).toBe(0.5);
    expect(gridStepToFloat(1, 16)).toBe(0.0625);
  });

  it('formats coordinates in 16ths format', () => {
    expect(formatCoordinate(-0.5, 'fractions_16')).toBe('-8/16');
    expect(formatCoordinate(0.5, 'fractions_16')).toBe('8/16');
    expect(formatCoordinate(0, 'fractions_16')).toBe('0');
    expect(formatCoordinate(-0.3125, 'fractions_16')).toBe('-5/16');
  });

  it('formats coordinates in divisible 16/8 format', () => {
    // -0.5 is -8/16, divisible by 2 -> -4/8
    expect(formatCoordinate(-0.5, 'divisible_16_8')).toBe('-4/8');
    // -0.25 is -4/16 -> -2/8
    expect(formatCoordinate(-0.25, 'divisible_16_8')).toBe('-2/8');
    // -0.3125 is -5/16 (odd numerator, stays /16)
    expect(formatCoordinate(-0.3125, 'divisible_16_8')).toBe('-5/16');
  });

  it('formats coordinates in simplified fractions', () => {
    expect(formatCoordinate(-0.5, 'fractions_simplified')).toBe('-1/2');
    expect(formatCoordinate(0.25, 'fractions_simplified')).toBe('1/4');
    expect(formatCoordinate(0.125, 'fractions_simplified')).toBe('1/8');
    expect(formatCoordinate(-0.3125, 'fractions_simplified')).toBe('-5/16');
  });

  it('formats coordinates in decimals', () => {
    expect(formatCoordinate(-0.5, 'decimals')).toBe('-0.5');
    expect(formatCoordinate(0.5, 'decimals')).toBe('0.5');
    expect(formatCoordinate(-0.3125, 'decimals')).toBe('-0.3125');
  });

  it('parses fraction and float strings accurately', () => {
    expect(parseCoordinateString('-8/16')).toBe(-0.5);
    expect(parseCoordinateString(' 8 / 16 ')).toBe(0.5);
    expect(parseCoordinateString('16/8')).toBe(2);
    expect(parseCoordinateString('-4/8')).toBe(-0.5);
    expect(parseCoordinateString('-0.5')).toBe(-0.5);
    expect(parseCoordinateString('0')).toBe(0);
    expect(parseCoordinateString('invalid', 0.25)).toBe(0.25);
  });
});
