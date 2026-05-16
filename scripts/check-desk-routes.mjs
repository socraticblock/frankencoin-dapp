#!/usr/bin/env node
/**
 * ZCHF Desk route availability checker.
 *
 * This script checks whether each configured ZCHF Desk route can receive a live
 * CoW quote for a small sample amount. It does not sign, approve, submit orders,
 * or require the checker address to hold any token balance.
 *
 * Keep the route list mirrored with utils/exchangeAssets.ts.
 *
 * Usage:
 *   yarn check:desk-routes
 *
 * Optional:
 *   DESK_ROUTE_CHECKER_EOA=0x...       Override the public EOA used as from/receiver.
 *   DESK_ROUTE_CHECK_DELAY_MS=250      Delay between quote requests.
 *   DESK_ROUTE_CHECK_TIMEOUT_MS=15000  Per-request timeout.
 *   DESK_ROUTES_STRICT=1               Exit non-zero when any route fails to quote.
 */

const CHECKER_EOA = (process.env.DESK_ROUTE_CHECKER_EOA || "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045").trim();
const REQUEST_DELAY_MS = parsePositiveInteger(process.env.DESK_ROUTE_CHECK_DELAY_MS, 250);
const REQUEST_TIMEOUT_MS = parsePositiveInteger(process.env.DESK_ROUTE_CHECK_TIMEOUT_MS, 15_000);
const STRICT = process.env.DESK_ROUTES_STRICT === "1";

const COW_EMPTY_APP_DATA = "{}";
const COW_EMPTY_APP_DATA_HASH = "0xb48d38f93eaa084033fc5970bf96e559c33c4cdc07d889ab00b4d63f9590739d";

const CHAINS = [
	{ chainId: 8453, slug: "base", label: "Base" },
	{ chainId: 1, slug: "mainnet", label: "Ethereum" },
	{ chainId: 100, slug: "gnosis", label: "Gnosis" },
];

const ZCHF_MODES = ["get-zchf", "sell-zchf"];
const ALL_MODES = ["get-zchf", "sell-zchf", "get-wfps", "sell-wfps"];

