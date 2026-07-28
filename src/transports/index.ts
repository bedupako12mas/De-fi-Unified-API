import { CHAIN_CONFIG } from './chains.js'
import { createEvmClient } from './evm.js'
import { ServerError } from '../errors.js'
import type { PublicClient } from 'viem'

// lazy — built on first use so dotenv has loaded by then
let _transports: Record<string, PublicClient> | null = null

function buildTransports(): Record<string, PublicClient> {
  const result: Record<string, PublicClient> = {}
  for (const [network, config] of Object.entries(CHAIN_CONFIG)) {
    const rpcUrl = process.env[config.rpcEnvVar]
    if (!rpcUrl) throw new Error(
      `Missing env var: ${config.rpcEnvVar} for network ${network}`
    )
    result[network] = createEvmClient(config.chain, rpcUrl)
  }
  return result
}

function transports(): Record<string, PublicClient> {
  if (!_transports) _transports = buildTransports()
  return _transports
}

export function getTransport(network: string): PublicClient {
  const transport = transports()[network]
  if (!transport) throw new ServerError(
    'UNSUPPORTED_NETWORK',
    `${network} is not supported`
  )
  return transport
}

export function listNetworks(): string[] {
  return Object.keys(transports())
}
