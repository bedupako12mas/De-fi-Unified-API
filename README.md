# DeFi Unified API

> A unified read-only REST API that abstracts DeFi protocol complexity behind
> a single URL pattern. One request shape, any supported protocol, any supported
> chain — no ABI knowledge, no RPC setup, no BigInt handling required.

**Live:** `http://64.227.176.137`

---

## URL Pattern

```
GET /api/v1/{protocol}/{network}/{contract}/{function}?params
```

Mirrors the EVM deployment structure exactly — protocol contains contracts,
contracts contain functions. Adding a protocol is one file and one registry line.

---

## Architecture

```
GET /api/v1/aave-v3/ethereum-mainnet/Pool/getReserveData
        |
        v
AdapterRegistry  protocol -> AaveV3Adapter
        |
        v
AaveV3Adapter  contract -> AaveV3Pool
        |
        v
BaseContract.execute()
  validates params against JSON-schema (ajv)
  dispatches to method by name
        |
        v
AaveV3Pool.getReserveData()
  getTransport("ethereum-mainnet")  <- singleton viem client
  client.readContract(address, abi, params)
  converts bigint -> string, returns clean JSON
        |
        v
{ "data": { "currentLiquidityRate": "15086723441569871728124651", ... } }
```

---

## Components

**Server (Fastify)** — receives requests, dispatches to adapter registry,
formats all errors into a consistent envelope. Knows nothing about protocols.

**Transport Registry** — one singleton viem PublicClient per network, built
lazily on first use, shared across all adapters. Adding a chain is one config entry.

**BaseAdapter** — abstract class providing contract registration and dispatch.
Concrete subclasses register their contracts in the constructor.

**BaseContract** — abstract class providing param validation and dynamic
method dispatch. Concrete subclasses declare schemas and implement methods.

**Validation** — two layers, both JSON-schema compiled via ajv. Fastify-native
schema on the route's URL segments and `/history`'s `limit` (shape known at
registration time); per-function schema run inside `BaseContract.execute()`
for payload contracts only known once `fn` is resolved.

**Persistence (Postgres)** — every request logged as JSONB (params + response),
with a composite index on `(protocol, fn, created_at)`. Doubles as a historical
rates dataset, served via `/history`.

**Error Handling** — AppError hierarchy with `code`, `message`, `layer`, and
`cause`. Each layer catches errors from below and wraps them. Consistent shape
regardless of where the failure occurred.

---

## Endpoints

| Method | URL | Status | Description |
|--------|-----|--------|-------------|
| GET | /api/v1/:protocol/:network/:contract/:fn | ✅ | Execute a read query |
| GET | /api/v1/protocols | ✅ | List registered protocols |
| GET | /api/v1/networks | ✅ | List supported networks |
| GET | /api/v1/schema | ✅ | Full capability map |
| GET | /api/v1/history | ✅ | Request log (JSONB, Postgres-backed) |
| GET | /health | ✅ | Server liveness |
| GET | /health/ready | 🚧 | Readiness check (Postgres + Alchemy) |

---

## Supported Functions

### Uniswap V3 — QuoterV2

| Function | Required Params | Returns |
|----------|----------------|---------|
| quoteExactInputSingle | tokenIn, tokenOut, fee, amountIn | amountOut, sqrtPriceX96After, initializedTicksCrossed, gasEstimate |
| quoteExactOutputSingle | tokenIn, tokenOut, fee, amountOut | amountIn, sqrtPriceX96After, initializedTicksCrossed, gasEstimate |
| quoteExactInput | tokens, fees, amountIn | amountOut, sqrtPriceX96AfterList, initializedTicksCrossedList, gasEstimate (multi-hop) |
| quoteExactOutput | tokens, fees, amountOut | amountIn, sqrtPriceX96AfterList, initializedTicksCrossedList, gasEstimate (multi-hop) |

### Aave V3 — Pool

