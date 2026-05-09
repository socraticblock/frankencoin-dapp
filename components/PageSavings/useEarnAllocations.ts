import { useLiveSavingsInterestByChain, ChainInterestStatus } from "@components/PageHome/useLiveSavingsInterestByChain";
import { RootState } from "../../redux/redux.store";
import { SavingsBalance } from "@frankencoin/api";
import { ADDRESS, BridgedFrankencoinABI, ChainId, FrankencoinABI } from "@frankencoin/zchf";
import { normalizeAddress } from "@utils";
import { useMemo } from "react";
import { useSelector } from "react-redux";
import { useChainId, useConnection, useReadContracts } from "wagmi";
import { Address, formatUnits, isAddress, zeroAddress } from "viem";
import { arbitrum, avalanche, base, gnosis, mainnet, optimism, polygon, sonic } from "viem/chains";

export type WalletZchfStatus = "loading" | "loaded" | "error" | "unsupported";

export type EarnChainRow = {
	chainId: ChainId;
	name: string;
	savingsZchf: number | null;
	savingsStatus: "loading" | "ready" | "none";
	walletZchf: number | null;
	walletStatus: WalletZchfStatus;
	interestZchf: number | null;
	interestStatus: ChainInterestStatus;
};

function readBigIntField(source: unknown, key: string): bigint | null {
	if (!source || typeof source !== "object") return null;
	const raw = (source as Record<string, unknown>)[key];
	if (typeof raw === "bigint") return raw;
	if (typeof raw === "number" && Number.isFinite(raw)) return BigInt(Math.trunc(raw));
	if (typeof raw === "string" && raw.length > 0) {
		try {
			return BigInt(raw);
		} catch {
			return null;
		}
	}
	return null;
}

function getSavingsEntriesFromRedux(source: unknown): { chainId: ChainId; balance: bigint }[] {
	if (!source || typeof source !== "object") return [];
	const sections = Object.values(source as Record<string, unknown>);
	const rows: { chainId: ChainId; balance: bigint }[] = [];

	for (const section of sections) {
		if (!section || typeof section !== "object") continue;
		const records = Object.values(section as Record<string, unknown>);
		for (const record of records) {
			if (!record || typeof record !== "object") continue;
			const chainIdValue = (record as SavingsBalance).chainId;
			const balanceValue = readBigIntField(record, "balance");
			if (typeof chainIdValue !== "number" || balanceValue === null) continue;
			rows.push({ chainId: chainIdValue as ChainId, balance: balanceValue });
		}
	}
	return rows;
}

function getZchfAddress(chainId: ChainId): Address | undefined {
	const addresses = ADDRESS[chainId] as unknown as Record<string, unknown> | undefined;
	if (!addresses) return undefined;
	if ("frankencoin" in addresses && typeof addresses.frankencoin === "string") return addresses.frankencoin as Address;
	if ("ccipBridgedFrankencoin" in addresses && typeof addresses.ccipBridgedFrankencoin === "string") {
		return addresses.ccipBridgedFrankencoin as Address;
	}
	return undefined;
}

const SUPPORTED_VIEM_CHAINS = [mainnet, base, polygon, arbitrum, optimism, gnosis, avalanche, sonic] as const;

/**
 * Per-chain savings balance, wallet ZCHF, and live claimable interest for the Earn desk.
 */
