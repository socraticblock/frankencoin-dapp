import AppButton from "@components/AppButton";
import AppNotice from "@components/AppNotice";
import AppPageHeader from "@components/AppPageHeader";
import DeskSwapForm from "@components/PageExchange/DeskSwapForm";
import Head from "next/head";
import { useMemo, useState } from "react";
import {
	buildMtPelerinWidgetUrl,
	getMtPelerinActivationKey,
	MTP_NETWORKS,
	type MtPelerinNetwork,
	type MtPelerinTab,
} from "../utils/mtpelerin";

type ExchangeAction = "fiat" | "swap" | "bridge" | "transfer";
type FiatFlow = "buy" | "sell";

const ACTIONS: {
	value: ExchangeAction;
	title: string;
	subtitle: string;
	detail: string;
}[] = [
	{
		value: "fiat",
		title: "Buy or Sell ZCHF",
		subtitle: "Fiat gateway",
		detail: "Use Mt Pelerin to buy ZCHF with fiat, or sell ZCHF back to fiat.",
	},
	{
		value: "swap",
		title: "Swap Crypto ↔ ZCHF / WFPS",
		subtitle: "Crypto already in your wallet",
		detail: "Use crypto to buy ZCHF or WFPS, or sell ZCHF/WFPS back to crypto.",
	},
	{
		value: "bridge",
		title: "Bridge ZCHF",
		subtitle: "Move existing ZCHF",
		detail: "Move ZCHF you already own to another supported chain.",
	},
	{
		value: "transfer",
		title: "Transfer ZCHF",
		subtitle: "Send to a wallet",
		detail: "Send ZCHF to another wallet on the same chain.",
	},
];

const FIAT_FLOW_COPY: Record<FiatFlow, string> = {
	buy: "Buy ZCHF with fiat through Mt Pelerin. Base is a good default for most retail users.",
	sell: "Cash out ZCHF back to fiat through Mt Pelerin. Review fees, limits, and bank details inside the widget.",
};

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

function FiatExchangeModule() {
	const [flow, setFlow] = useState<FiatFlow>("buy");
	const [network, setNetwork] = useState<MtPelerinNetwork>("base_mainnet");
	const activation = getMtPelerinActivationKey();
	const widgetUrl = useMemo(() => buildMtPelerinWidgetUrl(flow as MtPelerinTab, network), [network, flow]);

	return (
		<section className="rounded-2xl border border-[#e8dcc8] bg-[#fffdf9] p-4 shadow-sm dark:border-menu-separator dark:bg-card-body-primary md:p-6">
			<div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
				<div>
					<p className="text-xs uppercase tracking-wider text-text-secondary">Fiat gateway</p>
					<h2 className="mt-1 text-xl font-semibold text-text-primary">Buy or Sell ZCHF</h2>
					<p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">{FIAT_FLOW_COPY[flow]}</p>
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

			<div className="mt-5 rounded-2xl border border-[#e0d4bd] bg-card-content-secondary/70 p-3 dark:border-menu-separator dark:bg-card-content-secondary">
				<p className="text-xs uppercase tracking-wider text-text-secondary">I want to</p>
				<div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
					<button
						type="button"
						onClick={() => setFlow("buy")}
						className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
							flow === "buy"
								? "border-[#c4a75f] bg-button-default text-white"
								: "border-[#e0d4bd] bg-card-content-primary text-text-primary hover:border-[#c4a75f] dark:border-menu-separator"
						}`}
					>
						Buy ZCHF with fiat
					</button>
					<button
						type="button"
						onClick={() => setFlow("sell")}
						className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
							flow === "sell"
								? "border-[#c4a75f] bg-button-default text-white"
								: "border-[#e0d4bd] bg-card-content-primary text-text-primary hover:border-[#c4a75f] dark:border-menu-separator"
						}`}
					>
						Sell ZCHF to fiat
					</button>
				</div>
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
	const [activeAction, setActiveAction] = useState<ExchangeAction>("fiat");
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
					message="Fiat uses Mt Pelerin. Crypto swaps use the custom route form. Bridge moves ZCHF between chains. Transfer sends ZCHF to a wallet."
				/>
			</AppPageHeader>

			<section className="rounded-2xl border border-[#e8dcc8] bg-[#fffdf9] p-4 shadow-sm dark:border-menu-separator dark:bg-card-body-primary md:p-6">
				<div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
					<div>
						<p className="text-xs uppercase tracking-wider text-text-secondary">Route advisor</p>
						<h2 className="mt-1 text-2xl font-semibold text-text-primary">What do you want to do?</h2>
					</div>
					<p className="max-w-xl text-sm leading-6 text-text-secondary">
						Current recommendation: buy or swap on Base when possible. Use the bridge if you need ZCHF on a chain with weak direct swap liquidity.
					</p>
				</div>

				<div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
					{ACTIONS.map((action) => (
						<ActionCard key={action.value} action={action} active={activeAction === action.value} onClick={() => setActiveAction(action.value)} />
					))}
				</div>
			</section>

			<div className="mt-6">
				{activeAction === "fiat" ? <FiatExchangeModule /> : null}
				{activeAction === "swap" ? <DeskSwapForm /> : null}
				{activeAction === "bridge" || activeAction === "transfer" ? <BridgeTransferModule action={activeAction} /> : null}
			</div>

			<section className="rounded-2xl border border-[#e8dcc8] bg-[#fffdf9] p-5 shadow-sm dark:border-menu-separator dark:bg-card-body-primary md:p-6">
				<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<div>
						<h2 className="text-lg font-semibold text-text-primary">Why don’t we show every chain ZCHF lives on for trading?</h2>
						<p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
							ZCHF can live on more chains than the chains with reliable direct swap liquidity. ZCHF Desk shows trading routes that are likely to work well for Frankencoin Protocol users. Other supported chains may be better reached by first getting ZCHF on a liquid route, then moving it with the bridge.
						</p>
						<p className="mt-3 text-sm font-semibold text-text-primary">Selected route: {activeMeta.title}</p>
					</div>
					<AppButton to="/transfer" width="w-auto" className="min-h-[42px] shrink-0 px-4">
						Open Bridge
					</AppButton>
				</div>
			</section>
		</>
	);
}
