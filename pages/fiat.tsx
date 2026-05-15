import AppNotice from "@components/AppNotice";
import AppPageHeader from "@components/AppPageHeader";
import AppButton from "@components/AppButton";
import Head from "next/head";
import { useMemo, useState } from "react";
import {
	buildMtPelerinWidgetUrl,
	getMtPelerinActivationKey,
	MTP_NETWORKS,
	MtPelerinNetwork,
	MtPelerinTab,
} from "../utils/mtpelerin";

const FLOW_OPTIONS: { value: MtPelerinTab; label: string; copy: string }[] = [
	{
		value: "buy",
		label: "Buy ZCHF",
		copy: "Buy ZCHF with fiat through Mt Pelerin. Default route: CHF to ZCHF.",
	},
	{
		value: "sell",
		label: "Cash out ZCHF",
		copy: "Cash out ZCHF back to fiat through Mt Pelerin. Default route: ZCHF to CHF.",
	},
];

export default function FiatPage() {
	const [tab, setTab] = useState<MtPelerinTab>("buy");
	const [network, setNetwork] = useState<MtPelerinNetwork>("base_mainnet");
	const activation = getMtPelerinActivationKey();
	const widgetUrl = useMemo(() => buildMtPelerinWidgetUrl(tab, network), [network, tab]);
	const selectedFlow = FLOW_OPTIONS.find((option) => option.value === tab) ?? FLOW_OPTIONS[0];

	return (
		<>
			<Head>
				<title>Buy & Sell ZCHF | ZCHF Desk</title>
			</Head>

			<AppPageHeader
				eyebrow="FIAT GATEWAY"
				title="Buy & Cash Out ZCHF"
				description="Buy ZCHF with fiat or cash out ZCHF to your bank. Crypto swaps now live on the Swap page."
			>
				<AppNotice
					variant="neutral"
					message="Fiat gateway powered by Mt Pelerin. Fees, limits, identity checks, delivery times, and country availability are handled by Mt Pelerin."
				/>
			</AppPageHeader>

			<section className="rounded-2xl border border-[#e8dcc8] bg-[#fffdf9] p-4 shadow-sm dark:border-menu-separator dark:bg-card-body-primary md:p-6">
				<div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
					<div className="flex flex-wrap gap-2">
						{FLOW_OPTIONS.map((option) => (
							<button
								key={option.value}
								type="button"
								onClick={() => setTab(option.value)}
								className={`min-h-[42px] rounded-lg border px-4 text-sm font-semibold transition ${
									tab === option.value
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
				<p className="mt-4 text-sm leading-6 text-text-secondary">{selectedFlow.copy}</p>

				<div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#e0d4bd] bg-card-content-secondary/70 p-4 dark:border-menu-separator dark:bg-card-content-secondary md:flex-row md:items-center md:justify-between">
					<div>
						<h2 className="text-sm font-semibold text-text-primary">Want to exchange crypto instead?</h2>
						<p className="mt-1 text-xs leading-5 text-text-secondary">Use the CoW Swap page for crypto to ZCHF or ZCHF to crypto.</p>
					</div>
					<AppButton to="/swap" width="w-auto" size="small" className="min-h-[38px] px-4">
						Open Swap
					</AppButton>
				</div>

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
		</>
	);
}
