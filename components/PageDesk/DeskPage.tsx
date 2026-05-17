import Head from "next/head";
import AppNotice from "@components/AppNotice";
import AppPageHeader from "@components/AppPageHeader";
import DetectedAcrossChainsPanel, { ChainAction, ChainRow } from "@components/PageHome/DetectedAcrossChainsPanel";
import { useLiveSavingsInterestByChain } from "@components/PageHome/useLiveSavingsInterestByChain";
import DeskChallengeAlert from "@components/PageDesk/DeskChallengeAlert";
import DeskConfidenceSection from "@components/PageDesk/DeskConfidenceSection";
import DeskHeaderStatus from "@components/PageDesk/DeskHeaderStatus";
import DeskOverviewGrid from "@components/PageDesk/DeskOverviewGrid";
import DeskSuggestion from "@components/PageDesk/DeskSuggestion";
import type { CockpitCardProps } from "@components/PageDesk/deskTypes";
import { DESK_SUPPORTED_CHAINS } from "@components/PageDesk/deskChains";
import { getSavingsEntries } from "@components/PageDesk/deskSavings";
import { useDelayedTrue } from "@components/PageDesk/useDelayedTrue";
import { useWalletZchfByChain } from "@components/PageDesk/useWalletZchfByChain";
import { useAppKitNetwork } from "@reown/appkit/react";
import { useChainId, useConnection, useReadContract } from "wagmi";
import { formatCurrency, getChain, normalizeAddress } from "@utils";
import { ADDRESS, ChainId, EquityABI } from "@frankencoin/zchf";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/redux.store";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Address, formatUnits, zeroAddress } from "viem";
import { useServiceStatus } from "../../hooks/useServiceStatus";
import { useBorrowingOverview } from "../../hooks/useBorrowingOverview";
import { arbitrum, base, mainnet } from "viem/chains";
import { useRouter } from "next/router";

const PENDING_CHAIN_SWITCH_MS = 90_000;
const WALLET_ZCHF_DISPLAY_THRESHOLD = 0.01;

