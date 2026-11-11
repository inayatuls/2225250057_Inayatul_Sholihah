import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ModelError, describeModel, fmt, solveModel } from './engine';

const FIX = resolve(__dirname, '../../../../../shared/model-fixtures');

interface Case {
  name: string;
  model: unknown;
  result?: unknown;
  error?: string;
}

const cases = JSON.parse(readFileSync(resolve(FIX, 'cases.json'), 'utf-8')) as Case[];
const golden = JSON.parse(readFileSync(resolve(FIX, 'golden.json'), 'utf-8')) as Record<
  string,
  { steps: unknown[]; describe: string }
>;

describe('mesin model TS = fixture bersama (identik dengan Python)', () => {
  for (const c of cases) {
    it(c.name, () => {
      if (c.error) {
        expect(() => solveModel(c.model)).toThrow(ModelError);
        expect(() => solveModel(c.model)).toThrow(c.error);
        expect(describeModel(c.model)).toBe('Model belum lengkap');
        return;
      }
      const out = solveModel(c.model);
      expect(out.result).toEqual(c.result);
      expect(out.steps).toEqual(golden[c.name].steps);
      expect(describeModel(c.model)).toBe(golden[c.name].describe);
    });
  }
});

describe('fmt', () => {
  it.each([
    [0, '0'],
    [1000, '1.000'],
    [-3, '−3'],
    [2.5, '2,5'],
    [5.625, '5,63'],
    [480000, '480.000'],
    [-0.001, '0'],
  ])('fmt(%s) = %s', (v, s) => {
    expect(fmt(v)).toBe(s);
  });
});
