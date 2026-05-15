import AppButton from "@components/AppButton";
import AppLink from "@components/AppLink";
import AppNotice from "@components/AppNotice";
import AppPageHeader from "@components/AppPageHeader";
import ZchfCowSwapWidget from "@components/PageSwap/ZchfCowSwapWidget";
import Head from "next/head";
import { useEffect, useState } from "react";
import { useChainId, useConnection } from "wagmi";
import { base } from "viem/chains";
import { COW_SWAP_NETWORKS, CowSwapDirection, getCowRouteLabels, getCowSwapNetwork } from "../utils/cowswap";

const DIRECTIONS: { value: CowSwapDirection; label: string; copy: string }[] = [
	{
		value: "buy-zchf",
		label: "Crypto to ZCHF",
		copy: "Exchange supported assets into ZCHF. The ZCHF side stays fixed for clarity.",
	},
	{
		value: "sell-zchf",
		label: "ZCHF to crypto",
		copy: "Exchange ZCHF back into a supported crypto asset. The ZCHF side stays fixed for clarity.",
	},
];

export default function Swap() {
	const walletChainId = useChainId();
	const { isConnected } = useConnection();
	const walletCowNetwork = getCowSwapNetwork(walletChainId);
	const [direction, setDirection] = useState<CowSwapDirection>("buy-zchf");
	const [selectedChainId, setSelectedChainId] = useState(walletCowNetwork?.chainId ?? (base.id as any));

	useEffect(() => {
		if (walletCowNetwork) setSelectedChainId(walletCowNetwork.chainId);
	}, [walletCowNetwork]);

	const selectedNetwork = getCowSwapNetwork(selectedChainId);
	const selectedDirection = DIRECTIONS.find((option) => option.value === direction) ?? DIRECTIONS[0];
	const routeLabels = selectedNetwork ? getCowRouteLabels(direction, selectedNetwork) : null;

	return (
		<>
			<Head>
				<title>ZCHF Swap | ZCHF Desk</title>
			</Head>

			<AppPageHeader
				eyebrow="ZCHF SWAP"
				title="Exchange ZCHF"
				description="A focused swap module for clients who want to move between ZCHF and supported crypto assets."
			>
				<AppNotice
					variant="neutral"
					message="This desk keeps one side of the trade fixed to ZCHF. CoW Swap provides quote discovery, solver execution, approvals, settlement, and final trade review."
				/>
			</AppPageHeader>

			<section className="rounded-2xl border border-[#e8dcc8] bg-[#fffdf9] p-4 shadow-sm dark:border-menu-separator dark:bg-card-body-primary md:p-6">
				<div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
					<div className="flex flex-wrap gap-2">
						{DIRECTIONS.map((option) => (
							<button
								key={option.value}
								type="button"
								onClick={() => setDirection(option.value)}
								className={`min-h-[42px] rounded-lg border px-4 text-sm font-semibold transition ${
									direction === option.value
										? "border-[#c4a75f] bg-button-default text-white"
										: "border-[#e0d4bd] bg-card-content-secondary text-text-primary hover:border-[#c4a75f] dark:border-menu-separator"
								}`}
							>
								{option.label}
							</button>
						))}
					</div>

					<label className="flex flex-col gap-2 text-sm font-medium text-text-secondary sm:flex-row sm:items-center">
						<span>ZCHF network</span>
						<select
							value={selectedChainId}
							onChange={(event) => setSelectedChainId(Number(event.target.value) as any)}
							className="min-h-[42px] rounded-lg border border-[#e0d4bd] bg-card-content-secondary px-3 text-sm font-semibold text-text-primary outline-none transition hover:border-[#c4a75f] focus:border-[#c4a75f] dark:border-menu-separator"
						>
							{COW_SWAP_NETWORKS.map((network) => (
								<option key={network.chainId} value={network.chainId}>
									{network.label}
								</option>
							))}
						</select>
					</label>
				</div>

				<div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr,1fr,1fr]">
					<div className="rounded-xl border border-[#e0d4bd] bg-card-content-secondary/80 p-4 dark:border-menu-separator dark:bg-card-content-secondary">
						<p className="text-xs uppercase tracking-wider text-text-secondary">Client flow</p>
						<p className="mt-1 text-sm font-semibold text-text-primary">{selectedDirection.label}</p>
						<p className="mt-2 text-xs leading-5 text-text-secondary">{selectedDirection.copy}</p>
					</div>
					<div className="rounded-xl border border-[#e0d4bd] bg-card-content-secondary/80 p-4 dark:border-menu-separator dark:bg-card-content-secondary">
						<p className="text-xs uppercase tracking-wider text-text-secondary">Route</p>
						<p className="mt-1 text-sm font-semibold text-text-primary">
							{routeLabels ? `${routeLabels.sell} -> ${routeLabels.buy}` : "Route unavailable"}
						</p>
						<p className="mt-2 text-xs leading-5 text-text-secondary">
							The ZCHF side is preselected. Use CoW directly for unrelated crypto-to-crypto swaps.
						</p>
					</div>
					<div className="rounded-xl border border-[#e0d4bd] bg-card-content-secondary/80 p-4 dark:border-menu-separator dark:bg-card-content-secondary">
						<p className="text-xs uppercase tracking-wider text-text-secondary">Liquidity hint</p>
						<p className="mt-1 text-sm font-semibold text-text-primary">
							{selectedNetwork ? selectedNetwork.liquidityLabel : "Unsupported network"}
						</p>
						<p className="mt-2 text-xs leading-5 text-text-secondary">{selectedNetwork?.note ?? "Choose a supported network."}</p>
					</div>
				</div>

				{isConnected && !walletCowNetwork ? (
					<p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-200">
						Your wallet is connected to a network that this ZCHF swap desk does not support. Choose Base, Ethereum, or Gnosis in
						the selector above.
					</p>
				) : null}

				<ZchfCowSwapWidget direction={direction} chainId={selectedChainId} />

				<div className="mx-auto mt-4 max-w-[720px] rounded-xl border border-[#e0d4bd] bg-card-content-secondary/70 p-4 text-xs leading-5 text-text-secondary dark:border-menu-separator dark:bg-card-content-secondary">
					<p>
						This page is intentionally limited to ZCHF routes. Need a different crypto-to-crypto pair?{" "}
						<AppLink label="Open CoW Swap" href="https://swap.cow.fi" external className="" />.
					</p>
				</div>
			</section>

			<section className="rounded-2xl border border-[#e8dcc8] bg-[#fffdf9] p-5 shadow-sm dark:border-menu-separator dark:bg-card-body-primary md:p-6">
				<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<div>
						<h2 className="text-lg font-semibold text-text-primary">Swiss franc stablecoin bridge</h2>
						<p className="mt-1 max-w-2xl text-sm leading-6 text-text-secondary">
							Need the old 1:1 VCHF to ZCHF conversion module instead of a market swap? It is still available as a separate advanced
							tool.
						</p>
					</div>
					<AppButton to="/stablecoin-bridge" width="w-auto" className="min-h-[42px] px-4">
						Open bridge
					</AppButton>
				</div>
			</section>
		</>
	);
}
