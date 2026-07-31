import { Ajv } from 'ajv'
import type { ValidateFunction } from 'ajv'
import { AdapterError }          from './errors.js'
import type { Schema }           from './adapters/types.js'

const ajv = new Ajv({ allErrors: true })

// one compiled validator per schema, built on first use — compiling is the
// expensive step (schema -> generated JS -> new Function), so it's cached
// rather than repeated on every request
const compiled = new WeakMap<Schema, ValidateFunction>()

function compile(schema: Schema): ValidateFunction {
  let validate = compiled.get(schema)
  if (!validate) {
    validate = ajv.compile({
      type:                 'object',
      properties:           schema.properties ?? {},
      required:             schema.required,
      additionalProperties: true
    })
    compiled.set(schema, validate)
  }
  return validate
}

export function validateParams(
  params: Record<string, unknown>,
  schema: Schema
): void {
  const validate = compile(schema)
  if (!validate(params)) {
    const message = (validate.errors ?? [])
      .map(err => `${err.instancePath.replace(/^\//, '') || err.params?.missingProperty}: ${err.message}`)
      .join(', ')
    throw new AdapterError('INVALID_PARAMS', message)
  }
}
