import { useEffect, useMemo, useRef } from "react";
import { useSelector } from "react-redux";
import { useBlockNumber, useReadContracts } from "wagmi";
import { Address, formatUnits, isAddress, zeroAddress } from "viem";
import { ADDRESS, ChainId, ChainIdMain, ChainIdSide, SavingsABI } from "@frankencoin/zchf";
import { mainnet } from "viem/chains";
import { normalizeAddress } from "@utils";
import { RootState } from "../../redux/redux.store";

/** Matches SavingsInteractionCard interest math exactly. */
const TICK_DIVISOR = 1_000_000n * 365n * 24n * 60n * 60n;

export function computeClaimableSavingsInterest(
	userSavings: bigint,
	userTicks: bigint,
	currentTicks: bigint,
	rate: bigint
): bigint {
	const safeRate = rate || 0n;
	const locktime = safeRate > 0n && userTicks >= currentTicks ? (userTicks - currentTicks) / safeRate : 0n;
	const tickDiff = currentTicks - userTicks;
	if (userTicks === 0n || locktime > 0n) return 0n;
	return (tickDiff * userSavings) / TICK_DIVISOR;
}

function getSavingsContractAddress(chainId: ChainId): Address | undefined {
	const raw =
		chainId === mainnet.id
			? ADDRESS[chainId as ChainIdMain].savingsReferral
			: ADDRESS[chainId as ChainIdSide].ccipBridgedSavings;
	if (!raw) return undefined;
	return normalizeAddress(raw as Address);
}

export type ChainInterestStatus = "ready" | "loading" | "error" | "no_module";

export type ChainLiveInterest = {
	interestZchf: number | null;
	status: ChainInterestStatus;
};

function parseSavingsTuple(result: unknown): { balance: bigint; ticks: bigint } | null {
	if (!Array.isArray(result) || result.length < 2) return null;
	const balance = result[0];
	const ticks = result[1];
	if (typeof balance !== "bigint" || typeof ticks !== "bigint") return null;
	return { balance, ticks };
}

/**
 * Per-chain claimable interest using the same on-chain reads + `chainStatus.rate` as Earn (SavingsInteractionCard).
 */
export function useLiveSavingsInterestByChain(account: Address | undefined, chainIds: ChainId[]): Map<ChainId, ChainLiveInterest> {
	const { status } = useSelector((state: RootState) => state.savings.savingsInfo);
	const { data: blockNumber } = useBlockNumber({ watch: true });

	const chainMetas = useMemo(() => {
		const list: { chainId: ChainId; savingsAddr: Address; rate: bigint }[] = [];
		for (const chainId of chainIds) {
			const savingsAddr = getSavingsContractAddress(chainId);
			if (!savingsAddr) continue;
			const chainStatus = status?.[chainId]?.[savingsAddr];
			if (!chainStatus) continue;
			list.push({
				chainId,
				savingsAddr,
				rate: BigInt(chainStatus.rate || 0),
			});
		}
		return list;
	}, [chainIds, status]);

	const contracts = useMemo(() => {
		if (!account || !isAddress(account) || account === zeroAddress) return [];
		const list: {
			address: Address;
			chainId: ChainId;
			abi: typeof SavingsABI;
			functionName: "savings" | "currentTicks";
			args?: readonly [Address];
		}[] = [];
		for (const meta of chainMetas) {
			list.push({
				address: meta.savingsAddr,
				chainId: meta.chainId,
				abi: SavingsABI,
				functionName: "savings",
				args: [account],
			});
			list.push({
				address: meta.savingsAddr,
				chainId: meta.chainId,
				abi: SavingsABI,
				functionName: "currentTicks",
			});
		}
		return list;
	}, [account, chainMetas]);

	const queryEnabled = Boolean(account && isAddress(account) && account !== zeroAddress && contracts.length > 0);

	const { data, isPending, refetch } = useReadContracts({
		contracts,
		query: {
			enabled: queryEnabled,
		},
	});

	const prevBlockRef = useRef<bigint | undefined>(undefined);
	useEffect(() => {
		prevBlockRef.current = undefined;
	}, [account]);

	useEffect(() => {
		if (!queryEnabled || blockNumber === undefined) return;
		const prev = prevBlockRef.current;
		prevBlockRef.current = blockNumber;
		if (prev !== undefined && prev !== blockNumber) void refetch();
	}, [blockNumber, queryEnabled, refetch]);

	return useMemo(() => {
		const map = new Map<ChainId, ChainLiveInterest>();

		for (const chainId of chainIds) {
			const savingsAddr = getSavingsContractAddress(chainId);
			if (!savingsAddr) {
				map.set(chainId, { interestZchf: null, status: "no_module" });
				continue;
			}
			if (!status?.[chainId]?.[savingsAddr]) {
				map.set(chainId, { interestZchf: null, status: "loading" });
				continue;
			}
		}

		if (!queryEnabled) {
			for (const meta of chainMetas) {
				map.set(meta.chainId, { interestZchf: null, status: "loading" });
			}
			return map;
		}

		if (chainMetas.length === 0) {
			return map;
		}

		if (isPending || !data) {
			for (const meta of chainMetas) {
				map.set(meta.chainId, { interestZchf: null, status: "loading" });
			}
			return map;
		}

		for (let index = 0; index < chainMetas.length; index++) {
			const meta = chainMetas[index];
			const savingsRes = data[index * 2];
			const ticksRes = data[index * 2 + 1];
			if (
				!savingsRes ||
				savingsRes.status !== "success" ||
				!ticksRes ||
				ticksRes.status !== "success" ||
				typeof ticksRes.result !== "bigint"
			) {
				map.set(meta.chainId, { interestZchf: null, status: "error" });
				continue;
			}
			const parsed = parseSavingsTuple(savingsRes.result);
			if (!parsed) {
				map.set(meta.chainId, { interestZchf: null, status: "error" });
				continue;
			}
			const interestWei = computeClaimableSavingsInterest(parsed.balance, parsed.ticks, ticksRes.result, meta.rate);
			map.set(meta.chainId, {
				interestZchf: Number(formatUnits(interestWei, 18)),
				status: "ready",
			});
		}

		return map;
	}, [chainIds, chainMetas, data, isPending, queryEnabled, status]);
}
