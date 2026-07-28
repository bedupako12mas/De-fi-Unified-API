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
  },
  quoteExactInput: {
    required:    ['tokens', 'fees', 'amountIn'],
    description: 'Get output amount for exact input multi-hop swap. tokens and fees are comma-separated (tokens.length = fees.length + 1)'
  },
  quoteExactOutput: {
    required:    ['tokens', 'fees', 'amountOut'],
    description: 'Get input amount required for exact output multi-hop swap. tokens and fees in swap direction (tokenIn to tokenOut); path is reversed internally'
  }
}
