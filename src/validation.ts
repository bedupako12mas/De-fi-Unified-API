import { AdapterError } from './errors.js'

export function validateParams(
  params:   Record<string, unknown>,
  required: string[]
): void {
  const missing = required.filter(key => !params[key])
  if (missing.length > 0) {
    throw new AdapterError('INVALID_PARAMS', `missing required params: ${missing.join(', ')}`)
  }
}
