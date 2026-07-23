# DeFi Unified API

> A unified REST API that abstracts DeFi protocols behind a single endpoint
> using an adapter pattern. Built from scratch in under a week while simultaneously
> learning TypeScript, PostgreSQL, and Ethereum fundamentals.

## Current State

Project scaffold — Fastify server boots, `/health` endpoint working.
Uniswap V3 adapter in progress.

## Roadmap

- [x] Project scaffold (Fastify, TypeScript, ESM)
- [ ] Uniswap V3 live swap quotes (QuoterV2, single-pool)
- [ ] Adapter pattern refactor (types, registry, clean separation)
- [ ] Aave V3 lending rates and positions
- [ ] Fluid protocol stub (Instadapp)
- [ ] Postgres request logging
- [ ] GET /history endpoint
- [ ] DigitalOcean deployment
- [ ] History filtering (?limit, ?protocol)
- [ ] Execute action (unsigned transaction calldata for writes)

## Endpoints

| Method | URL | Status | Description |
|--------|-----|--------|-------------|
| GET | /health | ✅ | Server liveness check |
| GET | /api/v1/protocols | 🚧 | List supported protocols |
| POST | /api/v1/query | 🚧 | Query a protocol |
| GET | /api/v1/history | 🚧 | Recent request history |

## Stack

- **TypeScript + Fastify** — HTTP server
- **viem** — Ethereum on-chain reads via eth_call
- **PostgreSQL** — request logging with JSONB
- **DigitalOcean** — self-managed deployment
