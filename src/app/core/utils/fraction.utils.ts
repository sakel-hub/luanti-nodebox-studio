import { FractionFormat } from '../models/nodebox.model';

export function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b > 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  return a;
}

export function simplifyFraction(numerator: number, denominator: number): { num: number; den: number } {
  if (denominator === 0) return { num: numerator, den: 1 };
  if (numerator === 0) return { num: 0, den: 1 };

  const sign = (numerator < 0) !== (denominator < 0) ? -1 : 1;
  const absNum = Math.abs(Math.round(numerator));
  const absDen = Math.abs(Math.round(denominator));
  const divisor = gcd(absNum, absDen);

  return {
    num: sign * (absNum / divisor),
    den: absDen / divisor
  };
}

export function floatToGridStep(value: number, resolution = 16): number {
  return Math.round(value * resolution);
}

export function gridStepToFloat(step: number, resolution = 16): number {
  return step / resolution;
}

export function formatCoordinate(value: number, format: FractionFormat, baseResolution = 16): string {
  // Round to avoid IEEE 754 precision issues (e.g. 0.06250000000000006)
  const precision = 100000;
  const rounded = Math.round(value * precision) / precision;

  switch (format) {
    case 'decimals': {
      if (Object.is(rounded, -0) || rounded === 0) return '0.0';
      const str = rounded.toFixed(4);
      // Strip redundant trailing zeros after decimal point, keeping at least 1 decimal
      const clean = str.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '.0');
      return clean;
    }

    case 'grid_integers': {
      const step = floatToGridStep(value, baseResolution);
      return `${step}`;
    }

    case 'fractions_16': {
      const num16 = floatToGridStep(value, 16);
      if (num16 === 0) return '0';
      return `${num16}/16`;
    }

    case 'fractions_32': {
      const num32 = floatToGridStep(value, 32);
      if (num32 === 0) return '0';
      return `${num32}/32`;
    }

    case 'divisible_16_8': {
      // Prioritize expressing numbers as divisible fractions based on 16/8 relations
      const num16 = floatToGridStep(value, 16);
      if (num16 === 0) return '0';
      if (num16 % 2 === 0) {
        // Can be divided by 2 to yield /8 divisible
        const num8 = num16 / 2;
        return `${num8}/8`;
      }
      return `${num16}/16`;
    }

    case 'fractions_simplified':
    default: {
      const num64 = floatToGridStep(value, 64);
      if (num64 === 0) return '0';
      const { num, den } = simplifyFraction(num64, 64);
      if (den === 1) return `${num}`;
      return `${num}/${den}`;
    }
  }
}

export function parseCoordinateString(input: string, fallback = 0): number {
  if (!input || typeof input !== 'string') return fallback;
  const trimmed = input.trim();
  if (trimmed === '') return fallback;

  // Fraction format e.g. "-8/16", "5/16", "16/8", "+1/2"
  const fractionMatch = trimmed.match(/^([+-]?\d+(?:\.\d+)?)\s*\/\s*([+-]?\d+(?:\.\d+)?)$/);
  if (fractionMatch) {
    const num = parseFloat(fractionMatch[1]);
    const den = parseFloat(fractionMatch[2]);
    if (den !== 0 && !isNaN(num) && !isNaN(den)) {
      return num / den;
    }
  }

  // Pure decimal or integer
  const val = parseFloat(trimmed);
  return isNaN(val) ? fallback : val;
}
