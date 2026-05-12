import { ADDRESS, BridgedFrankencoinABI, ChainId, FrankencoinABI } from "@frankencoin/zchf";
import { ZCHF_BALANCE_CHAIN_IDS } from "../components/PageTransfer/transferShared";
import { WAGMI_CHAINS } from "../app.config";
import { useMemo } from "react";
import { Address, zeroAddress } from "viem";
import { useReadContracts } from "wagmi";
import { mainnet } from "viem/chains";

export type ZchfChainBalance = {
	chainId: ChainId;
	chainName: string;
	balance: bigint;
	isLoading: boolean;
	error?: string;
};

export function useZchfChainBalances(account?: Address): ZchfChainBalance[] {
	const chainEntries = useMemo(
		() =>
			ZCHF_BALANCE_CHAIN_IDS.map((id) => {
				const chain = WAGMI_CHAINS.find((c) => c.id === id);
				if (!chain) return null;
				const chainAddress = ADDRESS[chain.id as ChainId] as any;
				return {
					chainId: chain.id as ChainId,
					chainName: chain.name,
					tokenAddress: chain.id === mainnet.id ? chainAddress.frankencoin : chainAddress.ccipBridgedFrankencoin,
					abi: chain.id === mainnet.id ? FrankencoinABI : BridgedFrankencoinABI,
				};
			}).filter(Boolean) as Array<{
				chainId: ChainId;
				chainName: string;
				tokenAddress: `0x${string}`;
				abi: typeof FrankencoinABI | typeof BridgedFrankencoinABI;
			}>,
		[]
	);

	const { data, isLoading } = useReadContracts({
		contracts: chainEntries.map((entry) => ({
			address: entry.tokenAddress,
			chainId: entry.chainId,
			abi: entry.abi,
			functionName: "balanceOf",
			args: [account ?? zeroAddress],
		})) as any,
		query: { enabled: Boolean(account) },
	});

	return chainEntries.map((entry, index) => {
		const result = data?.[index] as { status?: string; result?: unknown } | undefined;
		if (!account) return { chainId: entry.chainId, chainName: entry.chainName, balance: 0n, isLoading: false };
		if (isLoading || !data) return { chainId: entry.chainId, chainName: entry.chainName, balance: 0n, isLoading: true };
		if (!result || result.status !== "success" || typeof result.result !== "bigint") {
			return {
				chainId: entry.chainId,
				chainName: entry.chainName,
				balance: 0n,
				isLoading: false,
				error: "Could not load balance",
			};
		}
		return { chainId: entry.chainId, chainName: entry.chainName, balance: result.result, isLoading: false };
	});
}
