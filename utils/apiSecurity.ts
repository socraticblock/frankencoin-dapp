export const COW_API_TIMEOUT_MS = 10_000;
export const UINT256_MAX = (1n << 256n) - 1n;
export const UINT256_DECIMAL_RE = /^(0|[1-9]\d{0,77})$/;
export const COW_ORDER_UID_RE = /^0x[a-fA-F0-9]{112}$/;

export async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = COW_API_TIMEOUT_MS) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		return await fetch(url, { ...init, signal: controller.signal });
	} finally {
		clearTimeout(timer);
	}
}

export function withOptionalDetails(error: string, details: unknown) {
	return process.env.NODE_ENV === "production" ? { error } : { error, details };
}

export function isAbortError(error: unknown) {
	return error instanceof Error && error.name === "AbortError";
}

export function parsePositiveUint256(value: unknown): bigint | null {
	if (typeof value !== "string" || !UINT256_DECIMAL_RE.test(value)) return null;
	const parsed = BigInt(value);
	return parsed > 0n && parsed <= UINT256_MAX ? parsed : null;
}

export function isCowOrderUid(value: unknown) {
	return typeof value === "string" && COW_ORDER_UID_RE.test(value);
}

export function isSafeQuoteId(value: unknown) {
	return Number.isSafeInteger(value) && Number(value) >= 0;
}
