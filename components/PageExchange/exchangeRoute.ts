export type ExchangeAction = "fiat" | "swap";

export function parseExchangeRoute(value: unknown): ExchangeAction | null {
	return value === "fiat" || value === "swap" ? value : null;
}
