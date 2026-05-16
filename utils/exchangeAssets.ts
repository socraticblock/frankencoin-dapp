import type { ChainId } from "@frankencoin/zchf";
import type { Address } from "viem";
import { base, mainnet } from "viem/chains";
import { getCowZchfAddress } from "./cowswap";

export type DeskSwapMode = "get-zchf" | "sell-zchf";
export type DeskSwapSide = "buy" | "sell";
export type DeskAssetRole = "frankencoin" | "counterAsset";

export type DeskAsset = {
	id: string;
	chainId: ChainId;
	symbol: string;
	name: string;
	address: Address;
	decimals: number;
	logoURI: string;
	role: DeskAssetRole;
	enabledIn: DeskSwapMode[];
	recommended?: boolean;
	note?: string;
};

export type DeskChain = {
	chainId: ChainId;
	label: string;
	recommended?: boolean;
	note: string;
};

const TOKEN_LOGOS = {
	zchf: "/coin/zchf.png",
	weth: "https://assets.coingecko.com/coins/images/2518/standard/weth.png",
	usdc: "https://assets.coingecko.com/coins/images/6319/standard/usdc.png",
	usdt: "https://assets.coingecko.com/coins/images/325/standard/Tether.png",
	dai: "https://assets.coingecko.com/coins/images/9956/standard/Badge_Dai.png",
	wbtc: "https://assets.coingecko.com/coins/images/7598/standard/wrapped_bitcoin_wbtc.png",
	cbbtc: "https://assets.coingecko.com/coins/images/40143/standard/cbbtc.webp",
} as const;

export const DESK_SWAP_CHAINS: DeskChain[] = [
	{
		chainId: base.id as ChainId,
		label: "Base",
		recommended: true,
		note: "Recommended for most users: lower network costs and working ZCHF quotes.",
	},
	{
		chainId: mainnet.id as ChainId,
		label: "Ethereum",
		note: "Ethereum ZCHF routes are available, but network costs may be higher.",
	},
];

export function modeFromDeskSelection(side: DeskSwapSide): DeskSwapMode {
	return side === "buy" ? "get-zchf" : "sell-zchf";
}

export function getDeskChain(chainId: number | null | undefined) {
	return DESK_SWAP_CHAINS.find((chain) => chain.chainId === chainId) ?? null;
}

export function getDeskAssets(chainId: ChainId): DeskAsset[] {
	return [...getFrankencoinAssets(chainId), ...getCounterAssets(chainId)];
}

export function getLockedDeskAsset(mode: DeskSwapMode, chainId: ChainId) {
	return getFrankencoinAssets(chainId).find((asset) => asset.enabledIn.includes(mode)) ?? null;
}

export function getDeskCounterAssets(mode: DeskSwapMode, chainId: ChainId) {
	return getCounterAssets(chainId).filter((asset) => asset.enabledIn.includes(mode));
}

export function getDeskAssetById(chainId: ChainId, id: string) {
	return getDeskAssets(chainId).find((asset) => asset.id === id) ?? null;
}

export function getDeskRoute(mode: DeskSwapMode, chainId: ChainId, counterAssetId: string) {
	const lockedAsset = getLockedDeskAsset(mode, chainId);
	const counterAsset = getDeskAssetById(chainId, counterAssetId);
	if (!lockedAsset || !counterAsset || counterAsset.role !== "counterAsset" || !counterAsset.enabledIn.includes(mode)) return null;

	const isBuyingZchf = mode === "get-zchf";
	return {
		sellAsset: isBuyingZchf ? counterAsset : lockedAsset,
		buyAsset: isBuyingZchf ? lockedAsset : counterAsset,
		lockedAsset,
		counterAsset,
	};
}

export function getDefaultDeskChainForMode(_mode: DeskSwapMode): ChainId {
	return base.id as ChainId;
}

export function getAllowedDeskChainsForMode(_mode: DeskSwapMode) {
	return DESK_SWAP_CHAINS;
}

function getFrankencoinAssets(chainId: ChainId): DeskAsset[] {
	const zchfAddress = getCowZchfAddress(chainId);
	if (!zchfAddress) return [];
	return [
		{
			id: `zchf-${chainId}`,
			chainId,
			symbol: "ZCHF",
			name: "Frankencoin",
			address: zchfAddress,
			decimals: 18,
			logoURI: TOKEN_LOGOS.zchf,
			role: "frankencoin",
			enabledIn: ["get-zchf", "sell-zchf"],
		},
	];
}

function getCounterAssets(chainId: ChainId): DeskAsset[] {
	const modes: DeskSwapMode[] = ["get-zchf", "sell-zchf"];

	if (chainId === base.id) {
		return [
			counter(chainId, "base-usdc", "USDC", "USD Coin", "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", 6, TOKEN_LOGOS.usdc, modes, true),
			counter(chainId, "base-weth", "WETH", "Wrapped Ether", "0x4200000000000000000000000000000000000006", 18, TOKEN_LOGOS.weth, modes),
			counter(chainId, "base-cbbtc", "cbBTC", "Coinbase Wrapped BTC", "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf", 8, TOKEN_LOGOS.cbbtc, modes),
		];
	}

	if (chainId === mainnet.id) {
		return [
			counter(chainId, "eth-weth", "WETH", "Wrapped Ether", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", 18, TOKEN_LOGOS.weth, modes, true),
			counter(chainId, "eth-usdc", "USDC", "USD Coin", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", 6, TOKEN_LOGOS.usdc, modes),
			counter(chainId, "eth-usdt", "USDT", "Tether USD", "0xdAC17F958D2ee523a2206206994597C13D831ec7", 6, TOKEN_LOGOS.usdt, modes),
			counter(chainId, "eth-dai", "DAI", "Dai Stablecoin", "0x6B175474E89094C44Da98b954EedeAC495271d0F", 18, TOKEN_LOGOS.dai, modes),
			counter(chainId, "eth-wbtc", "WBTC", "Wrapped Bitcoin", "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", 8, TOKEN_LOGOS.wbtc, modes),
		];
	}

	return [];
}

function counter(
	chainId: ChainId,
	id: string,
	symbol: string,
	name: string,
	address: Address,
	decimals: number,
	logoURI: string,
	enabledIn: DeskSwapMode[],
	recommended = false
): DeskAsset {
	return { id, chainId, symbol, name, address, decimals, logoURI, role: "counterAsset", enabledIn, recommended };
}
