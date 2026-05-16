#!/usr/bin/env node
/**
 * ZCHF Desk route availability checker.
 *
 * Checks the currently visible Exchange routes only: Base and Ethereum ZCHF swaps.
 * This does not sign, approve, submit orders, or require token balances.
 *
 * Usage:
 *   yarn check:desk-routes
 *
 * Optional:
 *   DESK_ROUTE_CHECKER_EOA=0x...       Override public EOA used as from/receiver.
 *   DESK_ROUTE_CHECK_DELAY_MS=250      Delay between quote requests.
 *   DESK_ROUTE_CHECK_TIMEOUT_MS=15000  Per-request timeout.
 *   DESK_ROUTES_STRICT=1               Exit non-zero when any route fails.
 */

const CHECKER_EOA = (process.env.DESK_ROUTE_CHECKER_EOA || "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045").trim();
const REQUEST_DELAY_MS = parseInt(process.env.DESK_ROUTE_CHECK_DELAY_MS || "250", 10);
const REQUEST_TIMEOUT_MS = parseInt(process.env.DESK_ROUTE_CHECK_TIMEOUT_MS || "15000", 10);
const STRICT = process.env.DESK_ROUTES_STRICT === "1";

const COW_EMPTY_APP_DATA = "{}";
const COW_EMPTY_APP_DATA_HASH = "0xb48d38f93eaa084033fc5970bf96e559c33c4cdc07d889ab00b4d63f9590739d";

const CHAINS = [
	{ chainId: 8453, slug: "base", label: "Base" },
	{ chainId: 1, slug: "mainnet", label: "Ethereum" },
];

