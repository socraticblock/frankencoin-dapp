import { ADDRESS } from "@frankencoin/zchf";
import type { ChainId } from "@frankencoin/zchf";
import type { Address } from "viem";
import { isAddress } from "viem";
import { base, gnosis, mainnet } from "viem/chains";
import { getCowZchfAddress } from "./cowswap";

export type DeskSwapMode = "get-zchf" | "sell-zchf" | "get-wfps" | "sell-wfps";
export type DeskSwapSide = "buy" | "sell";
export type DeskFrankencoinAsset = "zchf" | "wfps";
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

export const FRANKENCOIN_ASSET_META: Record<DeskFrankencoinAsset, { symbol: string; name: string }> = {
	zchf: { symbol: "ZCHF", name: "Frankencoin" },
	wfps: { symbol: "WFPS", name: "Wrapped Frankencoin Pool Shares" },
};

const TOKEN_LOGOS = {
	zchf: "/coin/zchf.png",
	weth: "https://assets.coingecko.com/coins/images/2518/standard/weth.png",
	usdc: "https://assets.coingecko.com/coins/images/6319/standard/usdc.png",
	usdt: "https://assets.coingecko.com/coins/images/325/standard/Tether.png",
	dai: "https://assets.coingecko.com/coins/images/9956/standard/Badge_Dai.png",
	wbtc: "https://assets.coingecko.com/coins/images/7598/standard/wrapped_bitcoin_wbtc.png",
	cow: "https://assets.coingecko.com/coins/images/24384/standard/CoW-token_logo.png",
	cbbtc: "https://assets.coingecko.com/coins/images/40143/standard/cbbtc.webp",
	wxdai: "https://assets.coingecko.com/coins/images/11062/standard/Identity-Primary-DarkBG.png",
	fps: "/coin/zchf.png",
} as const;

export const DESK_SWAP_CHAINS: DeskChain[] = [
	{
		chainId: base.id as ChainId,
		label: "Base",
		recommended: true,
		note: "Recommended default for most users: practical ZCHF liquidity and lower network costs.",
	},
	{
		chainId: mainnet.id as ChainId,
		label: "Ethereum",
		note: "Mainnet route with more expensive gas. Also the only WFPS route in this desk.",
	},
	{
		chainId: gnosis.id as ChainId,
		label: "Gnosis",
		note: "Low-fee ZCHF route. Quote availability may vary more than Base.",
	},
];

export function modeFromDeskSelection(side: DeskSwapSide, asset: DeskFrankencoinAsset): DeskSwapMode {
	if (side === "buy" && asset === "zchf") return "get-zchf";
	if (side === "sell" && asset === "zchf") return "sell-zchf";
	if (side === "buy" && asset === "wfps") return "get-wfps";
	return "sell-wfps";
}

export function getDeskChain(chainId: number | null | undefined) {
	return DESK_SWAP_CHAINS.find((chain) => chain.chainId === chainId) ?? null;
}

export function getDeskAssets(chainId: ChainId): DeskAsset[] {
	return [...getFrankencoinAssets(chainId), ...getCounterAssets(chainId)];
}

export function getLockedDeskAsset(mode: DeskSwapMode, chainId: ChainId) {
	const assets = getFrankencoinAssets(chainId);
	if (mode === "get-zchf" || mode === "sell-zchf") return assets.find((asset) => asset.symbol === "ZCHF") ?? null;
	if (mode === "get-wfps" || mode === "sell-wfps") return assets.find((asset) => asset.symbol === "WFPS") ?? null;
	return null;
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

	const isBuyingFrankencoinAsset = mode === "get-zchf" || mode === "get-wfps";
	return {
		sellAsset: isBuyingFrankencoinAsset ? counterAsset : lockedAsset,
		buyAsset: isBuyingFrankencoinAsset ? lockedAsset : counterAsset,
		lockedAsset,
		counterAsset,
	};
}

export function isWfpsMode(mode: DeskSwapMode) {
	return mode === "get-wfps" || mode === "sell-wfps";
}

export function isWfpsConfigured() {
	return Boolean(getWfpsAddress(mainnet.id as ChainId));
}

export function getDefaultDeskChainForMode(mode: DeskSwapMode): ChainId {
	return isWfpsMode(mode) ? (mainnet.id as ChainId) : (base.id as ChainId);
}

