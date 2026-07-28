import type { FastifyPluginAsync } from 'fastify'
import { getAdapter, listProtocols, buildSchema } from '../adapters/registry.js'
import { listNetworks }                           from '../transports/index.js'
import { AppError, ServerError }                  from '../errors.js'

export const queryPlugin: FastifyPluginAsync = async (engine) => {

  engine.get<{
    Params:      { protocol: string; network: string; contract: string; fn: string }
    Querystring: Record<string, string>
  }>('/api/v1/:protocol/:network/:contract/:fn', async (request, reply) => {
    const { protocol, network, contract, fn } = request.params
    const params = request.query as Record<string, unknown>

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

      return { data: result }

    } catch (err) {
      if (err instanceof AppError) {
        reply.code(err.statusCode)
        return err.toJSON()
      }
      reply.code(500)
      return new ServerError('INTERNAL_ERROR', 'unexpected error', err).toJSON()
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

  engine.get('/api/v1/history', async () => ({
    data: { history: [] }
  }))
}
