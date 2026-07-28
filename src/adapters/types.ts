export type Result = Record<string, unknown>

export interface Schema {
  required:    string[]
  optional?:   string[]
  description: string
}

export type ContractSchema = Record<string, Schema>
export type AdapterSchema  = Record<string, ContractSchema>
