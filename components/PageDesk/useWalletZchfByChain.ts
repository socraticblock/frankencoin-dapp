import { useMemo } from "react";
import { ChainId } from "@frankencoin/zchf";
import { Address, formatUnits, zeroAddress } from "viem";
import { useReadContracts } from "wagmi";
import { getZchfAbi, getZchfAddress } from "./deskChains";

export type WalletZchfStatus = "loading" | "loaded" | "error" | "unsupported";

export type WalletZchfByChain = {
	chainId: ChainId;
	status: WalletZchfStatus;
	balance: number | null;
};

const WALLET_ZCHF_DISPLAY_THRESHOLD = 0.01;

export function useWalletZchfByChain({
	address,
	isConnected,
	chainsToRead,
	supportedChains,
}: {
	address?: Address;
	isConnected: boolean;
	chainsToRead: ChainId[];
	supportedChains: ChainId[];
}): WalletZchfByChain[] {
	const connectedAddress = address || zeroAddress;

	const walletZchfContracts = useMemo(
		() =>
			chainsToRead
				.map((chainId) => {
					const zchfAddress = getZchfAddress(chainId);
					if (!zchfAddress) return null;
					return {
						address: zchfAddress,
						chainId,
						abi: getZchfAbi(chainId),
						functionName: "balanceOf",
						args: [connectedAddress],
					};
				})
				.filter(Boolean),
		[chainsToRead, connectedAddress]
	);

	const {
		data: walletZchfResults,
		isLoading: walletZchfLoading,
		isError: walletZchfReadError,
	} = useReadContracts({
		contracts: walletZchfContracts as any,
		query: { enabled: Boolean(isConnected && address && walletZchfContracts.length > 0) },
	});

	return useMemo<WalletZchfByChain[]>(() => {
		const resultByChain = new Map<ChainId, WalletZchfByChain>();
		let resultIndex = 0;

		for (const chainId of chainsToRead) {
			const zchfAddress = getZchfAddress(chainId);
			if (!zchfAddress) {
				resultByChain.set(chainId, { chainId, status: "unsupported", balance: null });
				continue;
			}

			const result = walletZchfResults?.[resultIndex++] as { status?: string; result?: unknown; error?: unknown } | undefined;
			if (!isConnected || !address) {
				resultByChain.set(chainId, { chainId, status: "unsupported", balance: null });
				continue;
			}
			if (walletZchfLoading || !walletZchfResults) {
				resultByChain.set(chainId, { chainId, status: "loading", balance: null });
				continue;
			}
			if (walletZchfReadError || !result || result.status !== "success" || typeof result.result !== "bigint") {
				resultByChain.set(chainId, { chainId, status: "error", balance: null });
				continue;
			}

			const balance = Number(formatUnits(result.result, 18));
			resultByChain.set(chainId, { chainId, status: "loaded", balance: balance >= WALLET_ZCHF_DISPLAY_THRESHOLD ? balance : 0 });
		}

		return supportedChains.map((chainId) => resultByChain.get(chainId) ?? { chainId, status: isConnected && address ? "loading" : "unsupported", balance: null });
	}, [address, chainsToRead, isConnected, supportedChains, walletZchfLoading, walletZchfReadError, walletZchfResults]);
}