export function useEarnAllocations(accountOverride?: Address) {
	const { address, isConnected } = useConnection();
	const walletChainId = useChainId() as ChainId;
	const { savingsLoaded, savingsBalance } = useSelector((state: RootState) => state.savings);

	const connectedAddress = address || zeroAddress;
	const account: Address =
		accountOverride && isAddress(accountOverride) && accountOverride !== zeroAddress ? accountOverride : connectedAddress;

	const supportedChains = useMemo(() => [...SUPPORTED_VIEM_CHAINS], []);
	const supportedChainIds = useMemo(() => supportedChains.map((c) => c.id as ChainId), [supportedChains]);

	const savingsEntries = useMemo(() => getSavingsEntriesFromRedux(savingsBalance), [savingsBalance]);

	const liveInterestByChain = useLiveSavingsInterestByChain(
		isConnected && account && account !== zeroAddress ? normalizeAddress(account) : undefined,
		supportedChainIds
	);

	const walletZchfContracts = useMemo(
		() =>
			supportedChains
				.map((chainItem) => {
					const zchfAddress = getZchfAddress(chainItem.id as ChainId);
					if (!zchfAddress) return null;
					return {
						address: zchfAddress,
						chainId: chainItem.id,
						abi: chainItem.id === mainnet.id ? FrankencoinABI : BridgedFrankencoinABI,
						functionName: "balanceOf",
						args: [account],
					};
				})
				.filter(Boolean),
		[account, supportedChains]
	);

	const {
		data: walletZchfResults,
		isLoading: walletZchfLoading,
		isError: walletZchfReadError,
	} = useReadContracts({
		contracts: walletZchfContracts as any,
		query: { enabled: Boolean(isConnected && account && account !== zeroAddress && walletZchfContracts.length > 0) },
	});

	const walletZchfByChain = useMemo(() => {
		let resultIndex = 0;
		return supportedChains.map((chainItem) => {
			const chainKey = chainItem.id as ChainId;
			const zchfAddress = getZchfAddress(chainKey);
			if (!zchfAddress) return { chainId: chainKey, status: "unsupported" as const, balance: null as number | null };
			const result = walletZchfResults?.[resultIndex++] as { status?: string; result?: unknown; error?: unknown } | undefined;
			if (!isConnected || !account || account === zeroAddress || walletZchfLoading || !walletZchfResults) {
				return { chainId: chainKey, status: "loading" as const, balance: null };
			}
			if (walletZchfReadError || !result || result.status !== "success" || typeof result.result !== "bigint") {
				return { chainId: chainKey, status: "error" as const, balance: null };
			}
			return { chainId: chainKey, status: "loaded" as const, balance: Number(formatUnits(result.result, 18)) };
		});
	}, [account, isConnected, supportedChains, walletZchfLoading, walletZchfReadError, walletZchfResults]);

	const chainRows: EarnChainRow[] = useMemo(() => {
		const savingsByChain = new Map<ChainId, bigint>();
		for (const entry of savingsEntries) {
			savingsByChain.set(entry.chainId, entry.balance);
		}

		return supportedChains.map((chainItem) => {
			const chainKey = chainItem.id as ChainId;
			const hasEntry = savingsByChain.has(chainKey);
			const bal = savingsByChain.get(chainKey);
			const knownSavings =
				savingsLoaded && isConnected && account !== zeroAddress
					? hasEntry
						? Number(formatUnits(bal ?? 0n, 18))
						: 0
					: null;
			const savingsStatus: EarnChainRow["savingsStatus"] =
				!isConnected || account === zeroAddress ? "none" : !savingsLoaded ? "loading" : "ready";

			const live = liveInterestByChain.get(chainKey);
			const walletEntry = walletZchfByChain.find((w) => w.chainId === chainKey)!;

			return {
				chainId: chainKey,
				name: chainItem.name,
				savingsZchf: knownSavings,
				savingsStatus,
				walletZchf: walletEntry.status === "loaded" ? walletEntry.balance : null,
				walletStatus: walletEntry.status,
				interestZchf:
					live?.status === "ready" && live.interestZchf !== null ? live.interestZchf : live?.status === "ready" ? 0 : null,
				interestStatus: live?.status ?? "loading",
			};
		});
	}, [account, isConnected, liveInterestByChain, savingsEntries, savingsLoaded, supportedChains, walletZchfByChain]);

	const activeAllocationRows = useMemo(() => {
		return chainRows.filter((row) => {
			const s = row.savingsZchf;
			const hasSavings = typeof s === "number" && s > 0;
			const intReady = row.interestStatus === "ready" && (row.interestZchf ?? 0) > 0;
			return hasSavings || intReady || (row.interestStatus === "loading" && hasSavings);
		});
	}, [chainRows]);

	const sortedActiveAllocations = useMemo(() => {
		return [...activeAllocationRows].sort((a, b) => {
			const ai = a.interestStatus === "ready" ? (a.interestZchf ?? 0) : -1;
			const bi = b.interestStatus === "ready" ? (b.interestZchf ?? 0) : -1;
			if (bi !== ai) return bi - ai;
			return (b.savingsZchf ?? 0) - (a.savingsZchf ?? 0);
		});
	}, [activeAllocationRows]);

	const totalEarningZchf = useMemo(() => {
		if (!isConnected || account === zeroAddress) return null;
		if (!savingsLoaded) return null;
		let sum = 0;
		for (const row of chainRows) {
			if (row.savingsZchf !== null) sum += row.savingsZchf;
		}
		return sum;
	}, [account, chainRows, isConnected, savingsLoaded]);

	const { totalInterestReadyZchf, interestTotalsIncomplete } = useMemo(() => {
		if (!isConnected || account === zeroAddress) {
			return { totalInterestReadyZchf: null as number | null, interestTotalsIncomplete: false };
		}
		let sum = 0;
		let incomplete = false;
		for (const row of chainRows) {
			const hasSavings = (row.savingsZchf ?? 0) > 0;
			if (!hasSavings && (row.interestZchf ?? 0) <= 0 && row.interestStatus !== "ready") continue;
			if (row.interestStatus === "loading" || row.interestStatus === "no_module") {
				if (hasSavings) incomplete = true;
				continue;
			}
			if (row.interestStatus === "error") {
				if (hasSavings) incomplete = true;
				continue;
			}
			if (row.interestStatus === "ready" && row.interestZchf !== null) {
				sum += row.interestZchf;
			}
		}
		return { totalInterestReadyZchf: incomplete ? null : sum, interestTotalsIncomplete: incomplete };
	}, [account, chainRows, isConnected]);

	const activeEarningChainCount = useMemo(() => {
		return chainRows.filter((row) => (row.savingsZchf ?? 0) > 0).length;
	}, [chainRows]);

	const defaultSelectedChainId = useMemo((): ChainId => {
		if (!isConnected || account === zeroAddress) return mainnet.id as ChainId;
		const byInterest = [...chainRows]
			.filter((r) => r.interestStatus === "ready" && (r.interestZchf ?? 0) > 0)
			.sort((a, b) => (b.interestZchf ?? 0) - (a.interestZchf ?? 0));
		if (byInterest[0]) return byInterest[0].chainId;
		const byBal = [...chainRows]
			.filter((r) => (r.savingsZchf ?? 0) > 0)
			.sort((a, b) => (b.savingsZchf ?? 0) - (a.savingsZchf ?? 0));
		if (byBal[0]) return byBal[0].chainId;
		return walletChainId ?? (mainnet.id as ChainId);
	}, [account, chainRows, isConnected, walletChainId]);

	return {
		supportedChains,
		supportedChainIds,
		chainRows,
		activeAllocationRows: sortedActiveAllocations,
		totalEarningZchf,
		totalInterestReadyZchf,
		interestTotalsIncomplete,
		activeEarningChainCount,
		savingsLoaded,
		defaultSelectedChainId,
		liveInterestByChain,
	};
}

const EARN_PAGE_CHAIN_IDS: ChainId[] = [
	mainnet.id,
	base.id,
	polygon.id,
	arbitrum.id,
	optimism.id,
	gnosis.id,
	avalanche.id,
	sonic.id,
] as ChainId[];

export function parseChainIdQuery(raw: string | string[] | undefined): ChainId | null {
	if (raw === undefined) return null;
	const s = Array.isArray(raw) ? raw[0] : raw;
	const n = Number.parseInt(String(s), 10);
	if (!Number.isFinite(n)) return null;
	if (!EARN_PAGE_CHAIN_IDS.includes(n as ChainId)) return null;
	return n as ChainId;
}
