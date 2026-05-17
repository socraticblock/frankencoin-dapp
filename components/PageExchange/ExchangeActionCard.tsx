import type { ExchangeAction } from "./exchangeRoute";

export type ExchangeActionCardData = {
	value: ExchangeAction;
	title: string;
	subtitle: string;
	detail: string;
};

export default function ExchangeActionCard({ action, active, onClick }: { action: ExchangeActionCardData; active: boolean; onClick: () => void }) {
	return (
		<button type="button" onClick={onClick} className={`rounded-2xl border p-4 text-left transition ${active ? "border-[#c4a75f] bg-button-default text-white shadow-sm" : "border-[#e0d4bd] bg-[#fffdf9] text-text-primary hover:border-[#c4a75f] dark:border-menu-separator dark:bg-card-body-primary"}`}>
			<p className={`text-xs uppercase tracking-wider ${active ? "text-white/75" : "text-text-secondary"}`}>{action.subtitle}</p>
			<h2 className="mt-2 text-lg font-semibold">{action.title}</h2>
			<p className={`mt-2 text-sm leading-6 ${active ? "text-white/85" : "text-text-secondary"}`}>{action.detail}</p>
		</button>
	);
}
