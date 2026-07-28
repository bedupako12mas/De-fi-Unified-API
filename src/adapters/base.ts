import { AdapterError, ServerError } from '../errors.js'
import { validateParams }            from '../validation.js'
import { getTransport }              from '../transports/index.js'
import type { PublicClient }         from 'viem'
import type { Result, Schema, ContractSchema, AdapterSchema } from './types.js'

// ─── BaseContract ────────────────────────────────────────────────────────────
// Mirrors one deployed smart contract.
// Concrete subclasses declare the ABI, addresses per network, schemas per
// function, and implement each read function as a method.

export abstract class BaseContract {
  abstract readonly abi:     unknown
  abstract readonly schemas: Record<string, Schema>
  abstract getAddress(network: string): `0x${string}`

  async execute(
    fn:      string,
    network: string,
    params:  Record<string, unknown>
  ): Promise<Result> {
    const schema = this.schemas[fn]
    if (!schema) throw new AdapterError(
      'UNSUPPORTED_ACTION',
      `${this.constructor.name} does not have function ${fn}`
    )

    validateParams(params, schema.required ?? [])

    const method = (this as any)[fn]
    if (typeof method !== 'function') throw new AdapterError(
      'UNSUPPORTED_ACTION',
      `${this.constructor.name}.${fn} is not implemented`
    )

    const client = getTransport(network) as PublicClient
    return method.call(this, client, network, params)
  }

  getSchema(): ContractSchema {
    return this.schemas
  }
}

// ─── BaseAdapter ─────────────────────────────────────────────────────────────
// Represents one protocol version (e.g. Uniswap V3, Aave V3).
// Concrete subclasses register their contracts in the constructor and declare
// which networks the protocol is deployed on.

export abstract class BaseAdapter {
  private readonly _contracts: Record<string, BaseContract> = {}

  protected registerContract(name: string, contract: BaseContract): void {
    this._contracts[name] = contract
  }

  getContract(name: string): BaseContract {
    const contract = this._contracts[name]
    if (!contract) throw new ServerError(
      'UNKNOWN_CONTRACT',
      `${name} not found`
    )
    return contract
  }

  listContracts(): string[] {
    return Object.keys(this._contracts)
  }

  getSchema(): AdapterSchema {
    return Object.fromEntries(
      Object.entries(this._contracts).map(([name, contract]) => [
        name,
        contract.getSchema()
      ])
    )
  }

  abstract supportedNetworks(): string[]
}
