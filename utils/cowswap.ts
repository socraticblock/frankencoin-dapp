import { ADDRESS, ChainId } from "@frankencoin/zchf";
import type { Address } from "viem";

const COW_ZCHF_TOKEN_LIST_META = {
	name: "Frankencoin",
	symbol: "ZCHF",
	decimals: 18,
	logoURI: "https://assets.coingecko.com/coins/images/29592/standard/zchf_logo.png",
} as const;

export type CowDeskZchfTokenListEntry = {
	chainId: number;
	address: Address;
	name: string;
	symbol: string;
	decimals: number;
	logoURI: string;
};

export function getCowZchfAddress(chainId: ChainId): Address | null {
	const addresses = ADDRESS[chainId] as unknown as Record<string, unknown> | undefined;
	if (!addresses) return null;
	if (typeof addresses.frankencoin === "string") return addresses.frankencoin as Address;
	if (typeof addresses.ccipBridgedFrankencoin === "string") return addresses.ccipBridgedFrankencoin as Address;
	return null;
}

/** ZCHF rows for the optional CoW token list API. */
export function getCowDeskZchfTokenListEntries(chainIds: ChainId[]): CowDeskZchfTokenListEntry[] {
	return chainIds.flatMap((chainId) => {
		const address = getCowZchfAddress(chainId);
		return address ? [{ chainId, address, ...COW_ZCHF_TOKEN_LIST_META }] : [];
	});
}
