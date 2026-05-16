import AppNotice from "@components/AppNotice";
import { useMemo, useState } from "react";
import { buildMtPelerinWidgetUrl, MTP_NETWORKS, type MtPelerinNetwork, type MtPelerinTab } from "../../utils/mtpelerin";

type FiatFlow = "buy" | "sell";

const FIAT_FLOW_COPY: Record<FiatFlow, string> = {
	buy: "Buy ZCHF with fiat through Mt Pelerin.",
	sell: "Sell ZCHF for fiat through Mt Pelerin.",
};

export default function FiatExchangeModule() {
	const [flow, setFlow] = useState<FiatFlow>("buy");
	const [network, setNetwork] = useState<MtPelerinNetwork>("base_mainnet");
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
					{(["buy", "sell"] as FiatFlow[]).map((item) => (
						<button key={item} type="button" onClick={() => setFlow(item)} className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${flow === item ? "border-[#c4a75f] bg-button-default text-white" : "border-[#e0d4bd] bg-card-content-primary text-text-primary hover:border-[#c4a75f] dark:border-menu-separator"}`}>
							{item === "buy" ? "Buy ZCHF with fiat" : "Sell ZCHF to fiat"}
						</button>
					))}
				</div>
			</div>

			<AppNotice variant="neutral" message="Mt Pelerin handles fiat fees, limits, identity checks, delivery times, and country availability." />

			{widgetUrl ? (
				<div className="mx-auto mt-5 max-w-[920px] overflow-hidden rounded-xl border border-[#e0d4bd] bg-white shadow-sm dark:border-menu-separator dark:bg-card-content-secondary">
					<iframe
						key={widgetUrl}
						allow="usb; ethereum; clipboard-write; payment"
						className="h-[640px] w-full bg-white"
						loading="lazy"
						referrerPolicy="strict-origin-when-cross-origin"
						src={widgetUrl}
						title="Mt Pelerin ZCHF fiat gateway"
					/>
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
