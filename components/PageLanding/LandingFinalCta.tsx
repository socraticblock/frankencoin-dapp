import AppButton from "@components/AppButton";
import LandingVisualAsset from "./LandingVisualAsset";

export default function LandingFinalCta() {
	return (
		<section className="relative overflow-hidden rounded-2xl border border-[#d7c28a]/60 bg-[#f8f5ee] p-6 shadow-sm dark:border-[#d7c28a]/25 dark:bg-[#0b1422] md:p-8">
			<div className="absolute right-0 top-1/2 hidden -translate-y-1/2 opacity-10 dark:opacity-16 md:block">
				<LandingVisualAsset visual="desk" size="watermark" className="scale-150" />
			</div>
			<div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
				<div>
					<p className="text-xs font-black uppercase tracking-[0.18em] text-[#9b7625] dark:text-[#e5c978]">Frankencoin Desk</p>
					<h2 className="mt-3 text-2xl font-black tracking-tight text-[#111827] dark:text-[#f8f2e8]">Open the command center.</h2>
					<p className="mt-2 max-w-2xl text-sm leading-6 text-[#566174] dark:text-[#c7d1df]">Connect your wallet below to load current balances, earning, protocol investment, borrowing, and chain-level allocations.</p>
				</div>
				<AppButton to="/desk" width="w-full md:w-auto" className="min-h-[48px] px-6">
					Go to Desk
				</AppButton>
			</div>
		</section>
	);
}
