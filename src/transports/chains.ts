import { mainnet } from 'viem/chains'
import type { Chain } from 'viem'

export interface ChainConfig {
  chain:     Chain
  rpcEnvVar: string
  type:      'evm'
}

export const CHAIN_CONFIG: Record<string, ChainConfig> = {
  'ethereum-mainnet': {
    chain:     mainnet,
    rpcEnvVar: 'ETH_RPC_URL',
    type:      'evm'
  }
}
