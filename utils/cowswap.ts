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

const COW_SWAP_BASE_URL = "https://swap.cow.fi";
const COW_SWAP_APP_CODE = "ZCHF-Desk";

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
		note: "Useful for low-cost swaps on Gnosis. Users can change the input token inside CoW Swap.",
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

export function buildCowSwapWidgetUrl(direction: CowSwapDirection, chainId: ChainId) {
	const network = getCowSwapNetwork(chainId);
	const zchfAddress = getCowZchfAddress(chainId);
	if (!network || !zchfAddress) return null;

	const sellAsset = direction === "buy-zchf" ? network.counterAsset : zchfAddress;
	const buyAsset = direction === "buy-zchf" ? zchfAddress : network.counterAsset;
	const params = new URLSearchParams({
		appCode: COW_SWAP_APP_CODE,
		theme: "light",
		tradeType: "swap",
		disablePostTradeTips: "true",
		hideOrdersTable: "false",
	});

	return `${COW_SWAP_BASE_URL}/#/${chainId}/swap/${sellAsset}/${buyAsset}?${params.toString()}`;
}

export function getCowRouteLabels(direction: CowSwapDirection, network: CowSwapNetwork) {
	return direction === "buy-zchf"
		? { sell: network.counterAssetLabel, buy: "ZCHF" }
		: { sell: "ZCHF", buy: network.counterAssetLabel };
}