export default function MainPage() {
	const { address, isConnected } = useConnection();
	const router = useRouter();
	const appKitNetwork = useAppKitNetwork();
	const chainId = useChainId();
	const chain = getChain(chainId as ChainId);
	const { openPositions } = useSelector((state: RootState) => state.positions);
	const borrowingOverview = useBorrowingOverview();
	const { savingsLoaded, savingsBalance } = useSelector((state: RootState) => state.savings);
	const serviceStatus = useServiceStatus();
	const allChainsReady = useDelayedTrue(600);

	const connectedAddress = address || zeroAddress;
	const currentChainId = chain.id;
	const supportedChains = useMemo(() => DESK_SUPPORTED_CHAINS, []);
	const supportedChainIds = useMemo(() => supportedChains.map((c) => c.id as ChainId), [supportedChains]);
	const chainsToRead = useMemo(() => {
		if (allChainsReady) return supportedChainIds;
		return supportedChainIds.includes(currentChainId as ChainId) ? [currentChainId as ChainId] : [mainnet.id as ChainId];
	}, [allChainsReady, currentChainId, supportedChainIds]);

	const liveInterestByChain = useLiveSavingsInterestByChain(
		isConnected && address ? (normalizeAddress(address) as Address) : undefined,
		supportedChainIds,
		{ live: false, refetchInterval: 60_000, staleTime: 30_000 }
	);

	const walletZchfByChain = useWalletZchfByChain({
		address: isConnected && address ? (normalizeAddress(address) as Address) : undefined,
		isConnected: Boolean(isConnected && address),
		chainsToRead,
		supportedChains: supportedChainIds,
	});

	const { data: fpsHoldingsRaw, isLoading: fpsLoading } = useReadContract({
		address: ADDRESS[mainnet.id].equity,
		chainId: mainnet.id,
		abi: EquityABI,
		functionName: "balanceOf",
		args: [connectedAddress],
		query: { enabled: Boolean(isConnected && address) },
	});

	const myBorrowedZchf = useMemo(() => {
		if (!isConnected || !address) return null;
		return openPositions
			.filter((p) => normalizeAddress(p.owner) === normalizeAddress(address))
			.reduce((sum, p) => sum + Number(formatUnits(BigInt(p.minted), 18)), 0);
	}, [isConnected, address, openPositions]);

	const savingsEntries = useMemo(() => getSavingsEntries(savingsBalance), [savingsBalance]);

	const allReadableWalletZchfLoaded = useMemo(
		() => Boolean(isConnected && address) && walletZchfByChain.filter((entry) => entry.status !== "unsupported").every((entry) => entry.status === "loaded"),
		[address, isConnected, walletZchfByChain]
	);

	const hasWalletZchfErrors = useMemo(() => walletZchfByChain.some((entry) => entry.status === "error"), [walletZchfByChain]);

	const totalWalletZchf = useMemo(() => {
		if (!allReadableWalletZchfLoaded) return null;
		const total = walletZchfByChain.reduce((acc, entry) => acc + (entry.balance ?? 0), 0);
		return total >= WALLET_ZCHF_DISPLAY_THRESHOLD ? total : 0;
	}, [allReadableWalletZchfLoaded, walletZchfByChain]);

	const fpsHoldings = useMemo(() => {
		if (!isConnected || !address || fpsLoading || typeof fpsHoldingsRaw !== "bigint") return null;
		return Number(formatUnits(fpsHoldingsRaw, 18));
	}, [isConnected, address, fpsLoading, fpsHoldingsRaw]);

	const protocolLive = serviceStatus.every((s) => s.isLoaded);
	const apiStatus = serviceStatus.find((s) => s.id === "api")?.isLoaded ?? false;
	const indexerStatus = serviceStatus.find((s) => s.id === "ponder")?.isLoaded ?? false;
	const dataUnavailable = isConnected && address ? !savingsLoaded && (!apiStatus || !indexerStatus) : false;
	const hasBorrowing = (myBorrowedZchf ?? 0) > 0;

	const totalSavings = useMemo(() => {
		if (!isConnected || !address || !savingsLoaded) return null;
		return savingsEntries.reduce((acc, entry) => acc + Number(formatUnits(entry.balance, 18)), 0);
	}, [isConnected, address, savingsLoaded, savingsEntries]);

	const chainsWithPositiveSavingsBalance = useMemo(() => {
		const set = new Set<ChainId>();
		for (const entry of savingsEntries) if (entry.balance > 0n) set.add(entry.chainId);
		return set;
	}, [savingsEntries]);

	const interestAggregate = useMemo(() => {
		if (!isConnected || !address) return { total: null as number | null, loading: false, errorNote: null as string | null };
		if (!savingsLoaded) return { total: null, loading: true, errorNote: null };
		if (chainsWithPositiveSavingsBalance.size === 0) return { total: 0, loading: false, errorNote: null };

		let sum = 0;
		for (const chainId of chainsWithPositiveSavingsBalance) {
			const live = liveInterestByChain.get(chainId);
			if (!live || live.status === "loading") return { total: null, loading: true, errorNote: null };
			if (live.status === "error" || live.status === "no_module") return { total: null, loading: false, errorNote: "Some interest data could not be loaded." };
			sum += live.interestZchf ?? 0;
		}
		return { total: sum, loading: false, errorNote: null };
	}, [isConnected, address, savingsLoaded, chainsWithPositiveSavingsBalance, liveInterestByChain]);

	const earnTargetChainId = useMemo(() => {
		if (!isConnected || !address) return currentChainId as ChainId;
		let bestInterest = -1;
		let bestChain: ChainId | null = null;
		for (const [cid, live] of liveInterestByChain) {
			if (live.status === "ready" && (live.interestZchf ?? 0) > bestInterest) {
				bestInterest = live.interestZchf ?? 0;
				bestChain = cid;
			}
		}
		if (bestChain !== null && bestInterest > 0) return bestChain;

		let bestBal = -1;
		let bestChainBal: ChainId | null = null;
		for (const entry of savingsEntries) {
			const b = Number(formatUnits(entry.balance, 18));
			if (b > bestBal) {
				bestBal = b;
				bestChainBal = entry.chainId;
			}
		}
		if (bestChainBal !== null && bestBal > 0) return bestChainBal;
		return currentChainId as ChainId;
	}, [isConnected, address, liveInterestByChain, savingsEntries, currentChainId]);

	const activeSavingsEntries = useMemo(
		() => savingsEntries.filter((entry) => entry.balance > 0n || ((liveInterestByChain.get(entry.chainId)?.interestZchf ?? 0) > 0)),
		[savingsEntries, liveInterestByChain]
	);

	const [pendingChainAction, setPendingChainAction] = useState<ChainAction | null>(null);
	const pendingChainTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const clearPendingChainTimeout = () => {
		if (pendingChainTimeoutRef.current !== null) {
			clearTimeout(pendingChainTimeoutRef.current);
			pendingChainTimeoutRef.current = null;
		}
	};

	useEffect(() => () => clearPendingChainTimeout(), []);

	useEffect(() => {
		if (!pendingChainAction || chainId !== pendingChainAction.targetChainId) return;
		const href = pendingChainAction.href;
		clearPendingChainTimeout();
		setPendingChainAction(null);
		void router.push(href);
	}, [chainId, pendingChainAction, router]);

	const runChainAction = useCallback(async (action: ChainAction) => {
		if (action.skipNetworkSwitch || chainId === action.targetChainId) {
			await router.push(action.href);
			return;
		}
		clearPendingChainTimeout();
		setPendingChainAction(action);
		pendingChainTimeoutRef.current = setTimeout(() => {
			setPendingChainAction(null);
			pendingChainTimeoutRef.current = null;
		}, PENDING_CHAIN_SWITCH_MS);
		try {
			await appKitNetwork.switchNetwork(getChain(action.targetChainId));
		} catch {
			clearPendingChainTimeout();
			setPendingChainAction(null);
		}
	}, [appKitNetwork, chainId, router]);

	const chainRows = useMemo<ChainRow[]>(() => {
		const savingsByChain = new Map<ChainId, number>();
		const hasSavingsEntry = new Set<ChainId>();
		const walletByChain = new Map(walletZchfByChain.map((entry) => [entry.chainId, entry]));

		for (const entry of savingsEntries) {
			hasSavingsEntry.add(entry.chainId);
			savingsByChain.set(entry.chainId, Number(formatUnits(entry.balance, 18)));
		}

		return supportedChains.map((chainItem) => {
			const isCurrent = chainItem.id === currentChainId;
			const chainKey = chainItem.id as ChainId;
			const hasEntry = hasSavingsEntry.has(chainKey);
			const knownSavings = savingsLoaded && isConnected && address ? (hasEntry ? savingsByChain.get(chainKey) ?? 0 : null) : null;
			const liveInt = liveInterestByChain.get(chainKey);
			const knownInterest = !isConnected || !address ? null : liveInt?.status === "ready" && liveInt.interestZchf !== null ? liveInt.interestZchf : null;
			const walletEntry = walletByChain.get(chainKey);
			const knownWallet = walletEntry?.status === "loaded" ? walletEntry.balance : null;
			const knownFps = chainKey === mainnet.id ? fpsHoldings : null;
			const badges = [
				...(isCurrent ? ["Current"] : []),
				...(hasPositive(knownWallet) ? ["Wallet ZCHF"] : []),
				...(hasPositive(knownSavings) ? ["Earning"] : []),
				...(hasPositive(knownInterest) ? ["Interest"] : []),
				...(hasPositive(knownFps) ? ["FPS"] : []),
			];

			return {
				chainId: chainKey,
				name: chainItem.name,
				isCurrent,
				status: dataUnavailable ? "Data unavailable" : isCurrent ? "Current network" : "No ZCHF activity",
				walletZchf: knownWallet,
				walletZchfStatus: walletEntry?.status ?? "unsupported",
				savingsZchf: knownSavings,
				claimableInterestZchf: knownInterest,
				fpsHoldings: knownFps,
				badges,
				actions: [],
			};
		});
	}, [savingsEntries, savingsLoaded, isConnected, address, currentChainId, walletZchfByChain, fpsHoldings, dataUnavailable, supportedChains, liveInterestByChain]);

	const relevantChainChips = useMemo(() => {
		const targets = new Set<ChainId>([currentChainId as ChainId]);
		if ((fpsHoldings ?? 0) > 0 || currentChainId !== mainnet.id) targets.add(mainnet.id as ChainId);
		if (activeSavingsEntries.some((entry) => entry.chainId === base.id)) targets.add(base.id as ChainId);
		if (activeSavingsEntries.some((entry) => entry.chainId === arbitrum.id)) targets.add(arbitrum.id as ChainId);
		return [...targets];
	}, [activeSavingsEntries, currentChainId, fpsHoldings]);

	const suggestion = useMemo(() => {
		if (!isConnected || !address) return { message: "Connect your wallet to load your personal Frankencoin Desk." };

		if (!interestAggregate.loading && (interestAggregate.total ?? 0) > 0) {
			const target = [...liveInterestByChain.entries()]
				.filter(([, v]) => v.status === "ready" && (v.interestZchf ?? 0) > 0)
				.sort((a, b) => (b[1].interestZchf ?? 0) - (a[1].interestZchf ?? 0))[0]?.[0] ?? earnTargetChainId;
			return {
				message: `${formatCurrency(interestAggregate.total!, 2, 2)} ZCHF interest is ready to collect.`,
				action: { label: "Manage earning", targetChainId: target, href: `/savings?chainId=${target}`, skipNetworkSwitch: true },
			};
		}

		if ((fpsHoldings ?? 0) > 0) {
			return {
				message: "You have a protocol investment.",
				action: { label: "Manage investment", targetChainId: mainnet.id as ChainId, href: "/equity" },
			};
		}

		if (hasBorrowing) {
			return {
				message: "Borrowing activity detected. Review your position.",
				action: { label: "Open Portfolio", targetChainId: currentChainId as ChainId, href: "/mypositions" },
			};
		}

		return { message: "Your Frankencoin Desk is ready. Use the overview to choose your next action." };
	}, [address, currentChainId, earnTargetChainId, fpsHoldings, hasBorrowing, interestAggregate, isConnected, liveInterestByChain]);

	const cards = useMemo<CockpitCardProps[]>(() => {
		const hasWallet = Boolean(isConnected && address);
		const walletCopy = !hasWallet
			? "Connect wallet to check ZCHF balances."
			: totalWalletZchf !== null
			? totalWalletZchf > 0
				? "Combined ZCHF in your wallet across supported chains."
				: "No wallet ZCHF found across supported chains."
			: hasWalletZchfErrors
			? "Loaded wallet ZCHF is partial because some balances could not be loaded."
			: "Wallet ZCHF is loading.";
		const earningCopy = !hasWallet
			? "Connect wallet to view earning."
			: totalSavings === null
			? "Earning data is loading."
			: totalSavings > 0
			? `You have ${formatCurrency(totalSavings, 2, 2)} ZCHF earning.`
			: "You are not earning on any ZCHF yet.";
		const interestCopy = !hasWallet
			? undefined
			: interestAggregate.loading
			? "Interest data is loading."
			: interestAggregate.errorNote
			? interestAggregate.errorNote
			: interestAggregate.total !== null && interestAggregate.total > 0
			? `${formatCurrency(interestAggregate.total, 2, 2)} ZCHF interest available.`
			: undefined;
		const investmentCopy = !hasWallet
			? "Connect wallet to view protocol investment."
			: fpsHoldings === null
			? "Protocol investment data is loading."
			: fpsHoldings > 0
			? `You have ${formatCurrency(fpsHoldings, 2, 2)} FPS invested.`
			: "You have no protocol investment yet.";
		const borrowingCopy = !hasWallet
			? "Connect wallet to view borrowing positions."
			: myBorrowedZchf === null
			? "Borrowing data is loading."
			: myBorrowedZchf > 0
			? `You have borrowed ${formatCurrency(myBorrowedZchf, 2, 2)} ZCHF.`
			: "You have no active borrowing.";

		return [
			{
				title: "Wallet ZCHF",
				copy: walletCopy,
				amount: totalWalletZchf === null ? undefined : `${formatCurrency(totalWalletZchf, 2, 2)} ZCHF`,
				secondaryCopy: hasWalletZchfErrors ? "Some wallet balances could not be loaded." : undefined,
				iconLabel: "ZCHF",
				action: { label: "Buy or Sell ZCHF", targetChainId: currentChainId as ChainId, href: "/exchange", skipNetworkSwitch: true },
				help: "Buy, sell, bridge, or transfer ZCHF.",
				secondaryActions: [
					{ label: "Bridge ZCHF", note: "Move chains", action: { label: "Bridge ZCHF", targetChainId: currentChainId as ChainId, href: "/bridge" } },
					{ label: "Transfer ZCHF", note: "Send wallet", action: { label: "Transfer ZCHF", targetChainId: currentChainId as ChainId, href: "/transfer" } },
				],
				tone: "slate",
				onAction: runChainAction,
			},
			{
				title: "Earning",
				copy: earningCopy,
				amount: totalSavings === null ? undefined : `${formatCurrency(totalSavings, 2, 2)} ZCHF`,
				secondaryCopy: interestCopy,
				iconLabel: "SAVE",
				action: { label: totalSavings && totalSavings > 0 ? "Manage earning" : "Start earning", targetChainId: earnTargetChainId, href: `/savings?chainId=${earnTargetChainId}`, skipNetworkSwitch: true },
				tone: "blue",
				onAction: runChainAction,
			},
			{
				title: "Protocol Investment",
				copy: investmentCopy,
				amount: fpsHoldings === null ? undefined : `${formatCurrency(fpsHoldings, 2, 2)} FPS`,
				secondaryCopy: hasWallet ? "Frankencoin Pool Shares are managed on Ethereum mainnet." : undefined,
				help: "Frankencoin Pool Shares are managed on Ethereum mainnet.",
				iconLabel: "FPS",
				action: { label: fpsHoldings && fpsHoldings > 0 ? "Manage investment" : "Open Invest", targetChainId: mainnet.id as ChainId, href: "/equity" },
				tone: "brass",
				onAction: runChainAction,
			},
			{
				title: "Borrowing",
				copy: borrowingCopy,
				amount: myBorrowedZchf === null ? undefined : `${formatCurrency(myBorrowedZchf, 2, 2)} ZCHF`,
				secondaryCopy: hasBorrowing ? "Manage your borrowing positions from Portfolio." : "Explore approved collateral and open a new position.",
				iconLabel: "DEBT",
				action: { label: hasBorrowing ? "Open Portfolio" : "Explore Borrowing", targetChainId: currentChainId as ChainId, href: hasBorrowing ? "/mypositions" : "/mint" },
				tone: "violet",
				onAction: runChainAction,
			},
		];
	}, [address, currentChainId, earnTargetChainId, fpsHoldings, hasBorrowing, hasWalletZchfErrors, interestAggregate, isConnected, myBorrowedZchf, totalSavings, totalWalletZchf, runChainAction]);

	return (
		<>
			<Head>
				<title>Frankencoin Desk</title>
			</Head>

			<AppPageHeader eyebrow="FRANKENCOIN DESK" title="Frankencoin Desk" description="A simpler way to use the Frankencoin Protocol.">
				<AppNotice variant="neutral" message="Borrow, earn, exchange, bridge, transfer, and invest with Frankencoin from one clear place." />
			</AppPageHeader>

			{isConnected && address && !borrowingOverview.isLoading && borrowingOverview.hasActiveChallenge ? (
				<DeskChallengeAlert />
			) : null}

			<section className="relative overflow-hidden rounded-2xl border border-[#dfd2bb] bg-[#fffaf0] p-5 shadow-sm dark:border-menu-separator dark:bg-card-body-primary md:p-6">
				<div className="pointer-events-none absolute inset-0 opacity-[0.025] [background-image:radial-gradient(#0b1f3a_0.7px,transparent_0.7px)] [background-size:6px_6px] dark:opacity-[0.04]" />
				<div className="relative space-y-5">
					<DeskHeaderStatus
						address={address}
						currentChainId={currentChainId as ChainId}
						protocolLive={protocolLive}
						relevantChainChips={relevantChainChips}
						isConnected={Boolean(isConnected && address)}
						onSwitchChain={(target) => {
							if (target !== currentChainId) appKitNetwork.switchNetwork(getChain(target));
						}}
					/>

					<DeskSuggestion suggestion={suggestion} onAction={runChainAction} />

					<DeskOverviewGrid cards={cards} />

					<DetectedAcrossChainsPanel rows={chainRows} currentChainId={currentChainId as ChainId} isConnected={Boolean(isConnected && address)} dataUnavailable={dataUnavailable} borrowedZchf={myBorrowedZchf} walletZchfComplete={allReadableWalletZchfLoaded} onAction={runChainAction} />
				</div>
			</section>

			<DeskConfidenceSection />
		</>
	);
}

function hasPositive(value?: number | null) {
	return typeof value === "number" && value > 0;
}
