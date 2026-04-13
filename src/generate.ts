import { optimize } from 'svgo';
import { generateSvg } from './svg';
import type { LogoProduct } from './config';

export interface GenerateResult {
  rawSvg: string;
  optimizedSvg: string;
}

export async function generateProduct(product: LogoProduct): Promise<GenerateResult> {
  const rawSvg = generateSvg(product);
  const result = optimize(rawSvg, {
    plugins: ['preset-default'],
  });
  return {
    rawSvg,
    optimizedSvg: result.data,
  };
}
