import { ADDRESS, ChainId } from "@frankencoin/zchf";
import type { Address } from "viem";
import { base, gnosis, mainnet } from "viem/chains";

export type CowSwapDirection = "buy-zchf" | "sell-zchf";

export type CowSwapNetwork = {
	chainId: ChainId;
	label: string;
	counterAsset: string;
	counterAssetLabel: string;
	liquidityLabel: string;
	note: string;
	suggested?: boolean;
};

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

export const COW_SWAP_NETWORKS: CowSwapNetwork[] = [
	{
		chainId: base.id as ChainId,
		label: "Base",
		counterAsset: "ETH",
		counterAssetLabel: "ETH",
		liquidityLabel: "Suggested",
		note: "Lower gas and good default route for retail-sized ZCHF swaps.",
		suggested: true,
	},
	{
		chainId: mainnet.id as ChainId,
		label: "Ethereum",
		counterAsset: "ETH",
		counterAssetLabel: "ETH",
		liquidityLabel: "Deepest settlement",
		note: "Best when users want Ethereum mainnet settlement and accept higher gas.",
	},
	{
		chainId: gnosis.id as ChainId,
		label: "Gnosis",
		counterAsset: "WXDAI",
		counterAssetLabel: "WXDAI",
		liquidityLabel: "Low gas",
		note: "Low-cost ZCHF swaps on Gnosis. Use CoW Swap directly for unrelated token pairs.",
	},
];

export function getCowSwapNetwork(chainId?: number | null) {
	return COW_SWAP_NETWORKS.find((network) => network.chainId === chainId) ?? null;
}

export function getCowZchfAddress(chainId: ChainId): Address | null {
	const addresses = ADDRESS[chainId] as unknown as Record<string, unknown> | undefined;
	if (!addresses) return null;
	if (typeof addresses.frankencoin === "string") return addresses.frankencoin as Address;
	if (typeof addresses.ccipBridgedFrankencoin === "string") return addresses.ccipBridgedFrankencoin as Address;
	return null;
}

/** ZCHF rows for the desk CoW token list API — one source of truth with {@link getCowZchfAddress}. */
export function getCowDeskZchfTokenListEntries(): CowDeskZchfTokenListEntry[] {
	const out: CowDeskZchfTokenListEntry[] = [];
	for (const network of COW_SWAP_NETWORKS) {
		const address = getCowZchfAddress(network.chainId);
		if (!address) continue;
		out.push({
			chainId: network.chainId,
			address,
			...COW_ZCHF_TOKEN_LIST_META,
		});
	}
	return out;
}

export function getCowRouteLabels(direction: CowSwapDirection, network: CowSwapNetwork) {
	return direction === "buy-zchf"
		? { sell: network.counterAssetLabel, buy: "ZCHF" }
		: { sell: "ZCHF", buy: network.counterAssetLabel };
}
