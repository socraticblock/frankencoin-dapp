import Head from "next/head";
import AppButton from "@components/AppButton";
import AppLink from "@components/AppLink";
import AppNotice from "@components/AppNotice";
import AppPageHeader from "@components/AppPageHeader";
import DetectedAcrossChainsPanel, { ChainAction, ChainRow } from "@components/PageHome/DetectedAcrossChainsPanel";
import { useLiveSavingsInterestByChain } from "@components/PageHome/useLiveSavingsInterestByChain";
import WalletConnect from "@components/WalletConnect";
import { useAppKitNetwork } from "@reown/appkit/react";
import { useChainId, useConnection, useReadContract, useReadContracts } from "wagmi";
import { formatCurrency, getChain, normalizeAddress, shortenAddress, SOCIAL } from "@utils";
import { ADDRESS, BridgedFrankencoinABI, ChainId, EquityABI, FrankencoinABI } from "@frankencoin/zchf";
import { useSelector } from "react-redux";
import { RootState } from "../redux/redux.store";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Address, formatUnits, zeroAddress } from "viem";
import { useServiceStatus } from "../hooks/useServiceStatus";
import { useBorrowingOverview } from "../hooks/useBorrowingOverview";
import { SavingsBalance } from "@frankencoin/api";
import { arbitrum, avalanche, base, gnosis, mainnet, optimism, polygon, sonic } from "viem/chains";
import { useRouter } from "next/router";

type CockpitCardTone = "brass" | "blue" | "violet" | "slate" | "green";

type CockpitCardProps = {
	title: string;
	copy: string;
	amount?: string;
	secondaryCopy?: string;
	help?: string;
	iconLabel: string;
	action?: ChainAction;
	secondaryActions?: { label: string; note: string }[];
	tone: CockpitCardTone;
	onAction: (action: ChainAction) => void;
};

type WalletZchfStatus = "loading" | "loaded" | "error" | "unsupported";

type WalletZchfByChain = {
	chainId: ChainId;
	status: WalletZchfStatus;
	balance: number | null;
};

