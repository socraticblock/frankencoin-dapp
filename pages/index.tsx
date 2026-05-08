import Head from "next/head";
import AppActionCard from "@components/AppActionCard";
import AppButtonSecondary from "@components/AppButtonSecondary";
import AppChainBadge from "@components/AppChainBadge";
import AppNotice from "@components/AppNotice";
import AppPageHeader from "@components/AppPageHeader";
import WalletConnect from "@components/WalletConnect";
import { useConnection, useChainId } from "wagmi";
import { getChain, shortenAddress } from "@utils";
import { ChainId } from "@frankencoin/zchf";

export default function MainPage() {
	const { address, isConnected } = useConnection();
	const chainId = useChainId();
	const chain = getChain(chainId as ChainId);

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

	return (
		<>
			<Head>
				<title>ZCHF Desk</title>
			</Head>

			<AppPageHeader
				eyebrow="Desk"
				title="ZCHF Desk"
				description="A clear desk for borrowing, earning, and managing ZCHF."
			>
				<AppNotice
					variant="neutral"
					message="ZCHF is Frankencoin's Swiss-franc stablecoin. Use this desk to get ZCHF, earn protocol interest, borrow against collateral, invest in FPS, and manage your account."
				/>
			</AppPageHeader>

			<section className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<AppActionCard title="Desk status" description={isConnected ? "Wallet connected" : "Wallet not connected"}>
					{isConnected && address ? (
						<div className="flex flex-wrap items-center gap-2">
							<AppChainBadge label={`Connected to ${chain.name}`} />
							<AppChainBadge label={`Address ${shortenAddress(address)}`} />
						</div>
					) : (
						<div className="space-y-3">
							<p className="text-text-secondary">
								Connect your wallet to view your ZCHF balances, savings, borrowing positions, and FPS holdings.
							</p>
							<WalletConnect />
						</div>
					)}
				</AppActionCard>

				<AppActionCard title="Protocol status" description="Service and network context">
					<div className="flex flex-wrap gap-2">
						<AppChainBadge label={`Current network ${chain.name}`} />
						<AppChainBadge label="Protocol data status Live" />
					</div>
				</AppActionCard>
			</section>

			<section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
				{intentCards.map((card) => (
					<AppActionCard key={card.title} title={card.title} description={card.description}>
						<AppButtonSecondary to={card.href} className="h-10" width="w-fit px-4">
							{card.cta}
						</AppButtonSecondary>
					</AppActionCard>
				))}
			</section>
		</>
	);
}
