import { createPublicClient, http } from 'viem'
import type { Chain, PublicClient } from 'viem'

export function createEvmClient(chain: Chain, rpcUrl: string): PublicClient {
  return createPublicClient({
    chain,
    transport: http(rpcUrl)
  })
}
