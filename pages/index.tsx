import Head from "next/head";
import AppActionCard from "@components/AppActionCard";
import AppButtonSecondary from "@components/AppButtonSecondary";
import AppChainBadge from "@components/AppChainBadge";
import AppNotice from "@components/AppNotice";
import AppPageHeader from "@components/AppPageHeader";
import DetectedAcrossChainsPanel, { ChainAction, ChainRow } from "@components/PageHome/DetectedAcrossChainsPanel";
import WalletConnect from "@components/WalletConnect";
import { useAppKitNetwork } from "@reown/appkit/react";
import { useChainId, useConnection, useReadContract } from "wagmi";
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

	const currentZchfAddress = useMemo(() => getZchfAddress(chain.id), [chain.id]);
	const hasCurrentZchfAddress = Boolean(currentZchfAddress);
	const connectedAddress = address || zeroAddress;
	const currentChainId = chain.id;

	const { data: walletZchfRaw, isLoading: walletZchfLoading } = useReadContract({
		address: currentZchfAddress ?? zeroAddress,
		chainId: currentChainId,
		abi: currentChainId === mainnet.id ? FrankencoinABI : BridgedFrankencoinABI,
		functionName: "balanceOf",
		args: [connectedAddress],
		query: { enabled: Boolean(isConnected && address && hasCurrentZchfAddress) },
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
	const currentChainEntry = useMemo(
		() => savingsEntries.find((entry) => entry.chainId === currentChainId),
		[savingsEntries, currentChainId]
	);

	const walletZchf = useMemo(() => {
		if (!isConnected || !address) return null;
		if (!hasCurrentZchfAddress) return null;
		if (walletZchfLoading) return null;
		if (typeof walletZchfRaw !== "bigint") return null;
		return Number(formatUnits(walletZchfRaw, 18));
	}, [isConnected, address, hasCurrentZchfAddress, walletZchfLoading, walletZchfRaw]);

	const mySavings = useMemo(() => {
		if (!isConnected || !address || !savingsLoaded) return null;
		if (!currentChainEntry) return null;
		return Number(formatUnits(currentChainEntry.balance, 18));
	}, [isConnected, address, savingsLoaded, currentChainEntry]);

	const claimableInterest = useMemo(() => {
		if (!isConnected || !address || !savingsLoaded) return null;
		if (!currentChainEntry) return null;
		return Number(formatUnits(currentChainEntry.interest, 18));
	}, [isConnected, address, savingsLoaded, currentChainEntry]);

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
	const totalSavings = useMemo(() => {
		if (!savingsLoaded) return null;
		return savingsEntries.reduce((acc, entry) => acc + Number(formatUnits(entry.balance, 18)), 0);
	}, [savingsLoaded, savingsEntries]);
	const totalClaimableInterest = useMemo(() => {
		if (!savingsLoaded) return null;
		return savingsEntries.reduce((acc, entry) => acc + Number(formatUnits(entry.interest, 18)), 0);
	}, [savingsLoaded, savingsEntries]);
	const knownZchfActivity = useMemo(() => {
		if (walletZchf === null || totalSavings === null) return null;
		return walletZchf + totalSavings;
	}, [walletZchf, totalSavings]);
	const estimatedYearlyInterest = null;
	const hasBorrowing = (myBorrowedZchf ?? 0) > 0;

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

	const quickSwitchTargets = useMemo(() => {
		const targets: ChainId[] = [];
		if (fpsHoldings !== null && fpsHoldings > 0) targets.push(mainnet.id as ChainId);
		if (savingsEntries.some((entry) => entry.chainId === base.id && (entry.balance > 0n || entry.interest > 0n))) targets.push(base.id as ChainId);
		if (hasBorrowing || savingsEntries.some((entry) => entry.chainId === arbitrum.id && entry.balance > 0n)) targets.push(arbitrum.id as ChainId);
		targets.push(polygon.id as ChainId, optimism.id as ChainId, gnosis.id as ChainId, avalanche.id as ChainId, sonic.id as ChainId);
		return [...new Set(targets)].slice(0, 5);
	}, [fpsHoldings, savingsEntries, hasBorrowing]);

	const chainRows = useMemo<ChainRow[]>(() => {
		const supportedChains = [mainnet, base, polygon, arbitrum, optimism, gnosis, avalanche, sonic];
		const savingsByChain = new Map<ChainId, number>();
		const checkedSavingsChains = new Set<ChainId>();
		const interestByChain = new Map<ChainId, number>();

		for (const entry of savingsEntries) {
			checkedSavingsChains.add(entry.chainId);
			savingsByChain.set(entry.chainId, Number(formatUnits(entry.balance, 18)));
			interestByChain.set(entry.chainId, Number(formatUnits(entry.interest, 18)));
		}

		return supportedChains.map((chainItem) => {
			const isCurrent = chainItem.id === currentChainId;
			const chainKey = chainItem.id as ChainId;
			const isSavingsChecked = savingsLoaded && isConnected && Boolean(address) && checkedSavingsChains.has(chainKey);
			const knownSavings = isSavingsChecked ? savingsByChain.get(chainKey) ?? 0 : null;
			const knownInterest = isSavingsChecked ? interestByChain.get(chainKey) ?? 0 : null;
			const knownWallet = isCurrent ? walletZchf : null;
			const knownBorrowed = chainKey === mainnet.id ? myBorrowedZchf : null;
			const knownFps = chainKey === mainnet.id ? fpsHoldings : null;
			const hasWalletActivity = typeof knownWallet === "number" && knownWallet > 0;
			const hasDetectedSavings = typeof knownSavings === "number" && knownSavings > 0;
			const hasInterest = typeof knownInterest === "number" && knownInterest > 0;
			const hasBorrowingActivity = typeof knownBorrowed === "number" && knownBorrowed > 0;
			const hasFpsActivity = typeof knownFps === "number" && knownFps > 0;
			const hasAnyActivity = hasWalletActivity || hasDetectedSavings || hasInterest || hasBorrowingActivity || hasFpsActivity;
			const badges = [
				...(isCurrent ? ["Current"] : []),
				...(hasWalletActivity ? ["Wallet ZCHF"] : []),
				...(hasDetectedSavings ? ["Savings active"] : []),
				...(hasInterest ? ["Interest available"] : []),
				...(hasBorrowingActivity ? ["Borrowing active"] : []),
				...(chainKey === mainnet.id ? ["FPS on Ethereum"] : []),
			];
			const actions: ChainAction[] = [];
			if (chainKey === mainnet.id) {
				actions.push({
					label: isCurrent ? "Open Invest" : `Switch to ${chainItem.name} and open Invest`,
					targetChainId: chainKey,
					href: "/equity",
				});
			}
			if (hasDetectedSavings || hasInterest || chainKey === currentChainId) {
				actions.push({
					label: isCurrent ? "Open Earn" : `Switch to ${chainItem.name} and open Earn`,
					targetChainId: chainKey,
					href: "/savings",
				});
			}
			if (hasBorrowingActivity) {
				actions.push({
					label: isCurrent ? "Open Portfolio" : `Switch to ${chainItem.name} and open Portfolio`,
					targetChainId: chainKey,
					href: "/mypositions",
				});
			}

			return {
				chainId: chainKey,
				name: chainItem.name,
				isCurrent,
				status: dataUnavailable
					? "Data unavailable"
					: isCurrent
						? "Current network"
						: hasDetectedSavings
							? "Savings detected"
							: hasAnyActivity
								? "Current network"
								: "No ZCHF activity",
				walletZchf: knownWallet,
				savingsZchf: knownSavings,
				claimableInterestZchf: knownInterest,
				borrowedZchf: knownBorrowed,
				fpsHoldings: knownFps,
				badges,
				actions,
			};
		});
	}, [savingsEntries, savingsLoaded, isConnected, address, currentChainId, walletZchf, myBorrowedZchf, fpsHoldings, dataUnavailable]);

	const suggestion = useMemo(() => {
		const baseRow = chainRows.find((row) => row.chainId === base.id);
		const ethRow = chainRows.find((row) => row.chainId === mainnet.id);
		if ((baseRow?.claimableInterestZchf ?? 0) > 0) {
			return {
				message: "Claimable interest is available on Base.",
				action: {
					label: chain.id === base.id ? "Open Earn" : "Switch to Base and open Earn",
					targetChainId: base.id as ChainId,
					href: "/savings",
				},
			};
		}
		if (chain.id === mainnet.id && (baseRow?.savingsZchf ?? 0) > 0) {
			return {
				message: "Savings were detected on Base while your wallet is connected to Ethereum.",
				action: { label: "Switch to Base", targetChainId: base.id as ChainId, href: "/savings" },
			};
		}
		if (chain.id !== mainnet.id && (ethRow?.fpsHoldings ?? 0) > 0) {
			return {
				message: "FPS holdings are managed on Ethereum.",
				action: { label: "Switch to Ethereum and open Invest", targetChainId: mainnet.id as ChainId, href: "/equity" },
			};
		}
		if (hasBorrowing) {
			return {
				message: "Borrowing activity detected. Review your position health.",
				action: { label: "Open Portfolio", targetChainId: chain.id as ChainId, href: "/mypositions" },
			};
		}
		return undefined;
	}, [chainRows, chain.id, hasBorrowing]);

	return (
		<>
			<Head>
				<title>ZCHF Desk</title>
			</Head>

			<AppPageHeader
				eyebrow="DESK"
				title="ZCHF Desk"
				description="A clear desk for borrowing, earning, and managing ZCHF."
			>
				<AppNotice
					variant="neutral"
					message="ZCHF is Frankencoin's Swiss-franc stablecoin. Use this desk to get ZCHF, earn protocol interest, borrow against collateral, invest in FPS, and manage your account."
				/>
			</AppPageHeader>

			<section className="rounded-2xl border border-menu-separator bg-card-body-primary p-6">
				<div className="mb-4 rounded-xl border border-menu-separator bg-card-content-secondary px-4 py-3">
					<div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
						{isConnected && address ? (
							<>
								<span>Wallet {shortenAddress(address)}</span>
								<span>·</span>
								<span>Current network {chain.name}</span>
								<span>·</span>
								<span>Protocol data {protocolLive ? "Live" : "Delayed"}</span>
							</>
						) : (
							<span>Connect your wallet to load your cross-chain cockpit.</span>
						)}
					</div>
					{isConnected && quickSwitchTargets.length > 0 ? (
						<div className="mt-2 flex flex-wrap gap-2">
							{quickSwitchTargets.map((target) => (
								<AppButtonSecondary
									key={`quick-${target}`}
									size="small"
									width="w-auto"
									className="h-8 px-3 text-xs"
									disabled={chain.id === target}
									onClick={() => appKitNetwork.switchNetwork(getChain(target))}
								>
									{chain.id === target ? `${getChain(target).name} current` : `Switch to ${getChain(target).name}`}
								</AppButtonSecondary>
							))}
						</div>
					) : null}
				</div>
				{!isConnected ? (
					<div className="mb-4 max-w-xs">
						<WalletConnect />
					</div>
				) : null}
				<div>
					<h2 className="text-sm font-semibold tracking-wide text-text-subheader uppercase">Desk overview</h2>
					<div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
						<MetricCard label="Wallet ZCHF" value={walletZchf} unit="ZCHF" ctaLabel="Open Earn" ctaHref="/savings" tooltip="Savings can exist on supported chains." />
						<MetricCard label="Total Savings" value={totalSavings} unit="ZCHF" ctaLabel="Open Earn" ctaHref="/savings" tooltip="Savings can exist on supported chains." />
						<MetricCard label="Claimable Interest" value={totalClaimableInterest} unit="ZCHF" ctaLabel="Open Earn" ctaHref="/savings" />
						<MetricCard label="Borrowed ZCHF" value={myBorrowedZchf} unit="ZCHF" />
						<MetricCard
							label="FPS Holdings"
							value={fpsHoldings}
							unit="FPS"
							ctaLabel="Open Invest"
							ctaHref="/equity"
							tooltip="FPS is managed on Ethereum mainnet."
						/>
						<MetricCard label="Current Network" value={chain.name} />
						<MetricCard label="Known ZCHF activity" value={knownZchfActivity} unit="ZCHF" />
						<MetricCard label="Estimated yearly interest" value={estimatedYearlyInterest} unit="ZCHF" />
						<MetricCard label="Position health" value={"TODO"} />
					</div>
					<div className="mt-4">
						<DetectedAcrossChainsPanel
							rows={chainRows}
							currentChainId={currentChainId as ChainId}
							suggestion={suggestion}
							onAction={runChainAction}
						/>
					</div>
				</div>
			</section>

			<section className="rounded-2xl border border-menu-separator bg-card-body-primary p-6">
				<h2 className="text-xl font-semibold text-text-primary">What do you want to do?</h2>
				<p className="mt-1 text-sm text-text-secondary">Choose your path. Each action is designed to be clear before wallet confirmation.</p>
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
						<li>Current network: <span className="text-text-primary font-medium">{chain.name}</span></li>
						<li>Savings API: <span className={`font-medium ${apiStatus ? "text-text-success" : "text-text-warning"}`}>{apiStatus ? "Live" : "Delayed"}</span></li>
						<li>Indexer: <span className={`font-medium ${indexerStatus ? "text-text-success" : "text-text-warning"}`}>{indexerStatus ? "Live" : "Delayed"}</span></li>
						<li>Wallet: <span className={`font-medium ${isConnected ? "text-text-success" : "text-text-warning"}`}>{isConnected ? "Connected" : "Disconnected"}</span></li>
					</ul>
				</AppActionCard>

				<AppActionCard title="Before you sign" description="Trust and clarity first">
					<p className="text-sm text-text-secondary">
						ZCHF Desk explains important actions before your wallet opens, including amount, network, destination, and expected result.
					</p>
					<div className="rounded-xl border border-menu-separator bg-card-content-primary p-3 text-sm">
						<div className="grid grid-cols-2 gap-2 text-text-secondary">
							<span>Action</span><span className="text-right text-text-primary">Deposit ZCHF</span>
							<span>Amount</span><span className="text-right text-text-primary">500 ZCHF</span>
							<span>Network</span><span className="text-right text-text-primary">Base</span>
							<span>After confirmation</span><span className="text-right text-text-primary">Savings balance increases</span>
						</div>
					</div>
				</AppActionCard>
			</section>
		</>
	);
}

function MetricCard({
	label,
	value,
	unit,
	ctaLabel,
	ctaHref,
	tooltip,
}: {
	label: string;
	value: number | string | null;
	unit?: string;
	ctaLabel?: string;
	ctaHref?: string;
	tooltip?: string;
}) {
	const isKnown = value !== null && value !== undefined;
	return (
		<div className="rounded-xl border border-menu-separator bg-card-content-secondary px-4 py-3">
			<div className="text-xs uppercase tracking-wide text-text-subheader" title={tooltip}>
				{label}
			</div>
			<div className="mt-2 text-xl font-semibold text-text-primary">{typeof value === "number" ? formatCurrency(value, 2, 2) : value ?? "—"}</div>
			{isKnown && unit ? <div className="mt-1 text-xs text-text-secondary">{unit}</div> : null}
			{!isKnown && ctaLabel && ctaHref ? (
				<div className="mt-2">
					<AppButtonSecondary to={ctaHref} size="small" width="w-auto" className="h-8 px-3">
						{ctaLabel}
					</AppButtonSecondary>
				</div>
			) : null}
		</div>
	);
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
