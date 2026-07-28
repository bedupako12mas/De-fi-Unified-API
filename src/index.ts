import 'dotenv/config'
import Fastify from 'fastify'
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { AppError, ServerError, TransportError } from './errors.js'
import { validateParams } from './validation.js'

// Compile-time constants
const QUOTER_V2_ADDRESS = '0x61fFE014bA17989E743c5F6cB21bF9697530B21e' as const

const QUOTER_V2_ABI = [
  {
    name:            'quoteExactInputSingle',
    type:            'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn',           type: 'address' },
          { name: 'tokenOut',          type: 'address' },
          { name: 'amountIn',          type: 'uint256' },
          { name: 'fee',               type: 'uint24'  },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ]
      }
    ],
    outputs: [
      { name: 'amountOut',               type: 'uint256' },
      { name: 'sqrtPriceX96After',       type: 'uint160' },
      { name: 'initializedTicksCrossed', type: 'uint32'  },
      { name: 'gasEstimate',             type: 'uint256' },
    ]
  }
] as const

// Viem setup
const client = createPublicClient({ 
  chain: mainnet, 
  transport: http(process.env.ETH_RPC_URL), 
}) 

// Fastify server setup
const engine = Fastify({
  logger: true
});

engine.post('/api/v1/query', async (request, reply) => {
  const body = request.body as {
    protocol: string
    action:   string
    network:  string
    params:   Record<string, unknown>
  }

  if (!body.protocol || !body.action || !body.network || !body.params) {
    reply.code(400)
    return new ServerError('INVALID_REQUEST', 'missing required fields: protocol, action, network, params').toJSON()
  }

  try {
    validateParams(body.params, ['tokenIn', 'tokenOut', 'fee', 'amountIn'])

    const { result } = await client.simulateContract({
      address:      QUOTER_V2_ADDRESS,
      abi:          QUOTER_V2_ABI,
      functionName: 'quoteExactInputSingle',
      args: [{
        tokenIn:           body.params.tokenIn as `0x${string}`,
        tokenOut:          body.params.tokenOut as `0x${string}`,
        amountIn:          BigInt(body.params.amountIn as string),
        fee:               body.params.fee as number,
        sqrtPriceLimitX96: 0n
      }]
    })

    return { data: { amountOut: result[0].toString() } }

  } catch (err) {
    if (err instanceof AppError) {
      reply.code(err.statusCode)
      return err.toJSON()
    }
    reply.code(502)
    return new TransportError('CHAIN_ERROR', 'QuoterV2 call failed', err).toJSON()
  }
})


/**
 * Run the server!
 */
const start = async () => {
  try {
    await engine.listen({ port: 3000 })
  } catch (err) {
    engine.log.error(err)
    process.exit(1)
  }
}
start()

