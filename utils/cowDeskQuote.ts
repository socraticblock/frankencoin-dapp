import type { DeskAsset, DeskSwapMode } from "./exchangeAssets";

export type DeskQuoteRequest = {
	chainId: number;
	mode: DeskSwapMode;
	counterAssetId: string;
	sellAmountBeforeFee: string;
	from: string;
	receiver?: string;
};

export type DeskQuoteResponse = {
	chainId: number;
	mode: DeskSwapMode;
	sellAsset: DeskAsset;
	buyAsset: DeskAsset;
	quote?: {
		sellAmount?: string;
		buyAmount?: string;
		feeAmount?: string;
		validTo?: number;
	};
	expiration?: string;
	id?: number;
};

export async function requestDeskQuote(input: DeskQuoteRequest): Promise<DeskQuoteResponse> {
	const response = await fetch("/api/cow-desk-quote", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(input),
	});

	const data = await response.json().catch(() => null);

	if (!response.ok) {
		throw new Error(data?.error || "Quote request failed.");
	}

	return data as DeskQuoteResponse;
}