export function getAllowedDeskChainsForMode(mode: DeskSwapMode) {
	return isWfpsMode(mode) ? DESK_SWAP_CHAINS.filter((chain) => chain.chainId === mainnet.id) : DESK_SWAP_CHAINS;
}

function getFrankencoinAssets(chainId: ChainId): DeskAsset[] {
	const zchfAddress = getCowZchfAddress(chainId);
	const out: DeskAsset[] = [];

	if (zchfAddress) {
		out.push({
			id: `zchf-${chainId}`,
			chainId,
			symbol: "ZCHF",
			name: "Frankencoin",
			address: zchfAddress,
			decimals: 18,
			logoURI: TOKEN_LOGOS.zchf,
			role: "frankencoin",
			enabledIn: ["get-zchf", "sell-zchf"],
		});
	}

	const wfpsAddress = getWfpsAddress(chainId);
	if (wfpsAddress) {
		out.push({
			id: `wfps-${chainId}`,
			chainId,
			symbol: "WFPS",
			name: "Wrapped Frankencoin Pool Shares",
			address: wfpsAddress,
			decimals: 18,
			logoURI: TOKEN_LOGOS.fps,
			role: "frankencoin",
			enabledIn: ["get-wfps", "sell-wfps"],
			note: "WFPS is only enabled when the wrapper address is available in the Frankencoin address package.",
		});
	}

	return out;
}

function getCounterAssets(chainId: ChainId): DeskAsset[] {
	const zchfModes: DeskSwapMode[] = ["get-zchf", "sell-zchf"];
	const allModes: DeskSwapMode[] = ["get-zchf", "sell-zchf", "get-wfps", "sell-wfps"];

	if (chainId === mainnet.id) {
		return [
			counter(chainId, "eth-weth", "WETH", "Wrapped Ether", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", 18, TOKEN_LOGOS.weth, allModes, true),
			counter(chainId, "eth-usdc", "USDC", "USD Coin", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", 6, TOKEN_LOGOS.usdc, allModes),
			counter(chainId, "eth-usdt", "USDT", "Tether USD", "0xdAC17F958D2ee523a2206206994597C13D831ec7", 6, TOKEN_LOGOS.usdt, allModes),
			counter(chainId, "eth-dai", "DAI", "Dai Stablecoin", "0x6B175474E89094C44Da98b954EedeAC495271d0F", 18, TOKEN_LOGOS.dai, allModes),
			counter(chainId, "eth-wbtc", "WBTC", "Wrapped Bitcoin", "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", 8, TOKEN_LOGOS.wbtc, allModes),
			counter(chainId, "eth-cow", "COW", "CoW Protocol Token", "0xDEf1CA1fb7FBcDC777520aa7f396b4E015F497aB", 18, TOKEN_LOGOS.cow, allModes),
		];
	}

	if (chainId === base.id) {
		return [
			counter(chainId, "base-weth", "WETH", "Wrapped Ether", "0x4200000000000000000000000000000000000006", 18, TOKEN_LOGOS.weth, zchfModes, true),
			counter(chainId, "base-usdc", "USDC", "USD Coin", "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", 6, TOKEN_LOGOS.usdc, zchfModes),
			counter(chainId, "base-cbbtc", "cbBTC", "Coinbase Wrapped BTC", "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf", 8, TOKEN_LOGOS.cbbtc, zchfModes),
		];
	}

	if (chainId === gnosis.id) {
		return [
			counter(chainId, "gnosis-wxdai", "WXDAI", "Wrapped XDAI", "0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d", 18, TOKEN_LOGOS.wxdai, zchfModes, true),
			counter(chainId, "gnosis-weth", "WETH", "Wrapped Ether", "0x6A023CCd1ff6F2045C3309768eAd9E68F978f6e1", 18, TOKEN_LOGOS.weth, zchfModes),
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
	return {
		id,
		chainId,
		symbol,
		name,
		address,
		decimals,
		logoURI,
		role: "counterAsset",
		enabledIn,
		recommended,
	};
}

function getWfpsAddress(chainId: ChainId): Address | null {
	if (chainId !== mainnet.id) return null;
	const addresses = ADDRESS[chainId] as unknown as Record<string, unknown> | undefined;
	if (!addresses) return null;
	const candidates = ["wfps", "wFPS", "wrappedFPS", "wrappedFps", "fpsWrapper", "FPSWrapper"];
	for (const key of candidates) {
		const value = addresses[key];
		if (typeof value === "string" && isAddress(value)) return value;
	}
	return null;
}