const PENDING_CHAIN_SWITCH_MS = 90_000;

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

	const connectedAddress = address || zeroAddress;
	const currentChainId = chain.id;
	const supportedChains = useMemo(() => [mainnet, base, polygon, arbitrum, optimism, gnosis, avalanche, sonic], []);
	const supportedChainIds = useMemo(() => supportedChains.map((c) => c.id as ChainId), [supportedChains]);

	const liveInterestByChain = useLiveSavingsInterestByChain(
		isConnected && address ? (normalizeAddress(address) as Address) : undefined,
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
						args: [connectedAddress],
					};
				})
				.filter(Boolean),
		[connectedAddress, supportedChains]
	);

	const {
		data: walletZchfResults,
		isLoading: walletZchfLoading,
		isError: walletZchfReadError,
	} = useReadContracts({
		contracts: walletZchfContracts as any,
		query: { enabled: Boolean(isConnected && address && walletZchfContracts.length > 0) },
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

	const walletZchfByChain = useMemo<WalletZchfByChain[]>(() => {
		let resultIndex = 0;
		return supportedChains.map((chainItem) => {
			const chainKey = chainItem.id as ChainId;
			const zchfAddress = getZchfAddress(chainKey);
			if (!zchfAddress) return { chainId: chainKey, status: "unsupported", balance: null };
			const result = walletZchfResults?.[resultIndex++] as { status?: string; result?: unknown; error?: unknown } | undefined;
			if (!isConnected || !address) {
				return { chainId: chainKey, status: "unsupported", balance: null };
			}
			if (walletZchfLoading || !walletZchfResults) {
				return { chainId: chainKey, status: "loading", balance: null };
			}
			if (walletZchfReadError || !result || result.status !== "success" || typeof result.result !== "bigint") {
				return { chainId: chainKey, status: "error", balance: null };
			}
			return { chainId: chainKey, status: "loaded", balance: Number(formatUnits(result.result, 18)) };
		});
	}, [address, isConnected, supportedChains, walletZchfLoading, walletZchfReadError, walletZchfResults]);

	const currentWalletZchf = useMemo(
		() => walletZchfByChain.find((entry) => entry.chainId === currentChainId)?.balance ?? null,
		[currentChainId, walletZchfByChain]
	);

	const allReadableWalletZchfLoaded = useMemo(
		() =>
			Boolean(isConnected && address) &&
			walletZchfByChain.filter((entry) => entry.status !== "unsupported").every((entry) => entry.status === "loaded"),
		[address, isConnected, walletZchfByChain]
	);

	const hasWalletZchfErrors = useMemo(() => walletZchfByChain.some((entry) => entry.status === "error"), [walletZchfByChain]);

	const totalWalletZchf = useMemo(() => {
		if (!allReadableWalletZchfLoaded) return null;
		return walletZchfByChain.reduce((acc, entry) => acc + (entry.balance ?? 0), 0);
	}, [allReadableWalletZchfLoaded, walletZchfByChain]);

	const fpsHoldings = useMemo(() => {
		if (!isConnected || !address) return null;
		if (fpsLoading) return null;
		if (typeof fpsHoldingsRaw !== "bigint") return null;
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
		for (const entry of savingsEntries) {
			if (entry.balance > 0n) set.add(entry.chainId);
		}
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
			if (live.status === "error" || live.status === "no_module") {
				return { total: null, loading: false, errorNote: "Some interest data could not be loaded." };
			}
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
		() =>
			savingsEntries.filter((entry) => {
				if (entry.balance > 0n) return true;
				const live = liveInterestByChain.get(entry.chainId);
				return live?.status === "ready" && (live.interestZchf ?? 0) > 0;
			}),
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

	useEffect(() => {
		return () => clearPendingChainTimeout();
	}, []);

	useEffect(() => {
		if (!pendingChainAction) return;
		if (chainId !== pendingChainAction.targetChainId) return;
		const href = pendingChainAction.href;
		clearPendingChainTimeout();
		setPendingChainAction(null);
		void router.push(href);
	}, [chainId, pendingChainAction, router]);

	const runChainAction = useCallback(async (action: ChainAction) => {
		if (action.skipNetworkSwitch) {
			await router.push(action.href);
			return;
		}
		if (chainId === action.targetChainId) {
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
			const knownSavings =
				savingsLoaded && isConnected && address ? (hasEntry ? savingsByChain.get(chainKey) ?? 0 : null) : null;
			const liveInt = liveInterestByChain.get(chainKey);
			const knownInterest =
				!isConnected || !address
					? null
					: liveInt?.status === "ready" && liveInt.interestZchf !== null
						? liveInt.interestZchf
						: null;
			const walletEntry = walletByChain.get(chainKey);
			const knownWallet = walletEntry?.status === "loaded" ? walletEntry.balance : null;
			const knownFps = chainKey === mainnet.id ? fpsHoldings : null;
			const badges = [
				...(isCurrent ? ["Current"] : []),
				...(hasPositive(knownWallet) ? ["Wallet ZCHF"] : []),
				...(hasPositive(knownSavings) ? ["Savings"] : []),
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
	}, [
		savingsEntries,
		savingsLoaded,
		isConnected,
		address,
		currentChainId,
		walletZchfByChain,
		fpsHoldings,
		dataUnavailable,
		supportedChains,
		liveInterestByChain,
	]);

	const relevantChainChips = useMemo(() => {
		const targets = new Set<ChainId>([currentChainId as ChainId]);
		if ((fpsHoldings ?? 0) > 0 || currentChainId !== mainnet.id) targets.add(mainnet.id as ChainId);
		if (activeSavingsEntries.some((entry) => entry.chainId === base.id)) targets.add(base.id as ChainId);
		if (activeSavingsEntries.some((entry) => entry.chainId === arbitrum.id)) targets.add(arbitrum.id as ChainId);
		return [...targets];
	}, [activeSavingsEntries, currentChainId, fpsHoldings]);

	const suggestion = useMemo(() => {
		if (!isConnected || !address) {
			return {
				message: "Connect your wallet to load your personal ZCHF Desk.",
			};
		}

		if (!interestAggregate.loading && (interestAggregate.total ?? 0) > 0) {
			const target =
				[...liveInterestByChain.entries()]
					.filter(([, v]) => v.status === "ready" && (v.interestZchf ?? 0) > 0)
					.sort((a, b) => (b[1].interestZchf ?? 0) - (a[1].interestZchf ?? 0))[0]?.[0] ?? earnTargetChainId;
			return {
				message: `${formatCurrency(interestAggregate.total!, 2, 2)} ZCHF interest is ready to collect.`,
				action: {
					label: "Manage earning",
					targetChainId: target,
					href: `/savings?chainId=${target}`,
					skipNetworkSwitch: true,
				},
			};
		}

		if ((fpsHoldings ?? 0) > 0) {
			return {
				message: "You have FPS invested.",
				action: {
					label: "Go to Invest",
					targetChainId: mainnet.id as ChainId,
					href: "/equity",
				},
			};
		}

		if (hasBorrowing) {
			return {
				message: "Borrowing activity detected. Review your position.",
				action: { label: "Open Portfolio", targetChainId: currentChainId as ChainId, href: "/mypositions" },
			};
		}

		return {
			message: "Your Desk is ready. Use the overview and active allocations to continue.",
		};
	}, [address, currentChainId, earnTargetChainId, fpsHoldings, hasBorrowing, interestAggregate, isConnected, liveInterestByChain]);

	const cards = useMemo<CockpitCardProps[]>(() => {
		const hasWallet = Boolean(isConnected && address);
		const walletCopy =
			!hasWallet
				? "Connect wallet to check ZCHF balances."
				: totalWalletZchf !== null
				? `You have ${formatCurrency(totalWalletZchf, 2, 2)} ZCHF in your wallet.`
				: hasWalletZchfErrors
				? "Loaded wallet ZCHF is partial because some balances could not be loaded."
				: "Wallet ZCHF is loading.";
		const earningCopy =
			!hasWallet
				? "Connect wallet to view savings."
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
		const fpsCopy =
			!hasWallet
				? "Connect wallet to view FPS holdings."
				: fpsHoldings === null
				? "FPS holdings are loading."
				: fpsHoldings > 0
				? `You have ${formatCurrency(fpsHoldings, 2, 2)} FPS invested.`
				: "You have not invested in FPS yet.";
		const borrowingCopy =
			!hasWallet
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
				action: {
					label: "Move ZCHF",
					targetChainId: currentChainId as ChainId,
					href: "/transfer",
				},
				help: "Transfer ZCHF to another wallet or bridge it to another chain.",
				secondaryActions: [
					{ label: "Buy with bank", note: "Coming soon" },
					{ label: "Buy on DEX", note: "Coming soon" },
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
				action: {
					label: "Go to Earn",
					targetChainId: earnTargetChainId,
					href: `/savings?chainId=${earnTargetChainId}`,
					skipNetworkSwitch: true,
				},
				tone: "blue",
				onAction: runChainAction,
			},
			{
				title: "FPS",
				copy: fpsCopy,
				amount: fpsHoldings === null ? undefined : `${formatCurrency(fpsHoldings, 2, 2)} FPS`,
				secondaryCopy: hasWallet ? "FPS is managed on Ethereum mainnet." : undefined,
				help: "FPS is managed on Ethereum mainnet.",
				iconLabel: "FPS",
				action: {
					label: "Go to Invest",
					targetChainId: mainnet.id as ChainId,
					href: "/equity",
				},
				tone: "brass",
				onAction: runChainAction,
			},
			{
				title: "Borrowing",
				copy: borrowingCopy,
				amount: myBorrowedZchf === null ? undefined : `${formatCurrency(myBorrowedZchf, 2, 2)} ZCHF`,
				secondaryCopy: hasBorrowing
					? "Manage your borrowing positions from Portfolio."
					: "Explore approved collateral and opening a new position.",
				iconLabel: "DEBT",
				action: {
					label: hasBorrowing ? "Open Portfolio" : "Explore Borrowing",
					targetChainId: currentChainId as ChainId,
					href: hasBorrowing ? "/mypositions" : "/mint",
				},
				tone: "violet",
				onAction: runChainAction,
			},
		];
	}, [
		address,
		currentChainId,
		earnTargetChainId,
		fpsHoldings,
		hasBorrowing,
		hasWalletZchfErrors,
		interestAggregate,
		isConnected,
		myBorrowedZchf,
		totalSavings,
		totalWalletZchf,
		runChainAction,
	]);

	return (
		<>
			<Head>
				<title>ZCHF Desk</title>
			</Head>

			<AppPageHeader eyebrow="DESK" title="ZCHF Desk" description="A clear desk for borrowing, earning, and managing ZCHF.">
				<AppNotice
					variant="neutral"
					message="ZCHF is Frankencoin's Swiss-franc stablecoin. Use this desk to get ZCHF, earn protocol interest, borrow against collateral, invest in FPS, and manage your account."
				/>
			</AppPageHeader>

			{isConnected && address && !borrowingOverview.isLoading && borrowingOverview.hasActiveChallenge ? (
				<section className="rounded-2xl border border-amber-200 bg-[#fffaf0] p-5 text-slate-800 shadow-sm dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-100">
					<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
						<div>
							<h2 className="text-lg font-semibold">Position needs attention</h2>
							<p className="mt-1 text-sm leading-6">
								One or more borrowing positions are currently challenged. Review the position before the challenge period ends.
							</p>
						</div>
						<div className="flex flex-wrap gap-2">
							<AppButton to="/mypositions" width="w-auto" className="min-h-[42px] px-4">
								Open Portfolio
							</AppButton>
							<AppButton to="/mypositions" width="w-auto" className="min-h-[42px] px-4">
								Borrowing positions
							</AppButton>
						</div>
					</div>
				</section>
			) : null}

			<section className="relative overflow-hidden rounded-2xl border border-[#dfd2bb] bg-[#fffaf0] p-5 shadow-sm dark:border-menu-separator dark:bg-card-body-primary md:p-6">
				<div className="pointer-events-none absolute inset-0 opacity-[0.025] [background-image:radial-gradient(#0b1f3a_0.7px,transparent_0.7px)] [background-size:6px_6px] dark:opacity-[0.04]" />
				<div className="relative space-y-5">
					<div className="rounded-xl border border-[#e0d4bd] bg-[#fffdf8]/90 px-4 py-3 dark:border-menu-separator dark:bg-card-content-secondary">
						<div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
							<div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
								{isConnected && address ? (
									<>
										<StatusItem label="Wallet" value={shortenAddress(address)} />
										<StatusDivider />
										<StatusItem label="Current network" value={chain.name} />
										<StatusDivider />
										<StatusItem
											label="Protocol data"
											value={protocolLive ? "Live" : "Delayed"}
											success={protocolLive}
										/>
									</>
								) : (
									<span className="font-medium text-text-primary">Wallet not connected</span>
								)}
							</div>
							<div className="flex flex-wrap items-center gap-2">
								{relevantChainChips.map((target) => (
									<ChainChip
										key={`chain-chip-${target}`}
										label={getChain(target).name}
										active={target === currentChainId}
										onClick={() => {
											if (target !== currentChainId) appKitNetwork.switchNetwork(getChain(target));
										}}
									/>
								))}
								{!isConnected ? (
									<div className="min-w-[170px]">
										<WalletConnect />
									</div>
								) : null}
							</div>
						</div>
					</div>

					<div>
						<div className="flex flex-wrap items-end justify-between gap-2">
							<h2 className="text-xl font-semibold text-text-primary">Desk Overview</h2>
							<p className="text-sm text-text-secondary">A clean summary of your loaded wallet and protocol activity.</p>
						</div>
						<div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
							{cards.map((card) => (
								<CockpitCard key={card.title} {...card} />
							))}
						</div>
						<p className="mt-3 text-xs text-text-secondary">Totals are based on loaded wallet and protocol data.</p>
					</div>

					<DetectedAcrossChainsPanel
						rows={chainRows}
						currentChainId={currentChainId as ChainId}
						isConnected={Boolean(isConnected && address)}
						dataUnavailable={dataUnavailable}
						borrowedZchf={myBorrowedZchf}
						walletZchfComplete={allReadableWalletZchfLoaded}
						suggestion={suggestion}
						onAction={runChainAction}
					/>
				</div>
			</section>

			<section className="rounded-2xl border border-[#e8dcc8] bg-[#fffdf9] p-5 shadow-sm dark:border-menu-separator dark:bg-card-body-primary md:p-6">
				<h2 className="text-lg font-semibold tracking-tight text-text-primary">Use ZCHF Desk with confidence</h2>
				<p className="mt-1 max-w-2xl text-sm text-text-secondary">
					Short context on safety and data—without repeating the flows above.
				</p>
				<div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
					<article className="rounded-xl border border-[#e0d4bd] bg-card-content-secondary/80 p-4 dark:border-menu-separator dark:bg-card-content-secondary">
						<h3 className="text-sm font-semibold text-text-primary">Clear actions before signing</h3>
						<p className="mt-2 text-xs leading-relaxed text-text-secondary">
							Review amount, network, and expected outcome on each page before your wallet opens. If something looks wrong, stop
							and verify on-chain.
						</p>
					</article>
					<article className="rounded-xl border border-[#e0d4bd] bg-card-content-secondary/80 p-4 dark:border-menu-separator dark:bg-card-content-secondary">
						<h3 className="text-sm font-semibold text-text-primary">Protocol data status</h3>
						<ul className="mt-2 space-y-1.5 text-xs text-text-secondary">
							<li>
								Network: <span className="font-medium text-text-primary">{chain.name}</span>
							</li>
							<li>
								Desk data:{" "}
								<span className={`font-medium ${protocolLive ? "text-text-success" : "text-text-warning"}`}>
									{protocolLive ? "Live" : "Partial"}
								</span>
							</li>
							<li>
								API:{" "}
								<span className={`font-medium ${apiStatus ? "text-text-success" : "text-text-warning"}`}>
									{apiStatus ? "Live" : "Delayed"}
								</span>
							</li>
							<li>
								Indexer:{" "}
								<span className={`font-medium ${indexerStatus ? "text-text-success" : "text-text-warning"}`}>
									{indexerStatus ? "Live" : "Delayed"}
								</span>
							</li>
							<li>
								Wallet:{" "}
								<span className={`font-medium ${isConnected ? "text-text-success" : "text-text-warning"}`}>
									{isConnected ? "Connected" : "Disconnected"}
								</span>
							</li>
						</ul>
					</article>
					<article className="rounded-xl border border-[#e0d4bd] bg-card-content-secondary/80 p-4 dark:border-menu-separator dark:bg-card-content-secondary">
						<h3 className="text-sm font-semibold text-text-primary">Learn how ZCHF works</h3>
						<p className="mt-2 text-xs leading-relaxed text-text-secondary">
							Frankencoin is a collateral-backed Swiss franc stablecoin. The docs cover mechanics, risks, and governance.
						</p>
						<AppLink
							label="Open documentation"
							href={SOCIAL.Docs}
							external
							icon
							className="mt-3 inline-flex items-center text-xs font-medium text-card-input-max hover:text-card-input-hover"
						/>
					</article>
				</div>
			</section>
		</>
	);
}

function CockpitCard({ title, copy, amount, secondaryCopy, help, iconLabel, action, secondaryActions, tone, onAction }: CockpitCardProps) {
	const toneClass = {
		brass: "border-[#d6bd7c] bg-[#fffdf8] text-[#9b7625]",
		blue: "border-blue-200 bg-blue-50/60 text-blue-700 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-300",
		violet: "border-violet-200 bg-violet-50/60 text-violet-700 dark:border-violet-900 dark:bg-violet-950/20 dark:text-violet-300",
		slate: "border-slate-200 bg-slate-50/70 text-slate-700 dark:border-slate-700 dark:bg-slate-900/20 dark:text-slate-300",
		green: "border-emerald-200 bg-emerald-50/50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300",
	}[tone];

	return (
		<article className="flex min-h-[284px] flex-col rounded-xl border border-[#dfd2bb] bg-card-content-secondary p-4 shadow-sm dark:border-menu-separator">
			<div className={`flex h-10 w-10 items-center justify-center rounded-full border ${toneClass}`} title={help}>
				<BadgeIcon label={iconLabel} />
			</div>
			<div className="mt-3 text-base font-semibold text-text-primary">{title}</div>
			{amount ? <div className="mt-4 text-2xl font-semibold leading-tight text-text-primary">{amount}</div> : null}
			<p className="mt-3 text-sm leading-6 text-text-secondary">{copy}</p>
			{secondaryCopy ? <p className="mt-2 text-sm font-medium text-text-success">{secondaryCopy}</p> : null}
			<div className="flex-1" />
			{action ? (
				<div className="mt-4 space-y-2">
					<AppButton
						size="small"
						width="w-full"
						className="min-h-[44px] whitespace-normal px-4 py-3 text-center leading-tight"
						onClick={() => onAction(action)}
					>
						{action.label}
					</AppButton>
					{secondaryActions?.map((secondaryAction) => (
						<button
							key={secondaryAction.label}
							type="button"
							disabled
							className="flex min-h-[38px] w-full cursor-not-allowed items-center justify-between rounded-lg border border-[#e0d4bd] bg-[#f4efe6] px-3 text-sm text-text-secondary opacity-80 dark:border-menu-separator dark:bg-card-content-primary"
						>
							<span>{secondaryAction.label}</span>
							<span className="rounded-full border border-[#d7c28a] px-2 py-0.5 text-[10px] font-semibold text-[#80601d] dark:border-[#8a7448] dark:text-[#e5c978]">
								{secondaryAction.note}
							</span>
						</button>
					))}
				</div>
			) : null}
		</article>
	);
}

function ChainChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
	return (
		<button
			type="button"
			disabled={active}
			onClick={onClick}
			className={`inline-flex h-9 items-center rounded-lg border px-3 text-sm font-medium transition ${
				active
					? "border-[#c4a75f] bg-button-default text-white dark:bg-card-content-primary dark:text-text-primary"
					: "border-[#e0d4bd] bg-card-content-secondary text-text-primary hover:border-[#c4a75f] dark:border-menu-separator"
			}`}
		>
			{label}
		</button>
	);
}

function StatusItem({ label, value, success }: { label: string; value: string; success?: boolean }) {
	return (
		<span>
			{label} <span className={`font-semibold ${success ? "text-text-success" : "text-text-primary"}`}>{value}</span>
		</span>
	);
}

function StatusDivider() {
	return <span className="text-[#c4a75f]">.</span>;
}

function BadgeIcon({ label }: { label: string }) {
	return <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">{label}</span>;
}

function hasPositive(value?: number | null) {
	return typeof value === "number" && value > 0;
}

function getSavingsEntries(source: unknown): { chainId: ChainId; balance: bigint; interest: bigint }[] {
	if (!source || typeof source !== "object") return [];
	const sections = Object.values(source as Record<string, unknown>);
	const rows: { chainId: ChainId; balance: bigint; interest: bigint }[] = [];

	for (const section of sections) {
		if (!section || typeof section !== "object") continue;
		const records = Object.values(section as Record<string, unknown>);
		for (const record of records) {
			if (!record || typeof record !== "object") continue;
			const chainIdValue = (record as SavingsBalance).chainId;
			const balanceValue = readBigIntField(record, "balance");
			const interestValue = readBigIntField(record, "interest");
			if (typeof chainIdValue !== "number" || balanceValue === null || interestValue === null) continue;
			rows.push({ chainId: chainIdValue as ChainId, balance: balanceValue, interest: interestValue });
		}
	}
	return rows;
}

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

function getZchfAddress(chainId: ChainId): Address | undefined {
	const addresses = ADDRESS[chainId] as unknown as Record<string, unknown> | undefined;
	if (!addresses) return undefined;
	if ("frankencoin" in addresses && typeof addresses.frankencoin === "string") return addresses.frankencoin as Address;
	if ("ccipBridgedFrankencoin" in addresses && typeof addresses.ccipBridgedFrankencoin === "string") {
		return addresses.ccipBridgedFrankencoin as Address;
	}
	return undefined;
}
