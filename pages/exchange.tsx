import AppButton from "@components/AppButton";
import AppNotice from "@components/AppNotice";
import AppPageHeader from "@components/AppPageHeader";
import DeskSwapForm from "@components/PageExchange/DeskSwapForm";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import {
	buildMtPelerinWidgetUrl,
	getMtPelerinActivationKey,
	MTP_NETWORKS,
	type MtPelerinNetwork,
	type MtPelerinTab,
} from "../utils/mtpelerin";

type ExchangeAction = "fiat" | "swap";
type FiatFlow = "buy" | "sell";

const ACTIONS = [
	{
		value: "fiat" as const,
		title: "Buy or Sell with Fiat",
		subtitle: "Fiat gateway",
		detail: "Use Mt Pelerin to buy ZCHF with fiat, or sell ZCHF back to fiat.",
	},
	{
		value: "swap" as const,
		title: "Swap Crypto ↔ ZCHF",
		subtitle: "Crypto already in your wallet",
		detail: "Use supported wallet crypto to buy ZCHF, or sell ZCHF back to crypto.",
	},
];

const FIAT_FLOW_COPY: Record<FiatFlow, string> = {
	buy: "Buy ZCHF with fiat through Mt Pelerin. Base is a good default for most retail users.",
	sell: "Cash out ZCHF back to fiat through Mt Pelerin. Review fees, limits, and bank details inside the widget.",
};

function parseRoute(value: unknown): ExchangeAction | null {
	return value === "fiat" || value === "swap" ? value : null;
}

