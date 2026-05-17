import AppPageHeader from "@components/AppPageHeader";
import DeskSwapForm from "@components/PageExchange/DeskSwapForm";
import ExchangeActionCard, { type ExchangeActionCardData } from "@components/PageExchange/ExchangeActionCard";
import ExchangeHelperPanel from "@components/PageExchange/ExchangeHelperPanel";
import FiatExchangeModule from "@components/PageExchange/FiatExchangeModule";
import SwissStablecoinConvertModule from "@components/PageExchange/SwissStablecoinConvertModule";
import { parseExchangeRoute, type ExchangeAction } from "@components/PageExchange/exchangeRoute";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

const ACTIONS: ExchangeActionCardData[] = [
	{
		value: "fiat",
		title: "Buy or Sell with Fiat",
		subtitle: "Fiat gateway",
		detail: "Use Mt Pelerin to buy ZCHF with fiat, or sell ZCHF back to fiat.",
	},
	{
		value: "swap",
		title: "Swap Crypto ↔ ZCHF",
		subtitle: "Market swap",
		detail: "Use supported wallet crypto to buy ZCHF, or sell ZCHF back to crypto through CoW Protocol.",
	},
	{
		value: "convert",
		title: "Stablecoin Bridge",
		subtitle: "VCHF/CHFAU ↔ ZCHF",
		detail: "Convert supported Swiss franc stablecoins into Frankencoin through protocol modules.",
	},
];

export default function ExchangePage() {
	const router = useRouter();
	const [activeAction, setActiveAction] = useState<ExchangeAction>("fiat");

	useEffect(() => {
		const route = parseExchangeRoute(router.query.route);
		if (route) setActiveAction(route);
	}, [router.query.route]);

	const selectAction = (action: ExchangeAction) => {
		setActiveAction(action);
		void router.replace(
			{
				pathname: router.pathname,
				query: { ...router.query, route: action },
			},
			undefined,
			{ shallow: true }
		);
	};

	return (
		<>
			<Head>
				<title>Buy or Sell ZCHF | ZCHF Desk</title>
			</Head>

			<AppPageHeader
				eyebrow="EXCHANGE"
				title="Buy or Sell ZCHF"
				description="Use fiat, crypto swaps, or Swiss stablecoin modules to get or move between ZCHF."
			/>

			<section className="rounded-2xl border border-[#e8dcc8] bg-[#fffdf9] p-4 shadow-sm dark:border-menu-separator dark:bg-card-body-primary md:p-6">
				<div>
					<p className="text-xs uppercase tracking-wider text-text-secondary">Exchange route</p>
					<h2 className="mt-1 text-2xl font-semibold text-text-primary">How do you want to get or use ZCHF?</h2>
				</div>
				<div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
					{ACTIONS.map((action) => (
						<ExchangeActionCard key={action.value} action={action} active={activeAction === action.value} onClick={() => selectAction(action.value)} />
					))}
				</div>
			</section>

			<div className="mt-6">
				{activeAction === "fiat" ? (
					<FiatExchangeModule />
				) : activeAction === "swap" ? (
					<DeskSwapForm />
				) : (
					<SwissStablecoinConvertModule />
				)}
			</div>
			<ExchangeHelperPanel />
		</>
	);
}
