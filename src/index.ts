import 'dotenv/config'
import Fastify from 'fastify'
import { queryPlugin }      from './routes/query.js'
import { validateRegistry } from './adapters/registry.js'

validateRegistry()

const engine = Fastify({ logger: true })

engine.register(queryPlugin)

const start = async () => {
  try {
    await engine.listen({ port: 3000, host: '0.0.0.0' })
  } catch (err) {
    engine.log.error(err)
    process.exit(1)
  }
}

start()
