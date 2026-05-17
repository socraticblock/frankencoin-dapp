import AppButton from "@components/AppButton";
import { previewCards } from "./landingContent";
import LandingVisualAsset from "./LandingVisualAsset";
import { landingMotion } from "./motion";

export default function LandingPreviewPanel() {
	return (
		<aside className={`relative rounded-[1.35rem] border border-[#d6bd7c]/55 bg-[#fffaf0]/88 p-3 shadow-[0_12px_36px_rgba(15,23,42,0.12)] backdrop-blur-md dark:border-[#d6bd7c]/45 dark:bg-[#07111f]/92 dark:shadow-[0_16px_48px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-5 md:shadow-[0_24px_80px_rgba(15,23,42,0.16)] md:backdrop-blur-xl md:dark:shadow-[0_28px_100px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)] ${landingMotion.preview}`}>
			<div className="pointer-events-none absolute inset-0 rounded-[1.35rem] bg-[radial-gradient(circle_at_45%_0%,rgba(255,255,255,0.42),transparent_26%)] md:bg-[radial-gradient(circle_at_45%_0%,rgba(255,255,255,0.6),transparent_28%),radial-gradient(circle_at_80%_110%,rgba(214,189,124,0.18),transparent_34%)] dark:bg-[radial-gradient(circle_at_45%_0%,rgba(255,255,255,0.12),transparent_26%)] md:dark:bg-[radial-gradient(circle_at_45%_0%,rgba(255,255,255,0.16),transparent_28%),radial-gradient(circle_at_80%_110%,rgba(96,165,250,0.12),transparent_34%)]" />
			<div className="relative">
				<div className="flex items-center justify-between gap-3">
					<div className="flex items-center gap-3">
						<LandingVisualAsset visual="desk" size="icon" className="hidden sm:block" />
						<div>
							<h2 className="text-base font-black tracking-tight text-[#111827] dark:text-[#f8f2e8] sm:text-xl">Frankencoin Desk</h2>
							<p className="text-xs font-medium text-[#627085] dark:text-[#b8c2d3]">Private wallet command center</p>
						</div>
					</div>
					<div className="hidden items-center gap-2 rounded-full border border-[#d9c99e] bg-white/75 px-3 py-2 text-xs font-semibold text-[#162033] dark:border-white/10 dark:bg-[#101a2a]/92 dark:text-[#f8f2e8] sm:flex">
						<span className="h-2 w-2 rounded-full bg-[#44d38a]" />
						Ethereum
					</div>
				</div>

				<div className="mt-4 rounded-xl border border-[#d7c28a]/75 bg-[#fff7e8]/82 p-3 shadow-sm dark:border-[#9c854f]/60 dark:bg-[#111b2c]/92 sm:mt-6 sm:p-4">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8b681e] dark:text-[#e5c978]">Suggested next action</div>
							<p className="mt-1 text-sm font-semibold text-[#111827] dark:text-[#fff8ea] sm:text-base">17.90 ZCHF interest is ready to collect.</p>
						</div>
						<AppButton to="/savings" size="small" width="w-full sm:w-auto" className="min-h-[40px] bg-[#243247] px-4 text-sm dark:bg-[#243247] dark:hover:bg-[#31435e]">
							Manage earning
						</AppButton>
					</div>
				</div>

				<div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-3">
					{previewCards.map((card) => (
						<article key={card.title} className="relative min-h-[9rem] overflow-hidden rounded-xl border border-[#e1d5bd] bg-white/82 p-3 shadow-sm dark:border-white/10 dark:bg-[#101a2a]/92 sm:min-h-[14.5rem] sm:p-4">
							<div className="absolute right-2 top-3 opacity-70 sm:right-4 sm:top-7 sm:opacity-85">
								<LandingVisualAsset visual={card.visual} size="card" className="scale-75 sm:scale-100" />
							</div>
							<div className="relative flex h-full flex-col pr-6 sm:pr-20">
								<div className="text-sm font-black text-[#162033] dark:text-[#fff8ea] sm:text-base">{card.title}</div>
								<div className="mt-2 text-xl font-black leading-tight text-[#0f172a] dark:text-white sm:mt-3 sm:text-3xl">{card.amount}</div>
								<p className={`mt-1 text-xs font-semibold sm:text-sm ${card.accent ?? "text-[#5b6679] dark:text-[#c7d1df]"}`}>{card.copy}</p>
								<div className="flex-1" />
								<div className="mt-3 rounded-lg border border-[#e6dcc9] bg-[#f4efe6] px-3 py-2 text-center text-xs font-black text-[#243044] dark:border-white/10 dark:bg-[#243247] dark:text-[#f8f2e8] sm:text-sm">
									{card.action}
								</div>
							</div>
						</article>
					))}
				</div>
			</div>
		</aside>
	);
}
