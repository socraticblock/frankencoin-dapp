import type { NextApiRequest, NextApiResponse } from "next";

export type RateLimitConfig = {
	/** Stable route id, e.g. cow-desk-quote */
	id: string;
	limit: number;
	windowSec: number;
};

export const COW_DESK_RATE_LIMITS = {
	quote: { id: "cow-desk-quote", limit: 30, windowSec: 60 },
	order: { id: "cow-desk-order", limit: 10, windowSec: 60 },
	orderStatus: { id: "cow-desk-order-status", limit: 60, windowSec: 60 },
} as const satisfies Record<string, RateLimitConfig>;

function getClientIp(req: NextApiRequest): string {
	const forwarded = req.headers["x-forwarded-for"];
	if (typeof forwarded === "string") return forwarded.split(",")[0]?.trim() || "unknown";
	if (Array.isArray(forwarded)) return forwarded[0]?.trim() || "unknown";
	return req.socket.remoteAddress ?? "unknown";
}

async function upstashPipeline(commands: (string | number)[][]) {
	const url = process.env.UPSTASH_REDIS_REST_URL;
	const token = process.env.UPSTASH_REDIS_REST_TOKEN;
	if (!url || !token) return null;

	const response = await fetch(url, {
		method: "POST",
		headers: { Authorization: `Bearer ${token}` },
		body: JSON.stringify(commands),
	});
	if (!response.ok) return null;
	const data = (await response.json()) as { result?: unknown }[];
	return data;
}

/** Returns true when the request may continue. */
export async function applyRateLimit(req: NextApiRequest, res: NextApiResponse, config: RateLimitConfig): Promise<boolean> {
	const isProduction = process.env.NODE_ENV === "production";
	const hasUpstash = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

	if (!hasUpstash) {
		if (isProduction) {
			res.status(503).json({ error: "Service temporarily unavailable." });
			return false;
		}
		return true;
	}

	const ip = getClientIp(req);
	const windowKey = Math.floor(Date.now() / (config.windowSec * 1000));
	const key = `ratelimit:${config.id}:${ip}:${windowKey}`;

	try {
		const results = await upstashPipeline([
			["INCR", key],
			["EXPIRE", key, config.windowSec * 2],
		]);
		const count = Number(results?.[0]?.result ?? 0);
		if (count > config.limit) {
			res.setHeader("Retry-After", String(config.windowSec));
			res.status(429).json({ error: "Too many requests. Please try again later." });
			return false;
		}
		return true;
	} catch {
		if (isProduction) {
			res.status(503).json({ error: "Service temporarily unavailable." });
			return false;
		}
		return true;
	}
}
