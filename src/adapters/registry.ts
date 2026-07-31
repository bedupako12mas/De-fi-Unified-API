import { UniswapV3Adapter } from './uniswap-v3/index.js'
import { AaveV3Adapter }    from './aave-v3/index.js'
import { ServerError }      from '../errors.js'
import { BaseAdapter }      from './base.js'

const adapters: Record<string, BaseAdapter> = {
  'uniswap-v3': new UniswapV3Adapter(),
  'aave-v3':    new AaveV3Adapter()
}

export function getAdapter(protocol: string): BaseAdapter {
  const adapter = adapters[protocol]
  if (!adapter) throw new ServerError(
    'UNKNOWN_PROTOCOL',
    `${protocol} is not supported`
  )
  return adapter
}

export function listProtocols(): string[] {
  return Object.keys(adapters)
}

export function buildSchema() {
  return Object.fromEntries(
    Object.entries(adapters).map(([protocol, adapter]) => [
      protocol,
      {
        networks:  adapter.supportedNetworks(),
        contracts: adapter.getSchema()
      }
    ])
  )
}

// runs once at startup — catches schema/method mismatches before any request
export function validateRegistry(): void {
  for (const [protocol, adapter] of Object.entries(adapters)) {
    for (const contractName of adapter.listContracts()) {
      const contract = adapter.getContract(contractName)
      for (const fn of Object.keys(contract.getSchema())) {
        if (typeof (contract as any)[fn] !== 'function') {
          throw new Error(
            `${protocol}/${contractName}/${fn}: schema declared but method missing`
          )
        }
      }
    }
  }
}