const COUNTER_ASSETS = {
	1: [
		counter(1, "eth-weth", "WETH", "Wrapped Ether", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", 18, ALL_MODES),
		counter(1, "eth-usdc", "USDC", "USD Coin", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", 6, ALL_MODES),
		counter(1, "eth-usdt", "USDT", "Tether USD", "0xdAC17F958D2ee523a2206206994597C13D831ec7", 6, ALL_MODES),
		counter(1, "eth-dai", "DAI", "Dai Stablecoin", "0x6B175474E89094C44Da98b954EedeAC495271d0F", 18, ALL_MODES),
		counter(1, "eth-wbtc", "WBTC", "Wrapped Bitcoin", "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", 8, ALL_MODES),
		counter(1, "eth-cow", "COW", "CoW Protocol Token", "0xDEf1CA1fb7FBcDC777520aa7f396b4E015F497aB", 18, ALL_MODES),
	],
	8453: [
		counter(8453, "base-weth", "WETH", "Wrapped Ether", "0x4200000000000000000000000000000000000006", 18, ZCHF_MODES),
		counter(8453, "base-usdc", "USDC", "USD Coin", "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", 6, ZCHF_MODES),
		counter(8453, "base-cbbtc", "cbBTC", "Coinbase Wrapped BTC", "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf", 8, ZCHF_MODES),
	],
	100: [
		counter(100, "gnosis-wxdai", "WXDAI", "Wrapped XDAI", "0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d", 18, ZCHF_MODES),
		counter(100, "gnosis-weth", "WETH", "Wrapped Ether", "0x6A023CCd1ff6F2045C3309768eAd9E68F978f6e1", 18, ZCHF_MODES),
	],
};

const SAMPLE_SELL_AMOUNTS = {
	ZCHF: "10",
	WFPS: "0.001",
	USDC: "10",
	USDT: "10",
	DAI: "10",
	WXDAI: "10",
	WETH: "0.005",
	WBTC: "0.0001",
	cbBTC: "0.0001",
	COW: "10",
};

function counter(chainId, id, symbol, name, address, decimals, enabledIn) {
	return { chainId, id, symbol, name, address, decimals, enabledIn, role: "counterAsset" };
}

function frankencoinAsset(chainId, symbol, name, address) {
	return {
		chainId,
		id: `${symbol.toLowerCase()}-${chainId}`,
		symbol,
		name,
		address,
		decimals: 18,
		role: "frankencoin",
	};
}

function parsePositiveInteger(value, fallback) {
	const parsed = Number.parseInt(value || "", 10);
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function isAddress(value) {
	return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value);
}

function parseUnits(value, decimals) {
	const normalized = String(value).trim();
	if (!/^\d+(\.\d+)?$/.test(normalized)) throw new Error(`Invalid decimal amount: ${value}`);
	const [wholeRaw, fractionRaw = ""] = normalized.split(".");
	if (fractionRaw.length > decimals) throw new Error(`${value} has more than ${decimals} decimals.`);
	const base = 10n ** BigInt(decimals);
	const whole = BigInt(wholeRaw || "0") * base;
	const fraction = BigInt((fractionRaw + "0".repeat(decimals)).slice(0, decimals) || "0");
	return (whole + fraction).toString();
}

function formatUnits(value, decimals, maxFractionDigits = 8) {
	const raw = BigInt(value ?? "0");
	const base = 10n ** BigInt(decimals);
	const whole = raw / base;
	const remainder = raw % base;
	if (remainder === 0n) return whole.toString();
	const fraction = remainder.toString().padStart(decimals, "0").slice(0, maxFractionDigits).replace(/0+$/, "");
	return fraction ? `${whole.toString()}.${fraction}` : whole.toString();
}

function getCowError(value) {
	if (typeof value === "string") return value;
	if (value && typeof value === "object") {
		if (typeof value.description === "string") return value.description;
		if (typeof value.error === "string") return value.error;
		if (typeof value.message === "string") return value.message;
	}
	return "No reliable CoW route found for this sample amount.";
}

async function loadFrankencoinAddresses() {
	try {
		const mod = await import("@frankencoin/zchf");
		const ADDRESS = mod.ADDRESS ?? mod.default?.ADDRESS;
		if (!ADDRESS || typeof ADDRESS !== "object") throw new Error("ADDRESS export missing");

		return {
			getZchfAddress(chainId) {
				const addresses = ADDRESS[chainId];
				if (!addresses || typeof addresses !== "object") return null;
				if (isAddress(addresses.frankencoin)) return addresses.frankencoin;
				if (isAddress(addresses.ccipBridgedFrankencoin)) return addresses.ccipBridgedFrankencoin;
				return null;
			},
			getWfpsAddress(chainId) {
				if (chainId !== 1) return null;
				const addresses = ADDRESS[chainId];
				if (!addresses || typeof addresses !== "object") return null;
				for (const key of ["wfps", "wFPS", "wrappedFPS", "wrappedFps", "fpsWrapper", "FPSWrapper"]) {
					if (isAddress(addresses[key])) return addresses[key];
				}
				return null;
			},
		};
	} catch (error) {
		console.error("Could not load @frankencoin/zchf ADDRESS data.");
		console.error(error instanceof Error ? error.message : String(error));
		console.error("Run this script from the repository after installing dependencies with yarn install.");
		process.exit(1);
	}
}

function buildRoutes(addressBook) {
	const routes = [];
	const skipped = [];

	for (const chain of CHAINS) {
		const zchfAddress = addressBook.getZchfAddress(chain.chainId);
		if (!zchfAddress) {
			skipped.push({ chain: chain.label, route: "ZCHF routes", reason: "ZCHF address not found in @frankencoin/zchf" });
			continue;
		}

		const zchf = frankencoinAsset(chain.chainId, "ZCHF", "Frankencoin", zchfAddress);
		const wfpsAddress = addressBook.getWfpsAddress(chain.chainId);
		const wfps = wfpsAddress ? frankencoinAsset(chain.chainId, "WFPS", "Wrapped Frankencoin Pool Shares", wfpsAddress) : null;

		for (const counterAsset of COUNTER_ASSETS[chain.chainId] || []) {
			for (const mode of counterAsset.enabledIn) {
				const lockedAsset = mode === "get-wfps" || mode === "sell-wfps" ? wfps : zchf;
				if (!lockedAsset) {
					skipped.push({ chain: chain.label, route: `${counterAsset.symbol} ↔ WFPS`, reason: "WFPS wrapper address not found or not validated" });
					continue;
				}

				const isBuyingFrankencoinAsset = mode === "get-zchf" || mode === "get-wfps";
				const sellAsset = isBuyingFrankencoinAsset ? counterAsset : lockedAsset;
				const buyAsset = isBuyingFrankencoinAsset ? lockedAsset : counterAsset;
				routes.push({ chain, mode, counterAsset, sellAsset, buyAsset });
			}
		}
	}

	return { routes, skipped };
}

function quoteBody(route, sellAmountBeforeFee) {
	return {
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
	};
}

async function requestQuote(route) {
	const sampleAmount = SAMPLE_SELL_AMOUNTS[route.sellAsset.symbol];
	if (!sampleAmount) throw new Error(`No sample amount configured for ${route.sellAsset.symbol}`);

	const sellAmountBeforeFee = parseUnits(sampleAmount, route.sellAsset.decimals);
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
	const url = `https://api.cow.fi/${route.chain.slug}/api/v1/quote`;
	const started = Date.now();

	try {
		const response = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json", Accept: "application/json" },
			body: JSON.stringify(quoteBody(route, sellAmountBeforeFee)),
			signal: controller.signal,
		});
		const text = await response.text();
		let data;
		try {
			data = text ? JSON.parse(text) : null;
		} catch {
			data = { raw: text.slice(0, 500) };
		}

		const elapsedMs = Date.now() - started;
		if (!response.ok) {
			return {
				ok: false,
				sampleAmount,
				elapsedMs,
				error: getCowError(data),
				status: response.status,
			};
		}

		const quote = data?.quote ?? data;
		return {
			ok: true,
			sampleAmount,
			elapsedMs,
			buyAmount: quote?.buyAmount,
			feeAmount: quote?.feeAmount,
			validTo: quote?.validTo,
			expiration: data?.expiration,
			quoteId: data?.id,
		};
	} catch (error) {
		const elapsedMs = Date.now() - started;
		return {
			ok: false,
			sampleAmount,
			elapsedMs,
			error: error?.name === "AbortError" ? `Request timed out after ${REQUEST_TIMEOUT_MS}ms` : error instanceof Error ? error.message : String(error),
		};
	} finally {
		clearTimeout(timeout);
	}
}

