import { formatCurrency } from "@utils";

export type EarnSummaryCardsProps = {
	totalBalanceHuman: number;
	summaryEarningDisplay: string;
	summaryInterestDisplay: string;
	interestTotalsIncomplete: boolean;
	chainsCountLabel: string;
	selectedChainName: string;
	saveRatePercent: number;
};

export default function EarnSummaryCards({
	totalBalanceHuman,
	summaryEarningDisplay,
	summaryInterestDisplay,
	interestTotalsIncomplete,
	chainsCountLabel,
	selectedChainName,
	saveRatePercent,
}: EarnSummaryCardsProps) {
	return (
		<section className="relative overflow-hidden rounded-2xl border border-[#dfd2bb] bg-[#fffaf0] p-5 shadow-sm dark:border-menu-separator dark:bg-card-body-primary md:p-6">
			<div className="pointer-events-none absolute inset-0 opacity-[0.025] [background-image:radial-gradient(#0b1f3a_0.7px,transparent_0.7px)] [background-size:6px_6px] dark:opacity-[0.04]" />
			<div className="relative space-y-4">
				<p className="text-sm text-text-secondary">
					Across the protocol, over {Math.floor(totalBalanceHuman / 1_000_000)} million ZCHF participate in savings. Your balances below are for this wallet.
				</p>
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
					<div className="rounded-xl border border-[#e0d4bd] bg-[#fffdf8]/95 px-4 py-4 dark:border-menu-separator dark:bg-card-content-secondary">
						<div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9b7625] dark:text-[#e5c978]">
							Total earning
						</div>
						<div className="mt-2 text-xl font-semibold text-text-primary">{summaryEarningDisplay}</div>
					</div>
					<div className="rounded-xl border border-[#e0d4bd] bg-[#fffdf8]/95 px-4 py-4 dark:border-menu-separator dark:bg-card-content-secondary">
						<div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9b7625] dark:text-[#e5c978]">
							Interest ready
						</div>
						<div className="mt-2 text-xl font-semibold text-text-primary">{summaryInterestDisplay}</div>
						{interestTotalsIncomplete ? (
							<p className="mt-1 text-xs text-text-secondary">Some chains are still updating.</p>
						) : null}
					</div>
					<div className="rounded-xl border border-[#e0d4bd] bg-[#fffdf8]/95 px-4 py-4 dark:border-menu-separator dark:bg-card-content-secondary">
						<div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9b7625] dark:text-[#e5c978]">
							Active earning chains
						</div>
						<div className="mt-2 text-xl font-semibold text-text-primary">{chainsCountLabel}</div>
					</div>
				</div>
				<p className="text-xs text-text-secondary">
					Current protocol savings rate on {selectedChainName}: {formatCurrency(saveRatePercent)}% per year (indicative).
				</p>
			</div>
		</section>
	);
}
