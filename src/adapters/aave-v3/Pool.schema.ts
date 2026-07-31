import type { Schema } from '../types.js'

export const POOL_SCHEMA: Record<string, Schema> = {
  getUserAccountData: {
    required:    ['user'],
    description: 'Aggregated position for a user: collateral, debt, borrow capacity, health factor. Amounts in base currency (USD, 8 decimals); healthFactor in wad (1e18)'
  },
  getReserveData: {
    required:    ['asset'],
    description: 'Reserve state for an asset: supply/borrow rates and indexes (ray, 1e27), aToken/debtToken addresses'
  }
}
