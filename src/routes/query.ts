import type { FastifyPluginAsync } from 'fastify'
import { getAdapter, listProtocols, buildSchema } from '../adapters/registry.js'
import { listNetworks }                           from '../transports/index.js'
import { AppError, ServerError }                  from '../errors.js'
import { db }                                     from '../db/client.js'

export const queryPlugin: FastifyPluginAsync = async (engine) => {

  engine.get<{
    Params:      { protocol: string; network: string; contract: string; fn: string }
    Querystring: Record<string, string>
  }>('/api/v1/:protocol/:network/:contract/:fn', async (request, reply) => {
    const { protocol, network, contract, fn } = request.params
    const params = request.query as Record<string, unknown>
    const start  = Date.now()

    let status   = 200
    let response: unknown

    try {
      const adapter = getAdapter(protocol)

      if (!adapter.supportedNetworks().includes(network)) {
        throw new ServerError(
          'UNSUPPORTED_NETWORK',
          `${protocol} does not support ${network}`
        )
      }

      const contractHandler = adapter.getContract(contract)
      const result          = await contractHandler.execute(fn, network, params)

      response = { data: result }
      return response

    } catch (err) {
      if (err instanceof AppError) {
        status   = err.statusCode
        response = err.toJSON()
        reply.code(status)
        return response
      }
      status   = 500
      response = new ServerError('INTERNAL_ERROR', 'unexpected error', err).toJSON()
      reply.code(500)
      return response

    } finally {
      db.query(
        `INSERT INTO api_requests
         (protocol, network, contract, fn, params, response, status, duration_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [protocol, network, contract, fn,
         JSON.stringify(params), JSON.stringify(response),
         status, Date.now() - start]
      ).catch(err => engine.log.error({ err }, 'DB log failed'))
    }
  })

  engine.get('/health', async () => ({ status: 'ok' }))

  engine.get('/api/v1/protocols', async () => ({
    data: { protocols: listProtocols() }
  }))

  engine.get('/api/v1/networks', async () => ({
    data: { networks: listNetworks() }
  }))

  engine.get('/api/v1/schema', async () => ({
    data: buildSchema()
  }))

  engine.get<{
    Querystring: { limit?: string }
  }>('/api/v1/history', async (request) => {
    const limit = Math.min(parseInt(request.query.limit ?? '50'), 100)
    const { rows } = await db.query(
      `SELECT id, protocol, network, contract, fn, params, response,
              status, duration_ms, created_at
       FROM api_requests
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    )
    return { data: { history: rows } }
  })
}
