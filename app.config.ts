"use client";

import { ApolloClient, ApolloLink, HttpLink, InMemoryCache, Observable } from "@apollo/client";
import { cookieStorage, createStorage, http } from "@wagmi/core";
import { injected, coinbaseWallet, safe } from "@wagmi/connectors";
import { mainnet, polygon, Chain, arbitrum, optimism, avalanche, gnosis, sonic, base, AppKitNetwork } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import axios from "axios";
import { Address } from "viem";
import { normalizeAddress } from "./utils/format";
import { SupportedChains } from "@frankencoin/zchf";

export type ConfigEnv = {
	verbose: boolean;
	landing: string;
	app: string;
	api: string;
	ponder: string;
	canonicalPonder: string;
	morphoGraph: string;
	rpc: string;
	wagmiId: string;
};

// DEV: Loaded with defaults, not needed for now.
// if (!process.env.NEXT_PUBLIC_WAGMI_ID) throw new Error("Project ID is not available");
// if (!process.env.NEXT_PUBLIC_RPC_KEY) throw new Error("RPC KEY is not available");

const CANONICAL_PONDER_URL = "https://ponder.frankencoin.com";

const normalizeUrl = (url: string): string => url.replace(/\/+$/, "");

const createFallbackLink = (primaryUri: string, fallbackUri: string): ApolloLink => {
	const primary = new HttpLink({ uri: primaryUri });
	const fallback = new HttpLink({ uri: fallbackUri });

	return new ApolloLink(
		(operation) =>
			new Observable((observer) => {
				const primarySub = primary.request(operation)?.subscribe({
					next: (value) => observer.next(value),
					complete: () => observer.complete(),
					error: (error) => {
						if (primaryUri === fallbackUri) {
							observer.error(error);
							return;
						}

						const fallbackSub = fallback.request(operation)?.subscribe({
							next: (value) => observer.next(value),
							complete: () => observer.complete(),
							error: (fallbackError) => observer.error(fallbackError),
						});

						return () => fallbackSub?.unsubscribe();
					},
				});

				return () => primarySub?.unsubscribe();
			})
	);
};

// Config
export const CONFIG: ConfigEnv = {
	verbose: false,

	landing: process.env.NEXT_PUBLIC_LANDINGPAGE_URL || "https://frankencoin.com",
	app: process.env.NEXT_PUBLIC_APP_URL || "https://app.frankencoin.com",
	api: process.env.NEXT_PUBLIC_API_URL || "https://api.frankencoin.com",
	ponder: normalizeUrl(process.env.NEXT_PUBLIC_PONDER_URL || CANONICAL_PONDER_URL),
	canonicalPonder: normalizeUrl(process.env.NEXT_PUBLIC_CANONICAL_PONDER_URL || CANONICAL_PONDER_URL),
	morphoGraph: process.env.NEXT_PUBLIC_MORPHOGRAPH_URL || "https://blue-api.morpho.org/graphql",
	wagmiId: process.env.NEXT_PUBLIC_WAGMI_ID || "3321ad5a4f22083fe6fe82208a4c9ddc",
	rpc: process.env.NEXT_PUBLIC_RPC_KEY || "dhaKbi2HDlKYW1JaSHm1i_hGkE2gnA5t",
};

if (process.env.NODE_ENV !== "production" && CONFIG.verbose) {
	console.log("CONFIG PROFILE", CONFIG);
}

// PONDER CLIENT
export const PONDER_CLIENT = new ApolloClient({
	link: createFallbackLink(CONFIG.ponder, CONFIG.canonicalPonder),
	cache: new InMemoryCache(),
});

export const MORPHOGRAPH_CLIENT = new ApolloClient({
	uri: CONFIG.morphoGraph,
	cache: new InMemoryCache(),
});

// FRANKENCOIN API CLIENT
export const FRANKENCOIN_API_CLIENT = axios.create({
	baseURL: CONFIG.api,
});

// WAGMI CONFIG
export const WAGMI_CHAIN = SupportedChains["mainnet"];
export const WAGMI_CHAINS = Object.values(SupportedChains);
export const WAGMI_METADATA = {
	name: "Frankencoin",
	description: "Frankencoin Frontend Application",
	url: CONFIG.app,
	icons: ["https://avatars.githubusercontent.com/u/37784886"],
};
export const WAGMI_ADAPTER = new WagmiAdapter({
	networks: WAGMI_CHAINS,
	transports: {
		[mainnet.id]: http(`https://eth-mainnet.g.alchemy.com/v2/${CONFIG.rpc}`),
		[polygon.id]: http(`https://polygon-mainnet.g.alchemy.com/v2/${CONFIG.rpc}`),
		[optimism.id]: http(`https://opt-mainnet.g.alchemy.com/v2/${CONFIG.rpc}`),
		[arbitrum.id]: http(`https://arb-mainnet.g.alchemy.com/v2/${CONFIG.rpc}`),
		[base.id]: http(`https://base-mainnet.g.alchemy.com/v2/${CONFIG.rpc}`),
		[avalanche.id]: http(`https://avax-mainnet.g.alchemy.com/v2/${CONFIG.rpc}`),
		[gnosis.id]: http(`https://gnosis-mainnet.g.alchemy.com/v2/${CONFIG.rpc}`),
		[sonic.id]: http(`https://sonic-mainnet.g.alchemy.com/v2/${CONFIG.rpc}`),
	},
	batch: {
		multicall: {
			wait: 200,
		},
	},
	connectors: [
		safe({
			allowedDomains: [/gnosis-safe.io$/, /app.safe.global$/, /dhedge.org$/],
		}),
		injected({ shimDisconnect: true }),
		coinbaseWallet({
			appName: WAGMI_METADATA.name,
			appLogoUrl: WAGMI_METADATA.icons[0],
		}),
	],
	ssr: true,
	storage: createStorage({
		storage: cookieStorage,
	}),
	projectId: CONFIG.wagmiId,
});

export const WAGMI_CONFIG = WAGMI_ADAPTER.wagmiConfig;

// MINT POSITION BLACKLIST
export const MINT_POSITION_BLACKLIST: Address[] = [
	"0x98725eE62833096C1c9bE26001F3cDA9a6241EF3",
	"0x7FF29064edc935571f89266607eAA0b5a51b795d",
];
export const POSITION_BLACKLISTED = (addr: Address): boolean => {
	return MINT_POSITION_BLACKLIST.some((p) => normalizeAddress(p) === normalizeAddress(addr));
};
