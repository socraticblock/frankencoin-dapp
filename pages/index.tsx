import Head from "next/head";
import AppActionCard from "@components/AppActionCard";
import AppButtonSecondary from "@components/AppButtonSecondary";
import AppChainBadge from "@components/AppChainBadge";
import AppNotice from "@components/AppNotice";
import AppPageHeader from "@components/AppPageHeader";
import WalletConnect from "@components/WalletConnect";
import { useConnection, useChainId } from "wagmi";
import { formatCurrency, getChain, normalizeAddress, shortenAddress } from "@utils";
import { ChainId } from "@frankencoin/zchf";
import { useSelector } from "react-redux";
import { RootState } from "../redux/redux.store";
import { useMemo } from "react";
import { formatUnits } from "viem";
import { useServiceStatus } from "../hooks/useServiceStatus";

export default function MainPage() {
	const { address, isConnected } = useConnection();
	const chainId = useChainId();
	const chain = getChain(chainId as ChainId);
	const { openPositions } = useSelector((state: RootState) => state.positions);
	const { savingsInfo, savingsBalance } = useSelector((state: RootState) => state.savings);
	const serviceStatus = useServiceStatus();

	const intentCards = [
		{
			title: "Get ZCHF",
			description: "Buy, receive, or transfer ZCHF to your wallet.",
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

	const myBorrowedZchf = useMemo(() => {
		if (!isConnected || !address) return 0;
		return openPositions
			.filter((p) => normalizeAddress(p.owner) === normalizeAddress(address))
			.reduce((sum, p) => sum + Number(formatUnits(BigInt(p.minted), 18)), 0);
	}, [isConnected, address, openPositions]);

	const walletZchf = getNumberish(savingsBalance, ["walletZCHF", "walletBalance", "zchf"]);
	const mySavings = getNumberish(savingsBalance, ["savingsBalance", "balance", "saved"]);
	const claimableInterest = getNumberish(savingsBalance, ["interest", "claimable", "claimableInterest"]);

	const protocolLive = serviceStatus.every((s) => s.isLoaded);
	const apiStatus = serviceStatus.find((s) => s.id === "api")?.isLoaded ?? false;
	const indexerStatus = serviceStatus.find((s) => s.id === "ponder")?.isLoaded ?? false;

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
						<MetricCard label="Wallet ZCHF" value={walletZchf} unit="ZCHF" />
						<MetricCard label="Savings Balance" value={mySavings} unit="ZCHF" />
						<MetricCard label="Claimable Interest" value={claimableInterest} unit="ZCHF" />
						<MetricCard label="Borrowed ZCHF" value={myBorrowedZchf} unit="ZCHF" />
						<MetricCard label="FPS Holdings" value={0} unit="FPS" />
						<MetricCard label="Current Network" value={chain.name} />
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

function MetricCard({ label, value, unit }: { label: string; value: number | string | null; unit?: string }) {
	return (
		<div className="rounded-xl border border-menu-separator bg-card-content-secondary px-4 py-3">
			<div className="text-xs uppercase tracking-wide text-text-subheader">{label}</div>
			<div className="mt-2 text-xl font-semibold text-text-primary">
				{typeof value === "number" ? formatCurrency(value, 2, 2) : value ?? "—"}
			</div>
			{unit ? <div className="text-xs text-text-secondary mt-1">{unit}</div> : null}
		</div>
	);
}

function getNumberish(source: unknown, keys: string[]): number {
	if (!source || typeof source !== "object") return 0;
	for (const key of keys) {
		const value = (source as Record<string, unknown>)[key];
		if (typeof value === "number" && Number.isFinite(value)) return value;
		if (typeof value === "string" && value.length > 0 && Number.isFinite(Number(value))) return Number(value);
	}
	return 0;
}
