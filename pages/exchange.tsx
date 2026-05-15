import AppButton from "@components/AppButton";
import AppLink from "@components/AppLink";
import AppNotice from "@components/AppNotice";
import AppPageHeader from "@components/AppPageHeader";
import ZchfCowSwapWidget from "@components/PageSwap/ZchfCowSwapWidget";
import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { useChainId, useConnection } from "wagmi";
import type { ChainId } from "@frankencoin/zchf";
import { base } from "viem/chains";
import {
	buildMtPelerinWidgetUrl,
	getMtPelerinActivationKey,
	MTP_NETWORKS,
	type MtPelerinNetwork,
	type MtPelerinTab,
} from "../utils/mtpelerin";
import { COW_SWAP_NETWORKS, type CowSwapDirection, getCowRouteLabels, getCowSwapNetwork } from "../utils/cowswap";

type ExchangeAction = "buy" | "sell" | "swap" | "bridge" | "transfer";

const ACTIONS: {
	value: ExchangeAction;
	title: string;
	subtitle: string;
	detail: string;
}[] = [
	{
		value: "buy",
		title: "Buy ZCHF",
		subtitle: "Bank or card to ZCHF",
		detail: "Use Mt Pelerin to buy ZCHF with fiat on Base, Ethereum, or Gnosis.",
	},
	{
		value: "sell",
		title: "Sell ZCHF",
		subtitle: "ZCHF to fiat",
		detail: "Cash out ZCHF back to fiat through Mt Pelerin.",
	},
	{
		value: "swap",
		title: "Swap crypto and ZCHF",
		subtitle: "Crypto routes powered by CoW",
		detail: "Best practical swap liquidity is on Base. Ethereum and Gnosis are also available here.",
	},
	{
		value: "bridge",
		title: "Bridge ZCHF",
		subtitle: "Move existing ZCHF",
		detail: "Use CCIP to move ZCHF you already own to another supported chain.",
	},
	{
		value: "transfer",
		title: "Transfer ZCHF",
		subtitle: "Send to a wallet",
		detail: "Send ZCHF to another wallet on the same chain.",
	},
];

const FIAT_FLOW_COPY: Record<Extract<ExchangeAction, "buy" | "sell">, string> = {
	buy: "Buy ZCHF with fiat through Mt Pelerin. Base is a good default for most retail users.",
	sell: "Cash out ZCHF back to fiat through Mt Pelerin. Review fees, limits, and bank details inside the widget.",
};

const SWAP_DIRECTIONS: { value: CowSwapDirection; label: string; copy: string }[] = [
	{
		value: "buy-zchf",
		label: "Crypto to ZCHF",
		copy: "Exchange supported crypto into ZCHF. The ZCHF side stays fixed for clarity.",
	},
	{
		value: "sell-zchf",
		label: "ZCHF to crypto",
		copy: "Exchange ZCHF back into supported crypto. The ZCHF side stays fixed for clarity.",
	},
];

function parseCowChainId(value: string): ChainId {
	const id = Number(value);
	const match = COW_SWAP_NETWORKS.find((network) => network.chainId === id);
	if (!match) return base.id as ChainId;
	return match.chainId;
}

function ActionCard({
	action,
	active,
	onClick,
}: {
	action: (typeof ACTIONS)[number];
	active: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`rounded-2xl border p-4 text-left transition ${
				active
					? "border-[#c4a75f] bg-button-default text-white shadow-sm"
					: "border-[#e0d4bd] bg-[#fffdf9] text-text-primary hover:border-[#c4a75f] dark:border-menu-separator dark:bg-card-body-primary"
			}`}
		>
			<p className={`text-xs uppercase tracking-wider ${active ? "text-white/75" : "text-text-secondary"}`}>{action.subtitle}</p>
			<h2 className="mt-2 text-lg font-semibold">{action.title}</h2>
			<p className={`mt-2 text-sm leading-6 ${active ? "text-white/85" : "text-text-secondary"}`}>{action.detail}</p>
		</button>
	);
}

