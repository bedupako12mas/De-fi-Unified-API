import { BaseContract }      from '../base.js'
import { POOL_SCHEMA }       from './Pool.schema.js'
import { AAVE_V3_CONFIG }    from './config.js'
import { AdapterError }      from '../../errors.js'
import type { PublicClient } from 'viem'
import type { Result }       from '../types.js'

const POOL_ABI = [
  {
    name:            'getUserAccountData',
    type:            'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'totalCollateralBase',         type: 'uint256' },
      { name: 'totalDebtBase',               type: 'uint256' },
      { name: 'availableBorrowsBase',        type: 'uint256' },
      { name: 'currentLiquidationThreshold', type: 'uint256' },
      { name: 'ltv',                         type: 'uint256' },
      { name: 'healthFactor',                type: 'uint256' },
    ]
  },
  {
    name:            'getReserveData',
    type:            'function',
    stateMutability: 'view',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [{
      name: 'reserveData', type: 'tuple',
      components: [
        { name: 'configuration', type: 'tuple',
          components: [{ name: 'data', type: 'uint256' }] },
        { name: 'liquidityIndex',              type: 'uint128' },
        { name: 'currentLiquidityRate',        type: 'uint128' },
        { name: 'variableBorrowIndex',         type: 'uint128' },
        { name: 'currentVariableBorrowRate',   type: 'uint128' },
        { name: 'currentStableBorrowRate',     type: 'uint128' },
        { name: 'lastUpdateTimestamp',         type: 'uint40'  },
        { name: 'id',                          type: 'uint16'  },
        { name: 'aTokenAddress',               type: 'address' },
        { name: 'stableDebtTokenAddress',      type: 'address' },
        { name: 'variableDebtTokenAddress',    type: 'address' },
        { name: 'interestRateStrategyAddress', type: 'address' },
        { name: 'accruedToTreasury',           type: 'uint128' },
        { name: 'unbacked',                    type: 'uint128' },
        { name: 'isolationModeTotalDebt',      type: 'uint128' },
      ]
    }]
  }
] as const

export class AaveV3Pool extends BaseContract {
  readonly abi     = POOL_ABI
  readonly schemas = POOL_SCHEMA

  getAddress(network: string): `0x${string}` {
    const config = AAVE_V3_CONFIG[network]
    if (!config?.pool) throw new AdapterError(
      'UNSUPPORTED_NETWORK',
      `Aave V3 Pool not deployed on ${network}`
    )
    return config.pool
  }

  async getUserAccountData(
    client:  PublicClient,
    network: string,
    params:  Record<string, unknown>
  ): Promise<Result> {
    const result = await client.readContract({
      address:      this.getAddress(network),
      abi:          this.abi,
      functionName: 'getUserAccountData',
      args:         [params.user as `0x${string}`]
    })

    return {
      totalCollateralBase:         result[0].toString(),
      totalDebtBase:               result[1].toString(),
      availableBorrowsBase:        result[2].toString(),
      currentLiquidationThreshold: result[3].toString(),
      ltv:                         result[4].toString(),
      healthFactor:                result[5].toString()
    }
  }

  async getReserveData(
    client:  PublicClient,
    network: string,
    params:  Record<string, unknown>
  ): Promise<Result> {
    const result = await client.readContract({
      address:      this.getAddress(network),
      abi:          this.abi,
      functionName: 'getReserveData',
      args:         [params.asset as `0x${string}`]
    })

    return {
      configuration:               result.configuration.data.toString(),
      liquidityIndex:              result.liquidityIndex.toString(),
      currentLiquidityRate:        result.currentLiquidityRate.toString(),
      variableBorrowIndex:         result.variableBorrowIndex.toString(),
      currentVariableBorrowRate:   result.currentVariableBorrowRate.toString(),
      currentStableBorrowRate:     result.currentStableBorrowRate.toString(),
      lastUpdateTimestamp:         result.lastUpdateTimestamp.toString(),
      id:                          result.id.toString(),
      aTokenAddress:               result.aTokenAddress,
      stableDebtTokenAddress:      result.stableDebtTokenAddress,
      variableDebtTokenAddress:    result.variableDebtTokenAddress,
      interestRateStrategyAddress: result.interestRateStrategyAddress,
      accruedToTreasury:           result.accruedToTreasury.toString(),
      unbacked:                    result.unbacked.toString(),
      isolationModeTotalDebt:      result.isolationModeTotalDebt.toString()
    }
  }
}
