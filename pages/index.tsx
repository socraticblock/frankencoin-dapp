import Head from "next/head";
import AppActionCard from "@components/AppActionCard";
import AppButtonSecondary from "@components/AppButtonSecondary";
import AppChainBadge from "@components/AppChainBadge";
import AppNotice from "@components/AppNotice";
import AppPageHeader from "@components/AppPageHeader";
import DetectedAcrossChainsPanel, { ChainRow } from "@components/PageHome/DetectedAcrossChainsPanel";
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

export default function MainPage() {
	const { address, isConnected } = useConnection();
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
	const chainRows = useMemo<ChainRow[]>(() => {
		const supportedChains = [mainnet, base, polygon, arbitrum, optimism, gnosis, avalanche, sonic];
		const savingsByChain = new Map<ChainId, number>();
		const checkedSavingsChains = new Set<ChainId>();

		for (const entry of savingsEntries) {
			checkedSavingsChains.add(entry.chainId);
			savingsByChain.set(entry.chainId, Number(formatUnits(entry.balance, 18)));
		}

		return supportedChains.map((chainItem) => {
			const isCurrent = chainItem.id === currentChainId;
			const chainKey = chainItem.id as ChainId;
			const isSavingsChecked = savingsLoaded && isConnected && Boolean(address) && checkedSavingsChains.has(chainKey);
			const knownSavings = isSavingsChecked ? savingsByChain.get(chainKey) ?? 0 : null;
			const knownWallet = isCurrent ? walletZchf : null;
			const hasDetectedSavings = typeof knownSavings === "number" && knownSavings > 0;
			const hasNoSavings = isSavingsChecked && knownSavings === 0;

			return {
				chainId: chainKey,
				name: chainItem.name,
				isCurrent,
				status: isCurrent ? "Current" : hasDetectedSavings ? "Detected" : hasNoSavings ? "No savings detected" : "Not checked",
				walletZchf: knownWallet,
				savingsZchf: knownSavings,
			};
		});
	}, [savingsEntries, savingsLoaded, isConnected, address, currentChainId, walletZchf]);

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

			<section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
				<div className="lg:col-span-2 rounded-2xl border border-menu-separator bg-card-body-primary p-6">
					<h2 className="text-sm font-semibold tracking-wide text-text-subheader uppercase">Desk overview</h2>
					<div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
						<MetricCard label="Wallet ZCHF" value={walletZchf} unit="ZCHF" ctaLabel="Open Earn" ctaHref="/savings" />
						<MetricCard label="Savings Balance" value={mySavings} unit="ZCHF" ctaLabel="Open Earn" ctaHref="/savings" />
						<MetricCard label="Claimable Interest" value={claimableInterest} unit="ZCHF" ctaLabel="Open Earn" ctaHref="/savings" />
						<MetricCard label="Borrowed ZCHF" value={myBorrowedZchf} unit="ZCHF" />
						<MetricCard label="FPS Holdings" value={fpsHoldings} unit="FPS" ctaLabel="Open Invest" ctaHref="/equity" />
						<MetricCard label="Current Network" value={chain.name} />
					</div>
					<div className="mt-4">
						<DetectedAcrossChainsPanel
							rows={chainRows}
							currentChainId={currentChainId as ChainId}
							fpsKnown={fpsHoldings !== null}
							onSwitch={(targetChainId) => {
								const targetChain = getChain(targetChainId);
								appKitNetwork.switchNetwork(targetChain);
							}}
						/>
					</div>
				</div>
				<div className="rounded-2xl border border-menu-separator bg-card-body-primary p-6 space-y-4">
					<div>
						<h2 className="text-sm font-semibold tracking-wide text-text-subheader uppercase">Connection and status</h2>
						<div className="mt-3 flex flex-wrap gap-2">
							<AppChainBadge label={`Network ${chain.name}`} />
							<AppChainBadge label={protocolLive ? "Protocol data Live" : "Protocol data Delayed"} />
						</div>
					</div>
					{isConnected && address ? (
						<div className="space-y-2">
							<div className="text-sm text-text-secondary">Connected address</div>
							<div className="font-medium text-text-primary">{shortenAddress(address)}</div>
							<div className="pt-1">
								{chain.id === mainnet.id ? (
									<span className="inline-flex items-center rounded-full border border-menu-separator px-3 py-1 text-xs text-text-secondary">
										Ethereum mainnet connected
									</span>
								) : (
									<AppButtonSecondary
										size="small"
										width="w-auto"
										className="h-9 px-3"
										onClick={() => appKitNetwork.switchNetwork(mainnet)}
									>
										Switch to Ethereum
									</AppButtonSecondary>
								)}
							</div>
						</div>
					) : (
						<div className="space-y-3">
							<p className="text-text-secondary text-sm">
								Connect your wallet to view balances, savings, borrowing positions, and portfolio context.
							</p>
							<WalletConnect />
						</div>
					)}
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
}: {
	label: string;
	value: number | string | null;
	unit?: string;
	ctaLabel?: string;
	ctaHref?: string;
}) {
	const isKnown = value !== null && value !== undefined;
	return (
		<div className="rounded-xl border border-menu-separator bg-card-content-secondary px-4 py-3">
			<div className="text-xs uppercase tracking-wide text-text-subheader">{label}</div>
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