function FiatExchangeModule({ action }: { action: Extract<ExchangeAction, "buy" | "sell"> }) {
	const [network, setNetwork] = useState<MtPelerinNetwork>("base_mainnet");
	const activation = getMtPelerinActivationKey();
	const tab = action as MtPelerinTab;
	const widgetUrl = useMemo(() => buildMtPelerinWidgetUrl(tab, network), [network, tab]);

	return (
		<section className="rounded-2xl border border-[#e8dcc8] bg-[#fffdf9] p-4 shadow-sm dark:border-menu-separator dark:bg-card-body-primary md:p-6">
			<div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
				<div>
					<p className="text-xs uppercase tracking-wider text-text-secondary">Fiat gateway</p>
					<h2 className="mt-1 text-xl font-semibold text-text-primary">{action === "buy" ? "Buy ZCHF" : "Sell ZCHF"}</h2>
					<p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">{FIAT_FLOW_COPY[action]}</p>
				</div>

				<label className="flex flex-col gap-2 text-sm font-medium text-text-secondary sm:flex-row sm:items-center">
					<span>Network</span>
					<select
						value={network}
						onChange={(event) => setNetwork(event.target.value as MtPelerinNetwork)}
						className="min-h-[42px] rounded-lg border border-[#e0d4bd] bg-card-content-secondary px-3 text-sm font-semibold text-text-primary outline-none transition hover:border-[#c4a75f] focus:border-[#c4a75f] dark:border-menu-separator"
					>
						{MTP_NETWORKS.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
				</label>
			</div>

			<AppNotice
				variant="neutral"
				message="Mt Pelerin handles fiat fees, limits, identity checks, delivery times, and country availability."
			/>

			{activation.usingDevFallback ? (
				<p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-200">
					Using the Mt Pelerin development activation key. Set NEXT_PUBLIC_MTP_ACTIVATION_KEY for production.
				</p>
			) : null}

			{widgetUrl ? (
				<div className="mx-auto mt-5 max-w-[920px] overflow-hidden rounded-xl border border-[#e0d4bd] bg-white shadow-sm dark:border-menu-separator dark:bg-card-content-secondary">
					<iframe
						key={widgetUrl}
						allow="usb; ethereum; clipboard-write; payment; microphone; camera"
						className="h-[640px] w-full bg-white"
						loading="lazy"
						src={widgetUrl}
						title="Mt Pelerin ZCHF fiat gateway"
					/>
				</div>
			) : (
				<div className="mt-5 rounded-xl border border-amber-200 bg-[#fffaf0] p-5 text-slate-800 shadow-sm dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-100">
					<h2 className="text-lg font-semibold">Mt Pelerin activation key required</h2>
					<p className="mt-2 max-w-2xl text-sm leading-6">
						Set NEXT_PUBLIC_MTP_ACTIVATION_KEY in the production environment to enable the ZCHF fiat gateway.
					</p>
				</div>
			)}
		</section>
	);
}

function SwapExchangeModule() {
	const walletChainId = useChainId();
	const { isConnected } = useConnection();
	const walletCowNetwork = getCowSwapNetwork(walletChainId);
	const [direction, setDirection] = useState<CowSwapDirection>("buy-zchf");
	const [selectedChainId, setSelectedChainId] = useState<ChainId>(walletCowNetwork?.chainId ?? (base.id as ChainId));

	useEffect(() => {
		if (walletCowNetwork) setSelectedChainId(walletCowNetwork.chainId);
	}, [walletCowNetwork]);

	const selectedNetwork = getCowSwapNetwork(selectedChainId);
	const selectedDirection = SWAP_DIRECTIONS.find((option) => option.value === direction) ?? SWAP_DIRECTIONS[0];
	const routeLabels = selectedNetwork ? getCowRouteLabels(direction, selectedNetwork) : null;

	return (
		<section className="rounded-2xl border border-[#e8dcc8] bg-[#fffdf9] p-4 shadow-sm dark:border-menu-separator dark:bg-card-body-primary md:p-6">
			<div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
				<div>
					<p className="text-xs uppercase tracking-wider text-text-secondary">CoW swap</p>
					<h2 className="mt-1 text-xl font-semibold text-text-primary">Swap crypto and ZCHF</h2>
					<p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
						Use direct ZCHF swap routes on Base, Ethereum, or Gnosis. Base is the recommended default for most users.
					</p>
				</div>

				<label className="flex flex-col gap-2 text-sm font-medium text-text-secondary sm:flex-row sm:items-center">
					<span>ZCHF network</span>
					<select
						value={selectedChainId}
						onChange={(event) => setSelectedChainId(parseCowChainId(event.target.value))}
						className="min-h-[42px] rounded-lg border border-[#e0d4bd] bg-card-content-secondary px-3 text-sm font-semibold text-text-primary outline-none transition hover:border-[#c4a75f] focus:border-[#c4a75f] dark:border-menu-separator"
					>
						{COW_SWAP_NETWORKS.map((network) => (
							<option key={network.chainId} value={network.chainId}>
								{network.suggested ? `${network.label} - recommended` : network.label}
							</option>
						))}
					</select>
				</label>
			</div>

			<div className="mt-4 flex flex-wrap gap-2">
				{SWAP_DIRECTIONS.map((option) => (
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
					<p className="mt-2 text-xs leading-5 text-text-secondary">The ZCHF side is fixed for clarity.</p>
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
					Your wallet is connected to a network that this swap desk does not support. Choose Base, Ethereum, or Gnosis above.
				</p>
			) : null}

			<AppNotice
				variant="neutral"
				message="Other chains may have little or no direct ZCHF swap liquidity. If you want ZCHF on another chain, buy or swap on Base, Ethereum, or Gnosis first, then bridge your ZCHF."
			/>

			<ZchfCowSwapWidget direction={direction} chainId={selectedChainId} />

			<div className="mx-auto mt-4 max-w-[720px] rounded-xl border border-[#e0d4bd] bg-card-content-secondary/70 p-4 text-xs leading-5 text-text-secondary dark:border-menu-separator dark:bg-card-content-secondary">
				<p>
					This page is intentionally limited to ZCHF routes. Need a different crypto-to-crypto pair?{" "}
					<AppLink label="Open CoW Swap" href="https://swap.cow.fi" external className="" />.
				</p>
			</div>
		</section>
	);
}

function BridgeTransferModule({ action }: { action: Extract<ExchangeAction, "bridge" | "transfer"> }) {
	const isBridge = action === "bridge";
	return (
		<section className="rounded-2xl border border-[#e8dcc8] bg-[#fffdf9] p-5 shadow-sm dark:border-menu-separator dark:bg-card-body-primary md:p-6">
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div>
					<p className="text-xs uppercase tracking-wider text-text-secondary">{isBridge ? "CCIP bridge" : "Wallet transfer"}</p>
					<h2 className="mt-1 text-xl font-semibold text-text-primary">{isBridge ? "Bridge ZCHF" : "Transfer ZCHF"}</h2>
					<p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
						{isBridge
							? "Bridge moves ZCHF you already own from one chain to another. It is not a market swap. Use this after buying or swapping into ZCHF on a liquid route."
							: "Transfer sends ZCHF to another wallet on the same chain. Use this for payments or moving funds between your own wallets."}
					</p>
				</div>
				<AppButton to="/transfer" width="w-auto" className="min-h-[42px] px-4">
					Open Transfer & Bridge
				</AppButton>
			</div>

			<div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
				<div className="rounded-xl border border-[#e0d4bd] bg-card-content-secondary/80 p-4 dark:border-menu-separator dark:bg-card-content-secondary">
					<p className="text-xs uppercase tracking-wider text-text-secondary">Step 1</p>
					<p className="mt-1 text-sm font-semibold text-text-primary">Get ZCHF first</p>
					<p className="mt-2 text-xs leading-5 text-text-secondary">Buy with fiat or swap crypto on Base, Ethereum, or Gnosis.</p>
				</div>
				<div className="rounded-xl border border-[#e0d4bd] bg-card-content-secondary/80 p-4 dark:border-menu-separator dark:bg-card-content-secondary">
					<p className="text-xs uppercase tracking-wider text-text-secondary">Step 2</p>
					<p className="mt-1 text-sm font-semibold text-text-primary">Choose destination</p>
					<p className="mt-2 text-xs leading-5 text-text-secondary">Use the bridge when you want your existing ZCHF on another supported chain.</p>
				</div>
				<div className="rounded-xl border border-[#e0d4bd] bg-card-content-secondary/80 p-4 dark:border-menu-separator dark:bg-card-content-secondary">
					<p className="text-xs uppercase tracking-wider text-text-secondary">Step 3</p>
					<p className="mt-1 text-sm font-semibold text-text-primary">Review delivery</p>
					<p className="mt-2 text-xs leading-5 text-text-secondary">Bridge transfers can take longer than same-chain transfers. Track delivery in CCIP Explorer.</p>
				</div>
			</div>
		</section>
	);
}

export default function ExchangePage() {
	const [activeAction, setActiveAction] = useState<ExchangeAction>("buy");
	const activeMeta = ACTIONS.find((item) => item.value === activeAction) ?? ACTIONS[0];

	return (
		<>
			<Head>
				<title>Buy, Sell & Move ZCHF | ZCHF Desk</title>
			</Head>

			<AppPageHeader
				eyebrow="EXCHANGE"
				title="Buy, Sell & Move ZCHF"
				description="Choose the safest route for what you want to do."
			>
				<AppNotice
					variant="neutral"
					message="ZCHF exists on several chains, but direct swap liquidity is not equal everywhere. For crypto swaps, use Base, Ethereum, or Gnosis. For other chains, bridge ZCHF after you have it."
				/>
			</AppPageHeader>

			<section className="rounded-2xl border border-[#e8dcc8] bg-[#fffdf9] p-4 shadow-sm dark:border-menu-separator dark:bg-card-body-primary md:p-6">
				<div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
					<div>
						<p className="text-xs uppercase tracking-wider text-text-secondary">Route advisor</p>
						<h2 className="mt-1 text-2xl font-semibold text-text-primary">What do you want to do?</h2>
					</div>
					<p className="max-w-xl text-sm leading-6 text-text-secondary">
						Current recommendation: swap on Base when possible. Use the bridge if you need ZCHF on a chain with weak direct swap liquidity.
					</p>
				</div>

				<div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
					{ACTIONS.map((action) => (
						<ActionCard key={action.value} action={action} active={activeAction === action.value} onClick={() => setActiveAction(action.value)} />
					))}
				</div>
			</section>

			<div className="mt-6">
				{activeAction === "buy" || activeAction === "sell" ? <FiatExchangeModule action={activeAction} /> : null}
				{activeAction === "swap" ? <SwapExchangeModule /> : null}
				{activeAction === "bridge" || activeAction === "transfer" ? <BridgeTransferModule action={activeAction} /> : null}
			</div>

			<section className="rounded-2xl border border-[#e8dcc8] bg-[#fffdf9] p-5 shadow-sm dark:border-menu-separator dark:bg-card-body-primary md:p-6">
				<h2 className="text-lg font-semibold text-text-primary">Why some chains are shown only for bridge</h2>
				<p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
					ZCHF can exist on more chains than the chains with strong direct swap liquidity. This page keeps normal swap routes limited to the paths most likely to work for clients. If you want ZCHF somewhere else, first get ZCHF on a liquid route, then move it with the bridge.
				</p>
				<p className="mt-3 text-sm font-semibold text-text-primary">Selected route: {activeMeta.title}</p>
			</section>
		</>
	);
}
