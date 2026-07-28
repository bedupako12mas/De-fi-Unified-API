import { BaseContract }       from '../base.js'
import { QUOTER_V2_SCHEMA }   from './QuoterV2.schema.js'
import { UNISWAP_V3_CONFIG }  from './config.js'
import { AdapterError }       from '../../errors.js'
import { encodePacked }       from 'viem'
import type { PublicClient }  from 'viem'
import type { Result }        from '../types.js'

// takes comma-separated string OR array, returns array of strings
function toArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String)
  if (typeof v === 'string') return v.split(',').map(s => s.trim())
  throw new AdapterError('INVALID_PARAMS', 'expected array or comma-separated string')
}

// builds Uniswap V3 packed path bytes: tokenA + fee + tokenB + fee + tokenC
function buildPath(tokens: string[], fees: string[]): `0x${string}` {
  if (tokens.length !== fees.length + 1) {
    throw new AdapterError(
      'INVALID_PARAMS',
      `tokens.length must equal fees.length + 1 (got ${tokens.length} tokens, ${fees.length} fees)`
    )
  }

  const types:  string[]  = []
  const values: unknown[] = []

  tokens.forEach((token, i) => {
    types.push('address')
    values.push(token as `0x${string}`)
    if (i < fees.length) {
      types.push('uint24')
      values.push(Number(fees[i]))
    }
  })

  return encodePacked(types as any, values as any)
}

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
  },
  {
    name:            'quoteExactInput',
    type:            'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'path',     type: 'bytes'   },
      { name: 'amountIn', type: 'uint256' },
    ],
    outputs: [
      { name: 'amountOut',                   type: 'uint256'   },
      { name: 'sqrtPriceX96AfterList',       type: 'uint160[]' },
      { name: 'initializedTicksCrossedList', type: 'uint32[]'  },
      { name: 'gasEstimate',                 type: 'uint256'   },
    ]
  },
  {
    name:            'quoteExactOutput',
    type:            'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'path',      type: 'bytes'   },
      { name: 'amountOut', type: 'uint256' },
    ],
    outputs: [
      { name: 'amountIn',                    type: 'uint256'   },
      { name: 'sqrtPriceX96AfterList',       type: 'uint160[]' },
      { name: 'initializedTicksCrossedList', type: 'uint32[]'  },
      { name: 'gasEstimate',                 type: 'uint256'   },
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

  async quoteExactInput(
    client:  PublicClient,
    network: string,
    params:  Record<string, unknown>
  ): Promise<Result> {
    const tokens = toArray(params.tokens)
    const fees   = toArray(params.fees)
    const path   = buildPath(tokens, fees)

    const { result } = await client.simulateContract({
      address:      this.getAddress(network),
      abi:          this.abi,
      functionName: 'quoteExactInput',
      args:         [path, BigInt(params.amountIn as string)]
    })

    return {
      amountOut:                   result[0].toString(),
      sqrtPriceX96AfterList:       (result[1] as readonly bigint[]).map(v => v.toString()),
      initializedTicksCrossedList: (result[2] as readonly number[]).map(v => v.toString()),
      gasEstimate:                 result[3].toString()
    }
  }

  async quoteExactOutput(
    client:  PublicClient,
    network: string,
    params:  Record<string, unknown>
  ): Promise<Result> {
    // Uniswap expects the path in reverse order for exactOutput.
    // Client sends tokens in swap direction (tokenIn -> ... -> tokenOut);
    // we reverse both tokens and fees before packing.
    const tokens = toArray(params.tokens).reverse()
    const fees   = toArray(params.fees).reverse()
    const path   = buildPath(tokens, fees)

    const { result } = await client.simulateContract({
      address:      this.getAddress(network),
      abi:          this.abi,
      functionName: 'quoteExactOutput',
      args:         [path, BigInt(params.amountOut as string)]
    })

    return {
      amountIn:                    result[0].toString(),
      sqrtPriceX96AfterList:       (result[1] as readonly bigint[]).map(v => v.toString()),
      initializedTicksCrossedList: (result[2] as readonly number[]).map(v => v.toString()),
      gasEstimate:                 result[3].toString()
    }
  }
}
