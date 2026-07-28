import { mainnet } from 'viem/chains'
import type { PublicClient } from 'viem'
import { createEvmClient } from './evm.js'
import { ServerError } from '../errors.js'

const transports: Record<string, PublicClient> = {
  'ethereum-mainnet': createEvmClient(mainnet, process.env.ETH_RPC_URL!)
}

export function getTransport(network: string): PublicClient {
  const transport = transports[network]
  if (!transport) {
    throw new ServerError('UNSUPPORTED_NETWORK', `${network} is not supported`)
  }
  return transport
}

export function listNetworks(): string[] {
  return Object.keys(transports)
}
