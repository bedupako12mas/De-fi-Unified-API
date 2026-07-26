# DeFi Unified API

> A unified REST API that abstracts DeFi protocol complexity behind a single
> endpoint using an adapter pattern. One envelope, any protocol, any supported
> chain — the SDK complexity is entirely hidden from the caller.

---

## Architecture

```
Client (curl / Postman)
        │
        │  POST /api/v1/query  { protocol, action, network, params }
        ▼
┌─────────────────────────────────────────────────────┐
│  Server (Fastify)                                   │
│  validates envelope → dispatches to adapter         │
└──────────────────────────┬──────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │  Adapter Registry       │
              │  protocol → adapter     │
              └────────────┬────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                                   ▼
┌─────────────────┐                 ┌─────────────────┐
│ UniswapV3Adapter│                 │  AaveV3Adapter  │
│ quoter.*        │                 │  pool.*         │
└────────┬────────┘                 └────────┬────────┘
         │                                   │
         └─────────────┬─────────────────────┘
                       │
              ┌────────▼────────┐
              │  Cache (TTL)    │
              │  hit → return   │
              │  miss → continue│
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │  Transport      │
              │  getTransport() │
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │  viem client    │
              │  eth_call       │
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │  Alchemy / node │
              │  Ethereum       │
              └─────────────────┘
                       │
        ┌──────────────▼──────────────┐
        │  Postgres (fire-and-forget) │
        │  logs every request         │
        └─────────────────────────────┘
```

---

## Components

**Server** — Fastify handles HTTP, validates the envelope shape, dispatches
to the adapter registry. Knows nothing about protocols or chains.

**Adapter System** — each adapter implements a common interface with an open
action string. Adding a protocol is one file and one registry line. Each adapter
declares its supported actions and networks, which auto-populates `/schema`.

**Transport System** — `getTransport(network)` returns a shared viem client
for the requested chain. One connection pool per chain, shared across all
adapters. Adding a new chain is one transport file and one registry entry.

**Cache** — in-memory TTL Map. Checked before every chain read. Rates cached
30s, quotes cached 10s. Eliminates redundant Alchemy calls under concurrent load.

**Error Handling** — `AppError` class with `code`, `message`, `layer`, and
`cause` fields. Each layer wraps errors from the layer below. Caller always
receives a consistent error shape regardless of where the failure occurred.

**Database** — Postgres with JSONB `params` and `response` columns. Every
request logged with protocol, action, network, status, and duration. One table
handles all protocols — no schema migrations when adding new ones.
Index on `(protocol, action, network, created_at)` for efficient time-range queries.

**Schema and Discovery** — `/schema` auto-generated from each adapter's declared
action schema. Developers hit `/schema` to discover every supported protocol,
action, network, and required params without reading documentation.

---

## Endpoints

| Method | URL                 | Status | Description                        |
|--------|---------------------|--------|------------------------------------|
| POST   | /api/v1/query       | ✅     | Query a protocol                   |
| GET    | /api/v1/protocols   | 🚧     | List registered protocols          |
| GET    | /api/v1/networks    | 🚧     | List supported networks            |
| GET    | /api/v1/schema      | 🚧     | Full capability map                |
| GET    | /api/v1/history     | 🚧     | Recent request log (?limit=N)      |
| GET    | /health             | 🚧     | Server liveness check              |

---

## Supported Actions

| Protocol   | Action                   | Status | Description                    |
|------------|--------------------------|--------|--------------------------------|
| uniswap-v3 | quoter.exactInputSingle  | ✅     | Single pool exact input quote  |
| uniswap-v3 | quoter.exactOutputSingle | 🚧     | Single pool exact output quote |
| aave-v3    | pool.getReserveData      | 🚧     | Asset supply and borrow rates  |
| aave-v3    | pool.getUserAccountData  | 🚧     | User position summary          |
| aave-v3    | pool.getReservesList     | 🚧     | All supported assets           |

---

## Request Envelope

```json
{
  "protocol": "uniswap-v3",
  "action":   "quoter.exactInputSingle",
  "network":  "ethereum-mainnet",
  "params": {
    "tokenIn":  "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    "tokenOut": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "fee":      3000,
    "amountIn": "1000000000000000000"
  }
}
```