function ActionCard({ action, active, onClick }: { action: (typeof ACTIONS)[number]; active: boolean; onClick: () => void }) {
	return (
		<button type="button" onClick={onClick} className={`rounded-2xl border p-4 text-left transition ${active ? "border-[#c4a75f] bg-button-default text-white shadow-sm" : "border-[#e0d4bd] bg-[#fffdf9] text-text-primary hover:border-[#c4a75f] dark:border-menu-separator dark:bg-card-body-primary"}`}>
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
					<select value={network} onChange={(event) => setNetwork(event.target.value as MtPelerinNetwork)} className="min-h-[42px] rounded-lg border border-[#e0d4bd] bg-card-content-secondary px-3 text-sm font-semibold text-text-primary outline-none transition hover:border-[#c4a75f] focus:border-[#c4a75f] dark:border-menu-separator">
						{MTP_NETWORKS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
					</select>
				</label>
			</div>

			<div className="mt-5 rounded-2xl border border-[#e0d4bd] bg-card-content-secondary/70 p-3 dark:border-menu-separator dark:bg-card-content-secondary">
				<p className="text-xs uppercase tracking-wider text-text-secondary">I want to</p>
				<div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
					{(["buy", "sell"] as FiatFlow[]).map((item) => (
						<button key={item} type="button" onClick={() => setFlow(item)} className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${flow === item ? "border-[#c4a75f] bg-button-default text-white" : "border-[#e0d4bd] bg-card-content-primary text-text-primary hover:border-[#c4a75f] dark:border-menu-separator"}`}>
							{item === "buy" ? "Buy ZCHF with fiat" : "Sell ZCHF to fiat"}
						</button>
					))}
				</div>
			</div>

			<AppNotice variant="neutral" message="Mt Pelerin handles fiat fees, limits, identity checks, delivery times, and country availability." />

			{activation.usingDevFallback ? <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-200">Using the Mt Pelerin development activation key. Set NEXT_PUBLIC_MTP_ACTIVATION_KEY for production.</p> : null}

			{widgetUrl ? (
				<div className="mx-auto mt-5 max-w-[920px] overflow-hidden rounded-xl border border-[#e0d4bd] bg-white shadow-sm dark:border-menu-separator dark:bg-card-content-secondary">
					<iframe key={widgetUrl} allow="usb; ethereum; clipboard-write; payment" className="h-[640px] w-full bg-white" loading="lazy" src={widgetUrl} title="Mt Pelerin ZCHF fiat gateway" />
				</div>
			) : (
				<div className="mt-5 rounded-xl border border-amber-200 bg-[#fffaf0] p-5 text-slate-800 shadow-sm dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-100">
					<h2 className="text-lg font-semibold">Mt Pelerin activation key required</h2>
					<p className="mt-2 max-w-2xl text-sm leading-6">Set NEXT_PUBLIC_MTP_ACTIVATION_KEY in the production environment to enable the ZCHF fiat gateway.</p>
				</div>
			)}
		</section>
	);
}

function HelperPanel() {
	return (
		<section className="grid grid-cols-1 gap-4 md:grid-cols-2">
			<div className="rounded-2xl border border-[#e8dcc8] bg-[#fffdf9] p-5 shadow-sm dark:border-menu-separator dark:bg-card-body-primary">
				<h2 className="text-lg font-semibold text-text-primary">Already have ZCHF?</h2>
				<p className="mt-2 text-sm leading-6 text-text-secondary">Bridge ZCHF to another chain or transfer it to another wallet. These actions move existing ZCHF; they do not buy or sell it.</p>
				<div className="mt-4 flex flex-wrap gap-2">
					<AppButton to="/bridge" width="w-auto" className="min-h-[42px] px-4">Bridge ZCHF</AppButton>
					<AppButton to="/transfer" width="w-auto" className="min-h-[42px] px-4">Transfer ZCHF</AppButton>
				</div>
			</div>
			<div className="rounded-2xl border border-[#e8dcc8] bg-[#fffdf9] p-5 shadow-sm dark:border-menu-separator dark:bg-card-body-primary">
				<h2 className="text-lg font-semibold text-text-primary">Looking for FPS or WFPS?</h2>
				<p className="mt-2 text-sm leading-6 text-text-secondary">Use Invest to mint, redeem, wrap, or unwrap Frankencoin Pool Shares. Exchange only handles buying and selling ZCHF.</p>
				<AppButton to="/equity" width="w-auto" className="mt-4 min-h-[42px] px-4">Open Invest</AppButton>
			</div>
		</section>
	);
}

export default function ExchangePage() {
	const router = useRouter();
	const [activeAction, setActiveAction] = useState<ExchangeAction>("fiat");

	useEffect(() => {
		const route = parseRoute(router.query.route);
		if (route) setActiveAction(route);
	}, [router.query.route]);

	return (
		<>
			<Head><title>Buy or Sell ZCHF | ZCHF Desk</title></Head>

			<AppPageHeader eyebrow="EXCHANGE" title="Buy or Sell ZCHF" description="Use fiat or wallet crypto to buy ZCHF, or sell ZCHF back.">
				<AppNotice variant="neutral" message="Fiat uses Mt Pelerin. Crypto swaps use CoW-powered ZCHF routes. Already have ZCHF? Use Bridge to move between chains or Transfer to send to another wallet." />
			</AppPageHeader>

			<section className="rounded-2xl border border-[#e8dcc8] bg-[#fffdf9] p-4 shadow-sm dark:border-menu-separator dark:bg-card-body-primary md:p-6">
				<div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
					<div>
						<p className="text-xs uppercase tracking-wider text-text-secondary">Exchange route</p>
						<h2 className="mt-1 text-2xl font-semibold text-text-primary">How do you want to buy or sell ZCHF?</h2>
					</div>
					<p className="max-w-xl text-sm leading-6 text-text-secondary">Base is recommended for most crypto swaps. Ethereum routes are available but may have higher network costs.</p>
				</div>
				<div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">{ACTIONS.map((action) => <ActionCard key={action.value} action={action} active={activeAction === action.value} onClick={() => setActiveAction(action.value)} />)}</div>
			</section>

			<div className="mt-6">{activeAction === "fiat" ? <FiatExchangeModule /> : <DeskSwapForm />}</div>
			<HelperPanel />
		</>
	);
}
