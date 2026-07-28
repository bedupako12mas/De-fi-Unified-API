import type { Schema } from '../types.js'

export const QUOTER_V2_SCHEMA: Record<string, Schema> = {
  quoteExactInputSingle: {
    required:    ['tokenIn', 'tokenOut', 'fee', 'amountIn'],
    optional:    ['sqrtPriceLimitX96'],
    description: 'Get output amount for exact input single pool swap'
  },
  quoteExactOutputSingle: {
    required:    ['tokenIn', 'tokenOut', 'fee', 'amountOut'],
    optional:    ['sqrtPriceLimitX96'],
    description: 'Get input amount required for exact output single pool swap'
  }
}
