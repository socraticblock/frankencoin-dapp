/**
 * Ankr Freemium JSON-RPC smoke test (eth_blockNumber + eth_getLogs).
 *
 * Profiles (ANKR_TEST_PROFILE):
 *   production6 (default) — Ethereum, Base, Polygon, Arbitrum only, with
 *     conservative per-chain block spans aligned to production-6 live indexing.
 *   all — legacy 8-chain stress test; spans from ANKR_LOG_RANGES (default 10,100,1000,3000).
 *
 * Usage:
 *   node --env-file=scripts/ankr-local.env scripts/ankr-indexing-rpc-test.mjs
 *
 * Optional:
 *   ANKR_TEST_PROFILE=all
 *   ANKR_LOG_RANGES=10,500,2000   (profile "all" only)
 *   ANKR_REQUEST_DELAY_MS=150
 */

const apiKey = process.env.ANKR_API_KEY?.trim();
if (!apiKey) {
	console.error("Missing ANKR_API_KEY (do not commit this value).");
	process.exit(1);
}

const profile = (process.env.ANKR_TEST_PROFILE || "production6").trim().toLowerCase();

/** production-6 phase 1: match conservative ethGetLogsBlockRange tuning in Ponder */
const CHAINS_PRODUCTION6 = [
	{ path: "eth", label: "Ethereum", ranges: [100, 250] },
	{ path: "base", label: "Base", ranges: [10, 25, 50] },
	{ path: "polygon", label: "Polygon", ranges: [100, 250, 500] },
	{ path: "arbitrum", label: "Arbitrum", ranges: [500, 750, 1000] },
];

const CHAINS_ALL = [
	["eth", "Ethereum"],
	["optimism", "OP Mainnet"],
	["gnosis", "Gnosis"],
	["polygon", "Polygon"],
	["sonic_mainnet", "Sonic"],
	["base", "Base"],
	["arbitrum", "Arbitrum"],
	["avalanche", "Avalanche (C-Chain)"],
];

const rangesAll = (process.env.ANKR_LOG_RANGES || "10,100,1000,3000")
	.split(",")
	.map((s) => parseInt(s.trim(), 10))
	.filter((n) => Number.isFinite(n) && n > 0);

const delayMs = Math.max(0, parseInt(process.env.ANKR_REQUEST_DELAY_MS || "120", 10) || 0);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function rpcUrl(pathSegment) {
	return `https://rpc.ankr.com/${pathSegment}/${apiKey}`;
}

function toHex(n) {
	return "0x" + BigInt(n).toString(16);
}

async function jsonRpc(url, body) {
	const t0 = performance.now();
	const res = await fetch(url, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
	const text = await res.text();
	let json;
	try {
		json = JSON.parse(text);
	} catch {
		json = { _parseError: true, raw: text.slice(0, 500) };
	}
	const ms = Math.round(performance.now() - t0);
	return { res, json, ms };
}

function normalizeChains() {
	if (profile === "all") {
		return CHAINS_ALL.map(([path, label]) => ({ path, label, ranges: rangesAll }));
	}
	if (profile === "production6") {
		return CHAINS_PRODUCTION6;
	}
	console.error(`Unknown ANKR_TEST_PROFILE="${profile}". Use production6 or all.`);
	process.exit(1);
}

async function main() {
	const chains = normalizeChains();

	console.log("Ankr indexing RPC test");
	console.log("Profile:", profile);
	if (profile === "production6") {
		for (const c of chains) {
			console.log(`  ${c.label}: getLogs spans ${c.ranges.join(", ")} blocks`);
		}
	} else {
		console.log("Ranges (all chains):", rangesAll.join(", "));
	}
	console.log("Inter-request delay (ms):", delayMs);
	console.log("");

	const summary = [];

	for (const { path: pathSeg, label, ranges } of chains) {
		const url = rpcUrl(pathSeg);
		process.stdout.write(`[${label}] `);

		const bn = await jsonRpc(url, {
			jsonrpc: "2.0",
			id: 1,
			method: "eth_blockNumber",
			params: [],
		});
		await sleep(delayMs);

		if (!bn.res.ok) {
			console.log(`HTTP ${bn.res.status} (${bn.ms}ms)`);
			summary.push({ label, ok: false, step: "eth_blockNumber", http: bn.res.status });
			continue;
		}
		if (bn.json.error) {
			console.log(`eth_blockNumber error ${bn.json.error.code}: ${bn.json.error.message} (${bn.ms}ms)`);
			summary.push({ label, ok: false, step: "eth_blockNumber", error: bn.json.error });
			continue;
		}

		const latest = BigInt(bn.json.result);
		console.log(`block ${latest} (${bn.ms}ms)`);

		for (const span of ranges) {
			if (latest < BigInt(span)) {
				console.log(`  skip getLogs span=${span}: chain head < span`);
				continue;
			}
			const to = latest;
			const from = latest - BigInt(span - 1);
			const filter = {
				fromBlock: toHex(from),
				toBlock: toHex(to),
				topics: [],
			};

			const gl = await jsonRpc(url, {
				jsonrpc: "2.0",
				id: 2,
				method: "eth_getLogs",
				params: [filter],
			});
			await sleep(delayMs);

			const row = { label, span, ms: gl.ms };
			if (gl.res.status === 429) {
				console.log(`  getLogs ${span} blocks: HTTP 429 Too Many Requests (${gl.ms}ms)`);
				summary.push({ ...row, ok: false, err: "429" });
				continue;
			}
			if (!gl.res.ok) {
				console.log(`  getLogs ${span} blocks: HTTP ${gl.res.status} (${gl.ms}ms)`);
				summary.push({ ...row, ok: false, http: gl.res.status });
				continue;
			}
			if (gl.json.error) {
				const e = gl.json.error;
				console.log(`  getLogs ${span} blocks: error ${e.code} ${e.message} (${gl.ms}ms)`);
				summary.push({ ...row, ok: false, error: e });
				continue;
			}
			if (gl.json._parseError) {
				console.log(`  getLogs ${span} blocks: non-JSON or parse failure (${gl.ms}ms)`);
				summary.push({ ...row, ok: false, err: "parse" });
				continue;
			}
			if (!Array.isArray(gl.json.result)) {
				const t = gl.json.result === null ? "null" : typeof gl.json.result;
				console.log(`  getLogs ${span} blocks: unexpected result type ${t} (${gl.ms}ms)`);
				summary.push({ ...row, ok: false, err: `result:${t}` });
				continue;
			}
			const n = gl.json.result.length;
			console.log(`  getLogs ${span} blocks: ${n} logs (${gl.ms}ms)`);
			summary.push({ ...row, ok: true, logs: n });
		}
		console.log("");
	}

	const failures = summary.filter((s) => s.ok === false);
	console.log("---");
	if (failures.length === 0) {
		console.log("All steps completed without JSON-RPC errors (check log counts / latency above).");
	} else {
		console.log("Failures / rate limits:", failures.length);
		for (const f of failures) {
			console.log(JSON.stringify(f));
		}
		process.exitCode = 1;
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
