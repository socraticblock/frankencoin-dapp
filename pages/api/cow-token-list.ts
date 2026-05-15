import type { NextApiRequest, NextApiResponse } from "next";
import { base, gnosis, mainnet } from "viem/chains";
import { getCowDeskZchfTokenListEntries } from "../../utils/cowswap";

const TOKENS = [
	...getCowDeskZchfTokenListEntries(),
	{
		chainId: mainnet.id,
		address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
		name: "Wrapped Ether",
		symbol: "WETH",
		decimals: 18,
		logoURI: "https://assets.coingecko.com/coins/images/2518/standard/weth.png",
	},
	{
		chainId: base.id,
		address: "0x4200000000000000000000000000000000000006",
		name: "Wrapped Ether",
		symbol: "WETH",
		decimals: 18,
		logoURI: "https://assets.coingecko.com/coins/images/2518/standard/weth.png",
	},
	{
		chainId: mainnet.id,
		address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
		name: "USD Coin",
		symbol: "USDC",
		decimals: 6,
		logoURI: "https://assets.coingecko.com/coins/images/6319/standard/usdc.png",
	},
	{
		chainId: base.id,
		address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
		name: "USD Coin",
		symbol: "USDC",
		decimals: 6,
		logoURI: "https://assets.coingecko.com/coins/images/6319/standard/usdc.png",
	},
	{
		chainId: gnosis.id,
		address: "0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d",
		name: "Wrapped XDAI",
		symbol: "WXDAI",
		decimals: 18,
		logoURI: "https://assets.coingecko.com/coins/images/11062/standard/Identity-Primary-DarkBG.png",
	},
];

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
	res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
	res.status(200).json({
		name: "ZCHF Desk CoW Swap Tokens",
		logoURI: "https://assets.coingecko.com/coins/images/29592/standard/zchf_logo.png",
		timestamp: new Date(0).toISOString(),
		version: { major: 1, minor: 0, patch: 0 },
		tokens: TOKENS,
	});
}
