import { describe, expect, it } from 'vitest';
import { isOnLine, lineRelation, parseNum, regionOf } from './coords';

describe('regionOf', () => {
  it('menentukan kuadran dan sumbu', () => {
    expect(regionOf(3, 2)).toBe('I');
    expect(regionOf(-3, 2)).toBe('II');
    expect(regionOf(-3, -2)).toBe('III');
    expect(regionOf(3, -2)).toBe('IV');
    expect(regionOf(0, 5)).toBe('y-axis');
    expect(regionOf(5, 0)).toBe('x-axis');
    expect(regionOf(0, 0)).toBe('origin');
  });
});

describe('isOnLine', () => {
  it('garis mendatar, tegak, dan miring', () => {
    expect(isOnLine([7, 1], [-2, 1], [3, 1])).toBe(true);
    expect(isOnLine([2, 8], [2, -3], [2, 4])).toBe(true);
    expect(isOnLine([1, 1], [0, 0], [3, 3])).toBe(true);
    expect(isOnLine([1, 2], [0, 0], [3, 3])).toBe(false);
  });
});

describe('lineRelation', () => {
  it('menjelaskan posisi garis', () => {
    expect(lineRelation([-2, 1], [3, 1])).toContain('sejajar sumbu X');
    expect(lineRelation([2, 1], [2, 5])).toContain('sejajar sumbu Y');
  });
});

describe('parseNum', () => {
  it('menerima minus unicode dan koma', () => {
    expect(parseNum('−3')).toBe(-3);
    expect(parseNum('2,5')).toBe(2.5);
    expect(parseNum('-')).toBeNull();
    expect(parseNum('abc')).toBeNull();
  });
});