## Response Envelopes

```json
{ "data":  { "amountOut": "1906857562" } }
{ "error": { "code": "CHAIN_ERROR", "message": "...", "layer": "chain", "cause": "..." } }
```

---

## Design Decisions

**Single POST endpoint** — protocol is an implementation detail, not part of
the URL. Changing protocol is changing one field in the body, not the URL.
Trade-off: POST is not cacheable by HTTP proxies — acceptable at this scale.

**Open action string** — actions are not a fixed enum. Each adapter declares
what it supports via a schema object. Adding a new action to an adapter requires
zero changes to the HTTP layer or registry.

**Transport factory** — adapters call `getTransport(network)` instead of
creating their own clients. One connection pool per chain shared across all
adapters. Adding Solana is one transport file — no adapter changes.

**JSONB for params and response** — different protocols have different param
shapes. JSONB handles all of them in one table without schema migrations.
Index on `(protocol, action, network, created_at)` makes time-range queries fast.

**Layered error codes** — every error has a `layer` field identifying which
component failed. Caller knows immediately whether to look at their params
(adapter layer) or the chain (chain layer).

**simulateContract for Uniswap** — QuoterV2 is marked `nonpayable` not `view`
because it transiently modifies pool state to compute price impact. `readContract`
refuses non-view functions. `simulateContract` calls via `eth_call` — state
changes are discarded, result is returned cleanly.

---

## Setup

**Requirements:** Node 20+, Docker, an Alchemy API key

```bash
# 1. clone and install
git clone <repo-url>
cd Project
npm install

# 2. configure environment
cp .env.example .env
# add your ETH_RPC_URL and DATABASE_URL to .env

# 3. start Postgres
docker compose up -d

# 4. apply schema
psql $DATABASE_URL -f src/db/schema.sql

# 5. start dev server
npm run dev
```

---

## Curl Examples

**Uniswap V3 — exact input quote (1 WETH → USDC)**
```bash
curl -X POST http://localhost:3000/api/v1/query \
  -H 'Content-Type: application/json' \
  -d '{
    "protocol": "uniswap-v3",
    "action":   "quoter.exactInputSingle",
    "network":  "ethereum-mainnet",
    "params": {
      "tokenIn":  "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      "tokenOut": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      "fee":      3000,
      "amountIn": "1000000000000000000"
    }
  }'
```

**List protocols**
```bash
curl http://localhost:3000/api/v1/protocols
```

**Full schema**
```bash
curl http://localhost:3000/api/v1/schema
```

**Request history**
```bash
curl http://localhost:3000/api/v1/history?limit=10
```

**Health check**
```bash
curl http://localhost:3000/health
```

---

## Testing

**Unit and integration tests (Vitest)**
```bash
npm test
```

Covers: transport connectivity, adapter return shapes, all endpoints,
all error codes, error propagation across layers.

**Stress tests (autocannon)**
```bash
npm run stress
```

Measures p99 latency, throughput, and cache effectiveness under concurrent load.

---

## Stack

- **TypeScript + Fastify** — HTTP server and routing
- **viem** — Ethereum on-chain reads via eth_call
- **PostgreSQL 16** — JSONB request logging
- **Docker Compose** — local Postgres
- **DigitalOcean** — self-managed deployment
- **Vitest** — unit and integration tests
- **autocannon** — HTTP stress testing

---

## Roadmap

### Planned extensions
- [ ] Uniswap V3 exact output quote
- [ ] Aave V3 rates, positions, reserves list
- [ ] Postgres request logging and /history
- [ ] Remaining endpoints (/schema, /protocols, /networks, /health)
- [ ] Vitest integration tests
- [ ] autocannon stress tests
- [ ] DigitalOcean deployment

### Future
- [ ] Execute action (unsigned transaction calldata — client signs)
- [ ] Uniswap V3 multi-hop quotes (exactInput, exactOutput)
- [ ] Uniswap V4 adapter
- [ ] Additional Aave V3 functions
- [ ] Solana chain support (transport + Orca adapter)
- [ ] Redis cache (replace in-memory Map for multi-instance deployments)
- [ ] Self-managed Ethereum node (replace Alchemy)
- [ ] Smart order routing across multiple pools
