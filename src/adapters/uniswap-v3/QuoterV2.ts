import { BaseContract }       from '../base.js'
import { QUOTER_V2_SCHEMA }   from './QuoterV2.schema.js'
import { UNISWAP_V3_CONFIG }  from './config.js'
import { AdapterError }       from '../../errors.js'
import type { PublicClient }  from 'viem'
import type { Result }        from '../types.js'

const QUOTER_V2_ABI = [
  {
    name:            'quoteExactInputSingle',
    type:            'function',
    stateMutability: 'nonpayable',
    inputs: [{
      name: 'params', type: 'tuple',
      components: [
        { name: 'tokenIn',           type: 'address' },
        { name: 'tokenOut',          type: 'address' },
        { name: 'amountIn',          type: 'uint256' },
        { name: 'fee',               type: 'uint24'  },
        { name: 'sqrtPriceLimitX96', type: 'uint160' },
      ]
    }],
    outputs: [
      { name: 'amountOut',               type: 'uint256' },
      { name: 'sqrtPriceX96After',       type: 'uint160' },
      { name: 'initializedTicksCrossed', type: 'uint32'  },
      { name: 'gasEstimate',             type: 'uint256' },
    ]
  },
  {
    name:            'quoteExactOutputSingle',
    type:            'function',
    stateMutability: 'nonpayable',
    inputs: [{
      name: 'params', type: 'tuple',
      components: [
        { name: 'tokenIn',           type: 'address' },
        { name: 'tokenOut',          type: 'address' },
        { name: 'amount',            type: 'uint256' },
        { name: 'fee',               type: 'uint24'  },
        { name: 'sqrtPriceLimitX96', type: 'uint160' },
      ]
    }],
    outputs: [
      { name: 'amountIn',                type: 'uint256' },
      { name: 'sqrtPriceX96After',       type: 'uint160' },
      { name: 'initializedTicksCrossed', type: 'uint32'  },
      { name: 'gasEstimate',             type: 'uint256' },
    ]
  }
] as const

export class UniswapV3QuoterV2 extends BaseContract {
  readonly abi     = QUOTER_V2_ABI
  readonly schemas = QUOTER_V2_SCHEMA

  getAddress(network: string): `0x${string}` {
    const config = UNISWAP_V3_CONFIG[network]
    if (!config?.quoterV2) throw new AdapterError(
      'UNSUPPORTED_NETWORK',
      `QuoterV2 not deployed on ${network}`
    )
    return config.quoterV2
  }

  async quoteExactInputSingle(
    client:  PublicClient,
    network: string,
    params:  Record<string, unknown>
  ): Promise<Result> {
    const { result } = await client.simulateContract({
      address:      this.getAddress(network),
      abi:          this.abi,
      functionName: 'quoteExactInputSingle',
      args: [{
        tokenIn:           params.tokenIn           as `0x${string}`,
        tokenOut:          params.tokenOut          as `0x${string}`,
        amountIn:          BigInt(params.amountIn   as string),
        fee:               Number(params.fee),
        sqrtPriceLimitX96: params.sqrtPriceLimitX96
          ? BigInt(params.sqrtPriceLimitX96 as string)
          : 0n
      }]
    })

    return {
      amountOut:               result[0].toString(),
      sqrtPriceX96After:       result[1].toString(),
      initializedTicksCrossed: result[2].toString(),
      gasEstimate:             result[3].toString()
    }
  }

  async quoteExactOutputSingle(
    client:  PublicClient,
    network: string,
    params:  Record<string, unknown>
  ): Promise<Result> {
    const { result } = await client.simulateContract({
      address:      this.getAddress(network),
      abi:          this.abi,
      functionName: 'quoteExactOutputSingle',
      args: [{
        tokenIn:           params.tokenIn           as `0x${string}`,
        tokenOut:          params.tokenOut          as `0x${string}`,
        amount:            BigInt(params.amountOut  as string),
        fee:               Number(params.fee),
        sqrtPriceLimitX96: params.sqrtPriceLimitX96
          ? BigInt(params.sqrtPriceLimitX96 as string)
          : 0n
      }]
    })

    return {
      amountIn:                result[0].toString(),
      sqrtPriceX96After:       result[1].toString(),
      initializedTicksCrossed: result[2].toString(),
      gasEstimate:             result[3].toString()
    }
  }
}
