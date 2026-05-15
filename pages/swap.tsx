import AppButton from "@components/AppButton";
import AppLink from "@components/AppLink";
import AppNotice from "@components/AppNotice";
import AppPageHeader from "@components/AppPageHeader";
import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { useChainId, useConnection } from "wagmi";
import { base } from "viem/chains";
import {
	buildCowSwapWidgetUrl,
	COW_SWAP_NETWORKS,
	CowSwapDirection,
	getCowRouteLabels,
	getCowSwapNetwork,
} from "../utils/cowswap";

const DIRECTIONS: { value: CowSwapDirection; label: string; copy: string }[] = [
	{
		value: "buy-zchf",
		label: "Crypto to ZCHF",
		copy: "Exchange ETH, WXDAI, or another supported token into ZCHF through CoW Swap.",
	},
	{
		value: "sell-zchf",
		label: "ZCHF to crypto",
		copy: "Exchange ZCHF back into crypto through CoW Swap.",
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
	const widgetUrl = useMemo(() => buildCowSwapWidgetUrl(direction, selectedChainId), [direction, selectedChainId]);
	const selectedDirection = DIRECTIONS.find((option) => option.value === direction) ?? DIRECTIONS[0];
	const routeLabels = selectedNetwork ? getCowRouteLabels(direction, selectedNetwork) : null;

	return (
		<>
			<Head>
				<title>Swap Crypto & ZCHF | ZCHF Desk</title>
			</Head>

			<AppPageHeader
				eyebrow="DEX SWAP"
				title="Swap Crypto & ZCHF"
				description="Exchange supported crypto into ZCHF, or convert ZCHF back into crypto, using CoW Swap."
			>
				<AppNotice
					variant="neutral"
					message="Swaps are powered by CoW Swap. Quotes, token availability, slippage, settlement, approvals, and execution are handled by CoW Swap and its solvers. Always review the final quote before signing."
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
						<span>Network</span>
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
						<p className="text-xs uppercase tracking-wider text-text-secondary">Flow</p>
						<p className="mt-1 text-sm font-semibold text-text-primary">{selectedDirection.label}</p>
						<p className="mt-2 text-xs leading-5 text-text-secondary">{selectedDirection.copy}</p>
					</div>
					<div className="rounded-xl border border-[#e0d4bd] bg-card-content-secondary/80 p-4 dark:border-menu-separator dark:bg-card-content-secondary">
						<p className="text-xs uppercase tracking-wider text-text-secondary">Route preview</p>
						<p className="mt-1 text-sm font-semibold text-text-primary">
							{routeLabels ? `${routeLabels.sell} -> ${routeLabels.buy}` : "Route unavailable"}
						</p>
						<p className="mt-2 text-xs leading-5 text-text-secondary">
							The default token can be changed inside the CoW Swap widget before signing.
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
						Your wallet is connected to a network that CoW Swap is not configured for here. Choose Base, Ethereum, or Gnosis in
						the selector above.
					</p>
				) : null}

				{widgetUrl ? (
					<div className="mx-auto mt-5 max-w-[1040px] overflow-hidden rounded-xl border border-[#e0d4bd] bg-white shadow-sm dark:border-menu-separator dark:bg-card-content-secondary">
						<iframe
							key={widgetUrl}
							allow="clipboard-write; ethereum"
							className="h-[760px] w-full bg-white"
							loading="lazy"
							src={widgetUrl}
							title="CoW Swap ZCHF widget"
						/>
					</div>
				) : (
					<div className="mt-5 rounded-xl border border-amber-200 bg-[#fffaf0] p-5 text-slate-800 shadow-sm dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-100">
						<h2 className="text-lg font-semibold">CoW Swap route unavailable</h2>
						<p className="mt-2 max-w-2xl text-sm leading-6">
							Choose a supported network with a configured ZCHF token address.
						</p>
					</div>
				)}
			</section>

			<section className="rounded-2xl border border-[#e8dcc8] bg-[#fffdf9] p-5 shadow-sm dark:border-menu-separator dark:bg-card-body-primary md:p-6">
				<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<div>
						<h2 className="text-lg font-semibold text-text-primary">Swiss franc stablecoin bridge</h2>
						<p className="mt-1 max-w-2xl text-sm leading-6 text-text-secondary">
							Need the old 1:1 VCHF to ZCHF conversion module instead of a DEX swap? It is still available as a separate advanced
							tool.
						</p>
					</div>
					<AppButton to="/stablecoin-bridge" width="w-auto" className="min-h-[42px] px-4">
						Open bridge
					</AppButton>
				</div>
				<p className="mt-4 text-xs text-text-secondary">
					CoW widget integration follows the CoW widget/library model. For deeper technical setup, see{" "}
					<AppLink label="CoW widget documentation" href="https://docs.cow.fi/cow-protocol/tutorials/widget" external className="" />.
				</p>
			</section>
		</>
	);
}