| Function | Required Params | Returns |
|----------|----------------|---------|
| getUserAccountData | user | totalCollateralBase, totalDebtBase, availableBorrowsBase, currentLiquidationThreshold, ltv, healthFactor |
| getReserveData | asset | liquidityIndex, currentLiquidityRate, currentVariableBorrowRate, currentStableBorrowRate, aTokenAddress, and more |

---

## Curl Examples

**Uniswap V3 — exact input quote (1 WETH -> USDC)**
```bash
curl -s "http://64.227.176.137/api/v1/uniswap-v3/ethereum-mainnet/QuoterV2/quoteExactInputSingle?tokenIn=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2&tokenOut=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&fee=3000&amountIn=1000000000000000000"
```

**Uniswap V3 — exact output quote (get exactly 1000 USDC)**
```bash
curl -s "http://64.227.176.137/api/v1/uniswap-v3/ethereum-mainnet/QuoterV2/quoteExactOutputSingle?tokenIn=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2&tokenOut=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&fee=3000&amountOut=1000000000"
```

**Uniswap V3 — multi-hop quote (WETH -> USDC -> DAI)**
```bash
curl -s "http://64.227.176.137/api/v1/uniswap-v3/ethereum-mainnet/QuoterV2/quoteExactInput?tokens=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,0x6B175474E89094C44Da98b954EedeAC495271d0F&fees=3000,100&amountIn=1000000000000000000"
```

**Aave V3 — reserve data (WETH supply/borrow rates)**
```bash
curl -s "http://64.227.176.137/api/v1/aave-v3/ethereum-mainnet/Pool/getReserveData?asset=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
```

**Aave V3 — user account data (position health)**
```bash
curl -s "http://64.227.176.137/api/v1/aave-v3/ethereum-mainnet/Pool/getUserAccountData?user=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
```

**History — recent logged requests (also doubles as a rates time series)**
```bash
curl -s "http://64.227.176.137/api/v1/history?limit=5"
```

**Schema — discover all supported protocols, contracts, functions**
```bash
curl -s http://64.227.176.137/api/v1/schema
```

**Protocols**
```bash
curl -s http://64.227.176.137/api/v1/protocols
```

**Networks**
```bash
curl -s http://64.227.176.137/api/v1/networks
```

**Health**
```bash
curl -s http://64.227.176.137/health
```

**Error — unknown protocol**
```bash
curl -s "http://64.227.176.137/api/v1/unknown/ethereum-mainnet/QuoterV2/quoteExactInputSingle"
```

**Error — missing params (JSON-schema validation, names every missing field)**
```bash
curl -s "http://64.227.176.137/api/v1/uniswap-v3/ethereum-mainnet/QuoterV2/quoteExactInputSingle?tokenIn=0xC02..."
```

**Error — malformed address (JSON-schema pattern check)**
```bash
curl -s "http://64.227.176.137/api/v1/aave-v3/ethereum-mainnet/Pool/getUserAccountData?user=not-an-address"
```

---

## Response Shape

**Success:**
```json
{
  "data": {
    "currentLiquidityRate":      "15086723441569871728124651",
    "currentVariableBorrowRate": "21565209680370610523333952",
    "aTokenAddress":             "0x4d5F47FA6A74757f35C14fD3a6Ef8E3C9BC514E8"
  }
}
```

**Error:**
```json
{
  "error": {
    "code":    "INVALID_PARAMS",
    "message": "user: must match pattern \"^0x[a-fA-F0-9]{40}$\"",
    "layer":   "adapter"
  }
}
```

---

## Key Design Decisions

**Protocol -> Contract -> Function URL** — mirrors EVM deployment structure.
Same function name on different contracts never collides. Self-documenting URLs.

**1:1 function naming** — action names match Solidity function names exactly.
Target audience (DeFi developers) already knows the function names. No
translation layer needed.

