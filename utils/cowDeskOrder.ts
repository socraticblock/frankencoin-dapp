import type { Address, Hex, TypedDataDomain } from "viem";
import type { ChainId } from "@frankencoin/zchf";
import type { DeskQuoteResponse } from "./cowDeskQuote";
import { getDeskRoute, type DeskSwapMode } from "./exchangeAssets";

export const COW_VAULT_RELAYER_ADDRESS = "0xC92E8bdf79f0507f65a392b0ab4667716BFE0110" as const;
export const COW_SETTLEMENT_ADDRESS = "0x9008D19f58AAbD9eD0D60971565AA8510560ab41" as const;
export const COW_EMPTY_APP_DATA = "{}";
export const COW_EMPTY_APP_DATA_HASH = "0xb48d38f93eaa084033fc5970bf96e559c33c4cdc07d889ab00b4d63f9590739d" as const;
export const DESK_SWAP_SLIPPAGE_BPS = 50n;
export const BPS_DENOMINATOR = 10_000n;

type QuoteAppDataFields = {
	appData?: unknown;
	appDataHash?: Hex;
};

export type CowOrderToSign = {
	sellToken: Address;
	buyToken: Address;
	receiver: Address;
	sellAmount: string;
	buyAmount: string;
	validTo: number;
	appData: Hex;
	feeAmount: "0";
	kind: "sell";
	partiallyFillable: false;
	sellTokenBalance: "erc20";
	buyTokenBalance: "erc20";
};

export type CowOrderSubmission = Omit<CowOrderToSign, "appData"> & {
	appData: string;
	appDataHash: Hex;
	signingScheme: "eip712";
	signature: Hex;
	from: Address;
	quoteId: number;
};

export type DeskOrderSubmitRequest = {
	chainId: number;
	mode: DeskSwapMode;
	counterAssetId: string;
	order: CowOrderSubmission;
};

export type DeskOrderSubmitResponse = {
	orderUid: string;
	order?: unknown;
};

export const COW_ORDER_TYPES = {
	Order: [
		{ name: "sellToken", type: "address" },
		{ name: "buyToken", type: "address" },
		{ name: "receiver", type: "address" },
		{ name: "sellAmount", type: "uint256" },
		{ name: "buyAmount", type: "uint256" },
		{ name: "validTo", type: "uint32" },
		{ name: "appData", type: "bytes32" },
		{ name: "feeAmount", type: "uint256" },
		{ name: "kind", type: "string" },
		{ name: "partiallyFillable", type: "bool" },
		{ name: "sellTokenBalance", type: "string" },
		{ name: "buyTokenBalance", type: "string" },
	],
} as const;

export function getCowOrderDomain(chainId: number): TypedDataDomain {
	return {
		name: "Gnosis Protocol",
		version: "v2",
		chainId,
		verifyingContract: COW_SETTLEMENT_ADDRESS,
	};
}

export function getCowChainSlug(chainId: number) {
	if (chainId === 1) return "mainnet";
	if (chainId === 100) return "gnosis";
	if (chainId === 8453) return "base";
	return null;
}

export function isDeskExecutionRoute(chainId: number, mode?: DeskSwapMode, counterAssetId?: string) {
	if (!mode || !counterAssetId || !getCowChainSlug(chainId)) return false;
	return Boolean(getDeskRoute(mode, chainId as ChainId, counterAssetId));
}

export function isBaseUsdcToZchfExecutionRoute(chainId: number, mode?: DeskSwapMode, counterAssetId?: string) {
	return isDeskExecutionRoute(chainId, mode, counterAssetId);
}

export function getDeskExecutionLabel({ sellSymbol, buySymbol }: { sellSymbol: string; buySymbol: string }) {
	return `Approve ${sellSymbol} to be sold for ${buySymbol}`;
}

export function buildDeskOrderToSign({
	quote,
	from,
	receiver,
	slippageBps = DESK_SWAP_SLIPPAGE_BPS,
}: {
	quote: DeskQuoteResponse;
	from: Address;
	receiver?: Address;
	slippageBps?: bigint;
}): CowOrderToSign | null {
	const raw = quote.quote;
	if (!raw?.sellAmount || !raw?.buyAmount || !raw.validTo) return null;
	const appData = raw as QuoteAppDataFields;
	const sellAmount = BigInt(raw.sellAmount) + BigInt(raw.feeAmount ?? "0");
	const buyAmount = (BigInt(raw.buyAmount) * (BPS_DENOMINATOR - slippageBps)) / BPS_DENOMINATOR;
	if (sellAmount <= 0n || buyAmount <= 0n) return null;

	return {
		sellToken: quote.sellAsset.address,
		buyToken: quote.buyAsset.address,
		receiver: receiver ?? from,
		sellAmount: sellAmount.toString(),
		buyAmount: buyAmount.toString(),
		validTo: raw.validTo,
		appData: appData.appDataHash ?? COW_EMPTY_APP_DATA_HASH,
		feeAmount: "0",
		kind: "sell",
		partiallyFillable: false,
		sellTokenBalance: "erc20",
		buyTokenBalance: "erc20",
	};
}

export function buildDeskOrderSubmission({
	order,
	quote,
	from,
	signature,
}: {
	order: CowOrderToSign;
	quote: DeskQuoteResponse;
	from: Address;
	signature: Hex;
}): CowOrderSubmission | null {
	if (typeof quote.id !== "number") return null;
	const quoteAppData = quote.quote as QuoteAppDataFields | undefined;
	return {
		...order,
		appData: normalizeCowAppData(quoteAppData?.appData, order.appData),
		appDataHash: order.appData,
		signingScheme: "eip712",
		signature,
		from,
		quoteId: quote.id,
	};
}

export function validateDeskOrderRoute(input: { chainId: number; mode?: DeskSwapMode; counterAssetId?: string }) {
	if (!input.mode || !input.counterAssetId || !isDeskExecutionRoute(input.chainId, input.mode, input.counterAssetId)) return null;
	return getDeskRoute(input.mode, input.chainId as ChainId, input.counterAssetId);
}

export function validateBaseUsdcZchfOrderRoute(input: { chainId: number; mode?: DeskSwapMode; counterAssetId?: string }) {
	return validateDeskOrderRoute(input);
}

export async function submitDeskOrder(input: DeskOrderSubmitRequest): Promise<DeskOrderSubmitResponse> {
	const response = await fetch("/api/cow-desk-order", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(input),
	});
	const data = await response.json().catch(() => null);
	if (!response.ok) throw new Error(data?.error || "Order submission failed.");
	return data as DeskOrderSubmitResponse;
}

export async function requestDeskOrderStatus(chainId: number, orderUid: string) {
	const search = new URLSearchParams({ chainId: String(chainId), orderUid });
	const response = await fetch(`/api/cow-desk-order-status?${search.toString()}`);
	const data = await response.json().catch(() => null);
	if (!response.ok) throw new Error(data?.error || "Order status request failed.");
	return data;
}

function normalizeCowAppData(value: unknown, appDataHash: Hex) {
	if (typeof value === "string") {
		const trimmed = value.trim();
		if (trimmed && trimmed !== "0") return trimmed;
	}
	if (appDataHash.toLowerCase() === COW_EMPTY_APP_DATA_HASH.toLowerCase()) return COW_EMPTY_APP_DATA;
	throw new Error("Quote is missing matching CoW app data. Refresh the quote and try again.");
}
