export type ExchangeAction = "fiat" | "swap" | "convert";

export function parseExchangeRoute(value: unknown): ExchangeAction | null {
	return value === "fiat" || value === "swap" || value === "convert" ? value : null;
}
