export type Result = Record<string, unknown>

// query-string params always arrive as strings; pattern narrows to the shape
// a given field actually needs (address, uint, or a comma-separated list of either)
export interface ParamSpec {
  type:         'string'
  pattern?:     string
  description?: string
}

export interface Schema {
  required:    string[]
  optional?:   string[]
  properties?: Record<string, ParamSpec>
  description: string
}

export type ContractSchema = Record<string, Schema>
export type AdapterSchema  = Record<string, ContractSchema>

export const ADDRESS_PATTERN      = '^0x[a-fA-F0-9]{40}$'
export const UINT_PATTERN         = '^[0-9]+$'
export const ADDRESS_LIST_PATTERN = '^0x[a-fA-F0-9]{40}(\\s*,\\s*0x[a-fA-F0-9]{40})*$'
export const UINT_LIST_PATTERN    = '^[0-9]+(\\s*,\\s*[0-9]+)*$'