**Read-only scope** — every call uses eth_call (simulated for QuoterV2's
state-touching quote functions, direct for Aave's true view functions). No
private keys, no gas, no transaction risk. Safe to expose publicly.

**Singleton transport** — one viem PublicClient per network, built lazily on
first use and shared via the Node.js module cache. One connection pool
handles all concurrent requests to that chain.

**BaseAdapter + BaseContract** — abstract classes with registration pattern.
Each concrete class registers children in constructor. Dynamic dispatch uses
method names directly — no separate dispatch map.

**Schema separate from implementation** — QuoterV2.schema.ts declares params,
QuoterV2.ts implements methods. Different reasons to change, different files.

**Two-layer JSON-schema validation** — Fastify-native ajv on the route's URL
segments and `/history`'s `limit`; per-function ajv schemas (address/uint
patterns) run inside `BaseContract.execute()` once `fn` is resolved. uint256
amounts are validated and passed as strings end-to-end to avoid JS number
overflow.

**Startup validation** — validateRegistry() verifies every schema entry has a
corresponding method before the server accepts requests. Schema/method mismatches
caught at startup, never at runtime.

**Layered errors** — layer field tells caller where the failure occurred:
server (bad request), adapter (bad params), transport (chain error).

---

## Setup (Local)

**Requirements:** Node 20+, an Alchemy API key, Docker (for local Postgres)

```bash
git clone https://github.com/bedupako12mas/De-fi-Unified-API.git
cd De-fi-Unified-API
npm install
cp .env.example .env
# add ETH_RPC_URL and DATABASE_URL to .env
docker compose up -d          # local Postgres
psql "$DATABASE_URL" -f src/db/schema.sql
npm run dev
```

**Typecheck / build:**
```bash
npm run typecheck    # tsc --noEmit
npm run build        # emits dist/
```

---

## Stack

- **TypeScript + Fastify** — HTTP server
- **viem** — Ethereum on-chain reads via eth_call
- **ajv** — JSON-schema request validation
- **PostgreSQL 16** — self-managed (native, not Docker) on the droplet, request logging
- **DigitalOcean Droplet** — self-managed deployment, no managed cloud services
- **nginx** — reverse proxy (`:80` -> app on `localhost:3000`, direct port firewalled off)
- **pm2** — process management and auto-restart
- **GitHub Actions** — push-to-`main` auto-deploy over SSH, tested end-to-end

---

## Development Plan

### Phase 1 — Uniswap V3 foundation
- [x] Adapter pattern (BaseAdapter, BaseContract, transport singleton)
- [x] UniswapV3 QuoterV2 — single-hop and multi-hop quote functions
- [x] Error handling (AppError hierarchy, layered errors)
- [x] All discovery endpoints (/schema, /protocols, /networks)
- [x] Deploy v1 — live on DigitalOcean

### Phase 2 — Persistence
- [x] Postgres setup (Docker local, native on Droplet)
- [x] Request logging + GET /api/v1/history
- [x] Deploy v2

### Phase 3 — Aave V3 adapter
- [x] AaveV3Pool — getUserAccountData, getReserveData
- [ ] getReservesList (enumerate all reserves)
- [x] Deploy v3

### Phase 4 — Validation & hardening
- [x] JSON-schema validation (Fastify-native + per-function ajv)
- [x] nginx reverse proxy, port 3000 firewalled off externally
- [x] GitHub Actions auto-deploy on push to main

### Phase 5 — Testing (not started)
- [ ] Vitest unit tests — buildPath/toArray golden values, mocked-client dispatch glue
- [ ] Anvil-forked-mainnet integration tests — quote correctness, cross-function invariants
- [ ] autocannon stress tests

---

## Future Extensions
- [ ] Semantic layer — protocol-agnostic `/quote` endpoint fanning out across adapters
- [ ] Aave V3 — getReservesList and additional read functions
- [ ] Uniswap V4 adapter
- [ ] Solana chain support (transport + Orca adapter)
- [ ] Additional EVM networks (Arbitrum, Polygon, Base)
- [ ] In-memory TTL cache (reduce Alchemy calls under load)
- [ ] Redis cache (multi-instance deployments)
- [ ] Self-managed Ethereum node (replace Alchemy)
- [ ] /health/ready endpoint (Postgres + Alchemy readiness)
