import Head from "next/head";
import AppActionCard from "@components/AppActionCard";
import AppButton from "@components/AppButton";
import AppButtonSecondary from "@components/AppButtonSecondary";
import AppNotice from "@components/AppNotice";
import AppPageHeader from "@components/AppPageHeader";
import DetectedAcrossChainsPanel, { ChainAction, ChainRow } from "@components/PageHome/DetectedAcrossChainsPanel";
import WalletConnect from "@components/WalletConnect";
import { useAppKitNetwork } from "@reown/appkit/react";
import { useChainId, useConnection, useReadContract, useReadContracts } from "wagmi";
import { formatCurrency, getChain, normalizeAddress, shortenAddress } from "@utils";
import { ADDRESS, BridgedFrankencoinABI, ChainId, EquityABI, FrankencoinABI } from "@frankencoin/zchf";
import { useSelector } from "react-redux";
import { RootState } from "../redux/redux.store";
import { useMemo } from "react";
import { Address, formatUnits, zeroAddress } from "viem";
import { useServiceStatus } from "../hooks/useServiceStatus";
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

export default function MainPage() {
	const { address, isConnected } = useConnection();
	const router = useRouter();
	const appKitNetwork = useAppKitNetwork();
	const chainId = useChainId();
	const chain = getChain(chainId as ChainId);
	const { openPositions } = useSelector((state: RootState) => state.positions);
	const { savingsLoaded, savingsBalance } = useSelector((state: RootState) => state.savings);
	const serviceStatus = useServiceStatus();

	const intentCards = [
		{
			title: "Get ZCHF",
			description: "Receive or transfer ZCHF to your wallet.",
			cta: "Open Transfer",
			href: "/transfer",
		},
		{
			title: "Earn with ZCHF",
			description: "Deposit ZCHF into the savings module and collect protocol interest.",
			cta: "Go to Earn",
			href: "/savings",
		},
		{
			title: "Borrow ZCHF",
			description: "Use approved collateral to mint ZCHF against it.",
			cta: "Explore collateral",
			href: "/mint",
		},
		{
			title: "Invest in FPS",
			description: "Buy or redeem Frankencoin Pool Shares on Ethereum mainnet.",
			cta: "View FPS",
			href: "/equity",
		},
		{
			title: "Portfolio",
			description: "Review savings, borrowing positions, FPS holdings, and reports.",
			cta: "Open Portfolio",
			href: "/mypositions",
		},
	];

	const connectedAddress = address || zeroAddress;
	const currentChainId = chain.id;
	const supportedChains = useMemo(() => [mainnet, base, polygon, arbitrum, optimism, gnosis, avalanche, sonic], []);

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
			if (!isConnected || !address || walletZchfLoading || !walletZchfResults) {
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

	const totalClaimableInterest = useMemo(() => {
		if (!isConnected || !address || !savingsLoaded) return null;
		return savingsEntries.reduce((acc, entry) => acc + Number(formatUnits(entry.interest, 18)), 0);
	}, [isConnected, address, savingsLoaded, savingsEntries]);

	const activeSavingsEntries = useMemo(
		() => savingsEntries.filter((entry) => entry.balance > 0n || entry.interest > 0n),
		[savingsEntries]
	);

	const runChainAction = async (action: ChainAction) => {
		const targetChain = getChain(action.targetChainId);
		if (chain.id !== action.targetChainId) {
			try {
				await appKitNetwork.switchNetwork(targetChain);
			} catch {
				return;
			}
		}
		await router.push(action.href);
	};

	const chainRows = useMemo<ChainRow[]>(() => {
		const savingsByChain = new Map<ChainId, number>();
		const interestByChain = new Map<ChainId, number>();
		const walletByChain = new Map(walletZchfByChain.map((entry) => [entry.chainId, entry]));

		for (const entry of savingsEntries) {
			savingsByChain.set(entry.chainId, Number(formatUnits(entry.balance, 18)));
			interestByChain.set(entry.chainId, Number(formatUnits(entry.interest, 18)));
		}

		return supportedChains.map((chainItem) => {
			const isCurrent = chainItem.id === currentChainId;
			const chainKey = chainItem.id as ChainId;
			const knownSavings = savingsLoaded && isConnected && address ? savingsByChain.get(chainKey) ?? 0 : null;
			const knownInterest = savingsLoaded && isConnected && address ? interestByChain.get(chainKey) ?? 0 : null;
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
	]);

	const relevantChainChips = useMemo(() => {
		const targets = new Set<ChainId>([currentChainId as ChainId]);
		if ((fpsHoldings ?? 0) > 0 || currentChainId !== mainnet.id) targets.add(mainnet.id as ChainId);
		if (activeSavingsEntries.some((entry) => entry.chainId === base.id)) targets.add(base.id as ChainId);
		if (activeSavingsEntries.some((entry) => entry.chainId === arbitrum.id)) targets.add(arbitrum.id as ChainId);
		return [...targets];
	}, [activeSavingsEntries, currentChainId, fpsHoldings]);

	const suggestion = useMemo(() => {
		if ((totalClaimableInterest ?? 0) > 0) {
			const target = activeSavingsEntries.find((entry) => entry.interest > 0n)?.chainId ?? (currentChainId as ChainId);
			return {
				message: `You have ${formatCurrency(totalClaimableInterest!, 2, 2)} ZCHF interest available.`,
				action: {
					label: "Go to Earn",
					targetChainId: target,
					href: "/savings",
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
				action: { label: "Open Portfolio", targetChainId: chain.id as ChainId, href: "/mypositions" },
			};
		}

		return {
			message: "Your Desk is ready. Choose an action below to get started.",
		};
	}, [activeSavingsEntries, currentChainId, fpsHoldings, hasBorrowing, totalClaimableInterest]);

	const cards = useMemo<CockpitCardProps[]>(() => {
		const walletCopy =
			totalWalletZchf !== null
				? `You have ${formatCurrency(totalWalletZchf, 2, 2)} ZCHF in your wallet.`
				: hasWalletZchfErrors
				? "Loaded wallet ZCHF is partial because some balances could not be loaded."
				: "Wallet ZCHF is loading.";
		const earningCopy =
			totalSavings === null
				? "Earning data is loading."
				: totalSavings > 0
				? `You have ${formatCurrency(totalSavings, 2, 2)} ZCHF earning.`
				: "You are not earning on any ZCHF yet.";
		const interestCopy =
			totalClaimableInterest !== null && totalClaimableInterest > 0
				? `${formatCurrency(totalClaimableInterest, 2, 2)} ZCHF interest available.`
				: undefined;
		const fpsCopy =
			fpsHoldings === null
				? "FPS holdings are loading."
				: fpsHoldings > 0
				? `You have ${formatCurrency(fpsHoldings, 2, 2)} FPS invested.`
				: "You have not invested in FPS yet.";
		const borrowingCopy =
			myBorrowedZchf === null
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
					label: "Open Transfer",
					targetChainId: currentChainId as ChainId,
					href: "/transfer",
				},
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
					targetChainId: currentChainId as ChainId,
					href: "/savings",
				},
				tone: "blue",
				onAction: runChainAction,
			},
			{
				title: "FPS",
				copy: fpsCopy,
				amount: fpsHoldings === null ? undefined : `${formatCurrency(fpsHoldings, 2, 2)} FPS`,
				secondaryCopy: "FPS is managed on Ethereum mainnet.",
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
		currentChainId,
		fpsHoldings,
		hasBorrowing,
		hasWalletZchfErrors,
		myBorrowedZchf,
		totalClaimableInterest,
		totalSavings,
		totalWalletZchf,
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

			<section className="rounded-2xl border border-menu-separator bg-card-body-primary p-6">
				<h2 className="text-xl font-semibold text-text-primary">What do you want to do?</h2>
				<p className="mt-1 text-sm text-text-secondary">
					Choose your path. Each action is designed to be clear before wallet confirmation.
				</p>
				<div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
					{intentCards.map((card) => (
						<AppActionCard key={card.title} title={card.title} description={card.description}>
							<AppButtonSecondary to={card.href} className="h-10" width="w-full">
								{card.cta}
							</AppButtonSecondary>
						</AppActionCard>
					))}
				</div>
			</section>

			<section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
				<AppActionCard title="How ZCHF Desk works" description="A quick guided journey">
					<ol className="space-y-2 text-sm text-text-secondary">
						<li>1. Get ZCHF for your wallet.</li>
						<li>2. Earn protocol interest in Savings.</li>
						<li>3. Borrow against approved collateral.</li>
						<li>4. Invest in FPS on Ethereum mainnet.</li>
						<li>5. Review everything in Portfolio.</li>
					</ol>
				</AppActionCard>

				<AppActionCard title="Protocol status" description="Calm service visibility">
					<ul className="space-y-2 text-sm text-text-secondary">
						<li>
							Current network: <span className="font-medium text-text-primary">{chain.name}</span>
						</li>
						<li>
							Savings API:{" "}
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
				</AppActionCard>

				<AppActionCard title="Before you sign" description="Trust and clarity first">
					<p className="text-sm text-text-secondary">
						ZCHF Desk explains important actions before your wallet opens, including amount, network, destination, and expected
						result.
					</p>
					<div className="rounded-xl border border-menu-separator bg-card-content-primary p-3 text-sm">
						<div className="grid grid-cols-2 gap-2 text-text-secondary">
							<span>Action</span>
							<span className="text-right text-text-primary">Deposit ZCHF</span>
							<span>Amount</span>
							<span className="text-right text-text-primary">500 ZCHF</span>
							<span>Network</span>
							<span className="text-right text-text-primary">Base</span>
							<span>After confirmation</span>
							<span className="text-right text-text-primary">Savings balance increases</span>
						</div>
					</div>
				</AppActionCard>
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
