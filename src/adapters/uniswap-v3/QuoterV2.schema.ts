import type { Schema } from '../types.js'
import {
  ADDRESS_PATTERN,
  UINT_PATTERN,
  ADDRESS_LIST_PATTERN,
  UINT_LIST_PATTERN
} from '../types.js'

export const QUOTER_V2_SCHEMA: Record<string, Schema> = {
  quoteExactInputSingle: {
    required:    ['tokenIn', 'tokenOut', 'fee', 'amountIn'],
    optional:    ['sqrtPriceLimitX96'],
    properties: {
      tokenIn:           { type: 'string', pattern: ADDRESS_PATTERN },
      tokenOut:          { type: 'string', pattern: ADDRESS_PATTERN },
      fee:               { type: 'string', pattern: UINT_PATTERN },
      amountIn:          { type: 'string', pattern: UINT_PATTERN },
      sqrtPriceLimitX96: { type: 'string', pattern: UINT_PATTERN }
    },
    description: 'Get output amount for exact input single pool swap'
  },
  quoteExactOutputSingle: {
    required:    ['tokenIn', 'tokenOut', 'fee', 'amountOut'],
    optional:    ['sqrtPriceLimitX96'],
    properties: {
      tokenIn:           { type: 'string', pattern: ADDRESS_PATTERN },
      tokenOut:          { type: 'string', pattern: ADDRESS_PATTERN },
      fee:               { type: 'string', pattern: UINT_PATTERN },
      amountOut:         { type: 'string', pattern: UINT_PATTERN },
      sqrtPriceLimitX96: { type: 'string', pattern: UINT_PATTERN }
    },
    description: 'Get input amount required for exact output single pool swap'
  },
  quoteExactInput: {
    required:    ['tokens', 'fees', 'amountIn'],
    properties: {
      tokens:   { type: 'string', pattern: ADDRESS_LIST_PATTERN },
      fees:     { type: 'string', pattern: UINT_LIST_PATTERN },
      amountIn: { type: 'string', pattern: UINT_PATTERN }
    },
    description: 'Get output amount for exact input multi-hop swap. tokens and fees are comma-separated (tokens.length = fees.length + 1)'
  },
  quoteExactOutput: {
    required:    ['tokens', 'fees', 'amountOut'],
    properties: {
      tokens:    { type: 'string', pattern: ADDRESS_LIST_PATTERN },
      fees:      { type: 'string', pattern: UINT_LIST_PATTERN },
      amountOut: { type: 'string', pattern: UINT_PATTERN }
    },
    description: 'Get input amount required for exact output multi-hop swap. tokens and fees in swap direction (tokenIn to tokenOut); path is reversed internally'
  }
}