function routeLabel(route) {
	return `${route.chain.label}: ${route.sellAsset.symbol} → ${route.buyAsset.symbol}`;
}

function expiryLabel(result) {
	if (result.expiration) return result.expiration;
	if (result.validTo) return new Date(Number(result.validTo) * 1000).toISOString();
	return "n/a";
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
	if (!isAddress(CHECKER_EOA)) {
		console.error(`Invalid DESK_ROUTE_CHECKER_EOA: ${CHECKER_EOA}`);
		process.exit(1);
	}

	const addressBook = await loadFrankencoinAddresses();
	const { routes, skipped } = buildRoutes(addressBook);
	if (routes.length === 0) {
		console.error("No routes were built. Check @frankencoin/zchf ADDRESS data and route configuration.");
		process.exit(1);
	}

	console.log("ZCHF Desk route availability checker");
	console.log("Checker EOA:", CHECKER_EOA);
	console.log("Routes:", routes.length);
	console.log("Delay:", `${REQUEST_DELAY_MS}ms`);
	console.log("Timeout:", `${REQUEST_TIMEOUT_MS}ms`);
	console.log("Note: quote availability does not prove wallet balance, approval behavior, final settlement, or future liquidity.");
	console.log("");

	const results = [];
	for (const route of routes) {
		const result = await requestQuote(route);
		results.push({ route, result });

		if (result.ok) {
			const receive = result.buyAmount ? `${formatUnits(result.buyAmount, route.buyAsset.decimals)} ${route.buyAsset.symbol}` : "n/a";
			const fee = result.feeAmount ? `${formatUnits(result.feeAmount, route.sellAsset.decimals)} ${route.sellAsset.symbol}` : "n/a";
			console.log(
				`OK   ${routeLabel(route)} | sell ${result.sampleAmount} ${route.sellAsset.symbol} | receive ${receive} | fee ${fee} | expires ${expiryLabel(result)} | ${result.elapsedMs}ms`
			);
		} else {
			const status = result.status ? `HTTP ${result.status}` : "request failed";
			console.log(`FAIL ${routeLabel(route)} | sell ${result.sampleAmount} ${route.sellAsset.symbol} | ${status} | ${result.error} | ${result.elapsedMs}ms`);
		}

		if (REQUEST_DELAY_MS > 0) await sleep(REQUEST_DELAY_MS);
	}

	console.log("");
	if (skipped.length > 0) {
		console.log("Skipped routes:");
		for (const item of skipped) console.log(`SKIP ${item.chain}: ${item.route} | ${item.reason}`);
		console.log("");
	}

	const ok = results.filter((item) => item.result.ok);
	const failed = results.filter((item) => !item.result.ok);
	console.log(`Summary: ${ok.length}/${results.length} routes quoted, ${failed.length} failed, ${skipped.length} skipped.`);

	if (failed.length > 0) {
		console.log("");
		console.log("Failed routes:");
		for (const { route, result } of failed) console.log(`- ${routeLabel(route)}: ${result.error}`);
	}

	if (STRICT && failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
	console.error(error instanceof Error ? error.stack || error.message : String(error));
	process.exit(1);
});
