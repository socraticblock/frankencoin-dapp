import { ADDRESS, BridgedFrankencoinABI, ChainId, FrankencoinABI } from "@frankencoin/zchf";
import { Address } from "viem";
import { arbitrum, avalanche, base, gnosis, mainnet, optimism, polygon, sonic } from "viem/chains";

export const DESK_SUPPORTED_CHAINS = [mainnet, base, polygon, arbitrum, optimism, gnosis, avalanche, sonic];

export function getZchfAddress(chainId: ChainId): Address | undefined {
	const addresses = ADDRESS[chainId] as unknown as Record<string, unknown> | undefined;
	if (!addresses) return undefined;
	if ("frankencoin" in addresses && typeof addresses.frankencoin === "string") return addresses.frankencoin as Address;
	if ("ccipBridgedFrankencoin" in addresses && typeof addresses.ccipBridgedFrankencoin === "string") return addresses.ccipBridgedFrankencoin as Address;
	return undefined;
}

export function getZchfAbi(chainId: ChainId) {
	return chainId === mainnet.id ? FrankencoinABI : BridgedFrankencoinABI;
}

