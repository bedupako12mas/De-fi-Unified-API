export abstract class AppError extends Error {
  abstract readonly layer: string

  constructor(
    public readonly code:       string,
    public readonly message:    string,
    public readonly statusCode: number,
    public readonly cause?:     string
  ) {
    super(message)
    this.name = this.constructor.name
  }

  toJSON() {
    return {
      error: {
        code:    this.code,
        message: this.message,
        layer:   this.layer,
        ...(this.cause && { cause: this.cause })
      }
    }
  }
}

export class ServerError extends AppError {
  readonly layer = 'server'

  constructor(code: string, message: string, cause?: unknown) {
    super(code, message, 400, cause instanceof Error ? cause.message : undefined)
  }
}

export class AdapterError extends AppError {
  readonly layer = 'adapter'

  constructor(code: string, message: string, cause?: unknown) {
    super(code, message, 400, cause instanceof Error ? cause.message : undefined)
  }
}

export class TransportError extends AppError {
  readonly layer = 'transport'

  constructor(code: string, message: string, cause?: unknown) {
    super(code, message, 502, cause instanceof Error ? cause.message : String(cause))
  }
}

export class DatabaseError extends AppError {
  readonly layer = 'database'

  constructor(code: string, message: string, cause?: unknown) {
    super(code, message, 500, cause instanceof Error ? cause.message : String(cause))
  }
}