const COUNTER_ASSETS = {
	8453: [
		asset(8453, "base-usdc", "USDC", "USD Coin", "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", 6),
		asset(8453, "base-weth", "WETH", "Wrapped Ether", "0x4200000000000000000000000000000000000006", 18),
		asset(8453, "base-cbbtc", "cbBTC", "Coinbase Wrapped BTC", "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf", 8),
	],
	1: [
		asset(1, "eth-weth", "WETH", "Wrapped Ether", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", 18),
		asset(1, "eth-usdc", "USDC", "USD Coin", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", 6),
		asset(1, "eth-usdt", "USDT", "Tether USD", "0xdAC17F958D2ee523a2206206994597C13D831ec7", 6),
		asset(1, "eth-dai", "DAI", "Dai Stablecoin", "0x6B175474E89094C44Da98b954EedeAC495271d0F", 18),
		asset(1, "eth-wbtc", "WBTC", "Wrapped Bitcoin", "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", 8),
		asset(1, "eth-cow", "COW", "CoW Protocol Token", "0xDEf1CA1fb7FBcDC777520aa7f396b4E015F497aB", 18),
	],
};

const SAMPLE_SELL_AMOUNTS = {
	ZCHF: "10",
	USDC: "10",
	USDT: "10",
	DAI: "10",
	WETH: "0.005",
	WBTC: "0.0001",
	cbBTC: "0.0001",
	COW: "10",
};

function asset(chainId, id, symbol, name, address, decimals) {
	return { chainId, id, symbol, name, address, decimals };
}

function isAddress(value) {
	return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value);
}

function parseUnits(value, decimals) {
	const [wholeRaw, fractionRaw = ""] = String(value).split(".");
	const base = 10n ** BigInt(decimals);
	return (BigInt(wholeRaw || "0") * base + BigInt((fractionRaw + "0".repeat(decimals)).slice(0, decimals) || "0")).toString();
}

function formatUnits(value, decimals, maxFractionDigits = 8) {
	const raw = BigInt(value ?? "0");
	const base = 10n ** BigInt(decimals);
	const whole = raw / base;
	const remainder = raw % base;
	if (remainder === 0n) return whole.toString();
	const fraction = remainder.toString().padStart(decimals, "0").slice(0, maxFractionDigits).replace(/0+$/, "");
	return fraction ? `${whole}.${fraction}` : whole.toString();
}

function getCowError(value) {
	if (typeof value === "string") return value;
	if (value && typeof value === "object") return value.description || value.error || value.message || "No reliable CoW route found.";
	return "No reliable CoW route found.";
}

async function loadZchfAddresses() {
	const mod = await import("@frankencoin/zchf");
	const ADDRESS = mod.ADDRESS ?? mod.default?.ADDRESS;
	return Object.fromEntries(
		CHAINS.map((chain) => {
			const addresses = ADDRESS?.[chain.chainId] || {};
			return [chain.chainId, isAddress(addresses.frankencoin) ? addresses.frankencoin : addresses.ccipBridgedFrankencoin];
		})
	);
}

function buildRoutes(zchfByChain) {
	const routes = [];
	for (const chain of CHAINS) {
		const zchfAddress = zchfByChain[chain.chainId];
		if (!isAddress(zchfAddress)) throw new Error(`ZCHF address missing for ${chain.label}`);
		const zchf = asset(chain.chainId, `zchf-${chain.chainId}`, "ZCHF", "Frankencoin", zchfAddress, 18);
		for (const counterAsset of COUNTER_ASSETS[chain.chainId]) {
			routes.push({ chain, sellAsset: counterAsset, buyAsset: zchf });
			routes.push({ chain, sellAsset: zchf, buyAsset: counterAsset });
		}
	}
	return routes;
}

async function requestQuote(route) {
	const sampleAmount = SAMPLE_SELL_AMOUNTS[route.sellAsset.symbol];
	const sellAmountBeforeFee = parseUnits(sampleAmount, route.sellAsset.decimals);
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
	const started = Date.now();
	try {
		const response = await fetch(`https://api.cow.fi/${route.chain.slug}/api/v1/quote`, {
			method: "POST",
			headers: { "Content-Type": "application/json", Accept: "application/json" },
			body: JSON.stringify({
				sellToken: route.sellAsset.address,
				buyToken: route.buyAsset.address,
				from: CHECKER_EOA,
				receiver: CHECKER_EOA,
				kind: "sell",
				sellAmountBeforeFee,
				partiallyFillable: false,
				appData: COW_EMPTY_APP_DATA,
				appDataHash: COW_EMPTY_APP_DATA_HASH,
				sellTokenBalance: "erc20",
				buyTokenBalance: "erc20",
				signingScheme: "eip712",
				priceQuality: "optimal",
			}),
			signal: controller.signal,
		});
		const data = await response.json().catch(() => null);
		if (!response.ok) return { ok: false, sampleAmount, elapsedMs: Date.now() - started, status: response.status, error: getCowError(data) };
		const quote = data?.quote ?? data;
		return { ok: true, sampleAmount, elapsedMs: Date.now() - started, buyAmount: quote?.buyAmount, feeAmount: quote?.feeAmount, expiration: data?.expiration };
	} catch (error) {
		return { ok: false, sampleAmount, elapsedMs: Date.now() - started, error: error?.name === "AbortError" ? `Request timed out after ${REQUEST_TIMEOUT_MS}ms` : error instanceof Error ? error.message : String(error) };
	} finally {
		clearTimeout(timeout);
	}
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
	if (!isAddress(CHECKER_EOA)) throw new Error(`Invalid DESK_ROUTE_CHECKER_EOA: ${CHECKER_EOA}`);
	const routes = buildRoutes(await loadZchfAddresses());
	console.log("ZCHF Desk route availability checker");
	console.log("Routes:", routes.length);
	console.log("Note: quote availability does not prove balance, approval behavior, settlement, or future liquidity.\n");
	const results = [];
	for (const route of routes) {
		const result = await requestQuote(route);
		results.push(result);
		if (result.ok) {
			const receive = result.buyAmount ? `${formatUnits(result.buyAmount, route.buyAsset.decimals)} ${route.buyAsset.symbol}` : "n/a";
			const fee = result.feeAmount ? `${formatUnits(result.feeAmount, route.sellAsset.decimals)} ${route.sellAsset.symbol}` : "n/a";
			console.log(`OK   ${route.chain.label}: ${route.sellAsset.symbol} → ${route.buyAsset.symbol} | sell ${result.sampleAmount} ${route.sellAsset.symbol} | receive ${receive} | fee ${fee} | ${result.elapsedMs}ms`);
		} else {
			console.log(`FAIL ${route.chain.label}: ${route.sellAsset.symbol} → ${route.buyAsset.symbol} | sell ${result.sampleAmount} ${route.sellAsset.symbol} | ${result.status ? `HTTP ${result.status}` : "request failed"} | ${result.error} | ${result.elapsedMs}ms`);
		}
		if (REQUEST_DELAY_MS > 0) await sleep(REQUEST_DELAY_MS);
	}
	const ok = results.filter((item) => item.ok).length;
	console.log(`\nSummary: ${ok}/${results.length} routes quoted, ${results.length - ok} failed.`);
	if (STRICT && ok !== results.length) process.exitCode = 1;
}

main().catch((error) => {
	console.error(error instanceof Error ? error.stack || error.message : String(error));
	process.exit(1);
});
