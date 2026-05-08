import { Hash } from "viem";
import { ADDRESS, ChainId, SupportedChain, SupportedChains } from "@frankencoin/zchf";
import { CONFIG, WAGMI_CHAIN, WAGMI_CHAINS } from "../app.config";
import { toast } from "react-toastify";

export const AppUrl = (url: string) => {
	return new URL(url, CONFIG.app).toString();
};

export const ContractUrl = (address: string, chain: SupportedChain = SupportedChains["mainnet"]) => {
	const explorerLink = chain?.blockExplorers?.default.url || "https://etherscan.io/";
	return new URL(`/address/${address}`, explorerLink).toString();
};

export const TxUrl = (hash: Hash, chain: SupportedChain = SupportedChains["mainnet"]) => {
	const explorerLink = chain?.blockExplorers?.default.url || "https://etherscan.io/";
	return new URL(`/tx/${hash}`, explorerLink).toString();
};

export const MorphoMarketUrl = (id: string) => `https://app.morpho.org/ethereum/market/${id}`;

export const getChain = (id: ChainId) => {
	return WAGMI_CHAINS.find((c) => c.id == id) ?? WAGMI_CHAIN;
};

export const getChainByName = (name: string) => {
	return WAGMI_CHAINS.find((c) => c.name.toLowerCase() == name.toLowerCase()) ?? WAGMI_CHAIN;
};

export const getChainByChainSelector = (selector: string | bigint) => {
	const keys = Object.keys(ADDRESS);
	const chainId = keys.find((v, idx) => ADDRESS[Number(v) as ChainId].chainSelector == selector);
	return getChain(Number(chainId) as ChainId);
};

export function showErrorToast({ module, message, error }: { module?: string; message: string; error: unknown }) {
	const lowerMessage = `${message} ${String(error ?? "")}`.toLowerCase();
	let userMessage = "Something went wrong. No transaction was completed. Please try again.";

	if (lowerMessage.includes("network") || lowerMessage.includes("rpc")) {
		userMessage = "Network request failed. Your wallet or RPC provider did not respond. Please try again.";
	} else if (lowerMessage.includes("axios") || lowerMessage.includes("status code")) {
		userMessage = "Protocol data is temporarily unavailable. Your wallet and funds are not affected.";
	} else if (lowerMessage.includes("rejected")) {
		userMessage = "Transaction cancelled. No changes were made.";
	}

	const technical = process.env.NODE_ENV === "development" ? `\nDetails: ${String(error)}` : "";
	toast.error(`${module ?? "Notice"}: ${userMessage}${technical}`, { position: "bottom-right" });
}
