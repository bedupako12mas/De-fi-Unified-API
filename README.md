# DeFi Unified API

> A unified read-only REST API that abstracts DeFi protocol complexity behind
> a single URL pattern. One request shape, any supported protocol, any supported
> chain — no ABI knowledge, no RPC setup, no BigInt handling required.

**Live:** `http://64.227.176.137:3000`

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
GET /api/v1/uniswap-v3/ethereum-mainnet/QuoterV2/quoteExactInputSingle
        |
        v
AdapterRegistry  protocol -> UniswapV3Adapter
        |
        v
UniswapV3Adapter  contract -> UniswapV3QuoterV2
        |
        v
BaseContract.execute()
  validates params against schema
  dispatches to method by name
        |
        v
UniswapV3QuoterV2.quoteExactInputSingle()
  getTransport("ethereum-mainnet")  <- singleton viem client
  client.simulateContract(address, abi, params)
  converts bigint -> string, returns clean JSON
        |
        v
{ "data": { "amountOut": "1872334251", ... } }
```

---

## Components

**Server (Fastify)** — receives requests, dispatches to adapter registry,
formats all errors into a consistent envelope. Knows nothing about protocols.

**Transport Registry** — one singleton viem PublicClient per network, created
once at startup, shared across all adapters. Adding a chain is one config entry.

**BaseAdapter** — abstract class providing contract registration and dispatch.
Concrete subclasses register their contracts in the constructor.

**BaseContract** — abstract class providing param validation and dynamic
method dispatch. Concrete subclasses declare schemas and implement methods.

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
| GET | /api/v1/history | 🚧 | Request log (needs Postgres) |
| GET | /health | ✅ | Server liveness |
| GET | /health/ready | 🚧 | Readiness check (Postgres + Alchemy) |

---

## Supported Functions

### Uniswap V3 — QuoterV2

| Function | Required Params | Returns |
|----------|----------------|---------|
| quoteExactInputSingle | tokenIn, tokenOut, fee, amountIn | amountOut, sqrtPriceX96After, initializedTicksCrossed, gasEstimate |
| quoteExactOutputSingle | tokenIn, tokenOut, fee, amountOut | amountIn, sqrtPriceX96After, initializedTicksCrossed, gasEstimate |

### Aave V3 — Pool (planned)

| Function | Required Params | Returns |
|----------|----------------|---------|
| getReserveData | asset | supplyApy, variableBorrowApy, aTokenAddress |
| getUserAccountData | user | totalCollateralUsd, totalDebtUsd, healthFactor |
| getReservesList | none | array of asset addresses |

---

## Curl Examples

**Uniswap V3 — exact input quote (1 WETH -> USDC)**
```bash
curl -s "http://64.227.176.137:3000/api/v1/uniswap-v3/ethereum-mainnet/QuoterV2/quoteExactInputSingle?tokenIn=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2&tokenOut=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&fee=3000&amountIn=1000000000000000000"
```

**Uniswap V3 — exact output quote (get exactly 1000 USDC)**
```bash
curl -s "http://64.227.176.137:3000/api/v1/uniswap-v3/ethereum-mainnet/QuoterV2/quoteExactOutputSingle?tokenIn=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2&tokenOut=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&fee=3000&amountOut=1000000000"
```

**Schema — discover all supported protocols, contracts, functions**
```bash
curl -s http://64.227.176.137:3000/api/v1/schema
```

**Protocols**
```bash
curl -s http://64.227.176.137:3000/api/v1/protocols
```

**Networks**
```bash
curl -s http://64.227.176.137:3000/api/v1/networks
```

**Health**
```bash
curl -s http://64.227.176.137:3000/health
```

**Error — unknown protocol**
```bash
curl -s "http://64.227.176.137:3000/api/v1/unknown/ethereum-mainnet/QuoterV2/quoteExactInputSingle"
```

**Error — missing params**
```bash
curl -s "http://64.227.176.137:3000/api/v1/uniswap-v3/ethereum-mainnet/QuoterV2/quoteExactInputSingle?tokenIn=0xC02..."
```

---

## Response Shape

**Success:**
```json
{
  "data": {
    "amountOut":               "1872334251",
    "sqrtPriceX96After":       "1828275798781487584961640110738330",
    "initializedTicksCrossed": "0",
    "gasEstimate":             "98696"
  }
}
```

**Error:**
```json
{
  "error": {
    "code":    "INVALID_PARAMS",
    "message": "missing required params: tokenOut, fee, amountIn",
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

**Read-only scope** — every call uses eth_call. No private keys, no gas, no
transaction risk. Safe to expose publicly.

**Singleton transport** — one viem PublicClient per network, shared via Node.js
module cache. One connection pool handles all concurrent requests to that chain.

**BaseAdapter + BaseContract** — abstract classes with registration pattern.
Each concrete class registers children in constructor. Dynamic dispatch uses
method names directly — no separate dispatch map.

**Schema separate from implementation** — QuoterV2.schema.ts declares params,
QuoterV2.ts implements methods. Different reasons to change, different files.

**Startup validation** — validateRegistry() verifies every schema entry has a
corresponding method before the server accepts requests. Schema/method mismatches
caught at startup, never at runtime.

**Layered errors** — layer field tells caller where the failure occurred:
server (bad request), adapter (bad params), transport (chain error).

---

## Setup (Local)

**Requirements:** Node 20+, an Alchemy API key

```bash
git clone https://github.com/bedupako12mas/De-fi-Unified-API.git
cd De-fi-Unified-API
npm install
cp .env.example .env
# add ETH_RPC_URL to .env
npm run dev
```

---

## Stack

- **TypeScript + Fastify** — HTTP server
- **viem** — Ethereum on-chain reads via eth_call
- **DigitalOcean Droplet** — self-managed deployment
- **pm2** — process management and auto-restart

---

## Development Plan

### Phase 1 — Uniswap V3 foundation
- [x] Adapter pattern (BaseAdapter, BaseContract, transport singleton)
- [x] UniswapV3 QuoterV2 — quoteExactInputSingle, quoteExactOutputSingle
- [x] Error handling (AppError hierarchy, layered errors)
- [x] All discovery endpoints (/schema, /protocols, /networks)
- [x] Deploy v1 — live on DigitalOcean

### Phase 2 — Persistence
- [ ] Postgres setup (Docker local, native on Droplet)
- [ ] Request logging + GET /api/v1/history
- [ ] Deploy v2

### Phase 3 — Aave V3 adapter
- [ ] AaveV3Pool — getReserveData, getUserAccountData, getReservesList
- [ ] Deploy v3

### Phase 4 — Testing
- [ ] Vitest integration tests
- [ ] autocannon stress tests

---

## Future Extensions
- [ ] Uniswap V3 multi-hop quotes (quoteExactInput, quoteExactOutput)
- [ ] Aave V3 additional read functions
- [ ] Uniswap V4 adapter
- [ ] Solana chain support (transport + Orca adapter)
- [ ] Additional EVM networks (Arbitrum, Polygon, Base)
- [ ] In-memory TTL cache (reduce Alchemy calls under load)
- [ ] Redis cache (multi-instance deployments)
- [ ] Self-managed Ethereum node (replace Alchemy)
- [ ] /health/ready endpoint (Postgres + Alchemy readiness)
