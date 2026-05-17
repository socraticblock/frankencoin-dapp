import AppButton from "@components/AppButton";
import AppButtonSecondary from "@components/AppButtonSecondary";
import LandingPreviewPanel from "./LandingPreviewPanel";
import { landingMotion } from "./motion";

export default function LandingHero() {
	return (
		<section className="relative overflow-hidden rounded-[1.6rem] border border-[#e6dcc8] bg-[#fbfaf6] px-5 py-8 shadow-sm dark:border-[#243044] dark:bg-[#08111f] sm:px-8 lg:px-12 lg:py-12">
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(255,255,255,0.72),transparent_22%)] md:bg-[radial-gradient(circle_at_8%_0%,rgba(255,255,255,0.88),transparent_24%),radial-gradient(circle_at_60%_115%,rgba(139,163,194,0.22),transparent_38%)] dark:bg-[radial-gradient(circle_at_16%_0%,rgba(48,73,106,0.42),transparent_26%)] md:dark:bg-[radial-gradient(circle_at_16%_0%,rgba(48,73,106,0.55),transparent_28%),radial-gradient(circle_at_62%_104%,rgba(214,189,124,0.11),transparent_34%)]" />
			<div className="pointer-events-none absolute -bottom-24 left-0 right-0 hidden h-48 rounded-[50%] border-t border-[#d6bd7c]/45 bg-[radial-gradient(ellipse_at_center,rgba(15,23,42,0.12),transparent_64%)] opacity-60 dark:border-[#d6bd7c]/35 dark:bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.13),transparent_64%)] sm:-bottom-28 sm:h-56 md:block md:opacity-100" />
			<div className="relative grid items-center gap-8 lg:grid-cols-[0.92fr_1.08fr]">
				<div className={landingMotion.hero}>
					<p className="text-xs font-black uppercase tracking-[0.22em] text-[#a37a24] dark:text-[#e3c77e]">Frankencoin Desk</p>
					<h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.06] tracking-normal text-[#111827] dark:text-[#f8f2e8] sm:text-5xl lg:text-6xl">
						A simpler way to use the Frankencoin Protocol
					</h1>
					<p className="mt-6 max-w-2xl text-xl leading-8 text-[#334155] dark:text-[#d6cec2]">
						Borrow, earn, exchange, bridge, transfer, and invest with Frankencoin from one clear place.
					</p>
					<p className="mt-4 max-w-xl text-base leading-7 text-[#566174] dark:text-[#b8c2d3]">
						Manage ZCHF and FPS with conservative language, exact wallet context, and auditable details behind the simple view.
					</p>
					<div className="mt-8 flex flex-col gap-3 sm:flex-row">
						<AppButton to="/desk" width="w-full sm:w-auto" className="min-h-[52px] px-6 text-base">
							Open your Desk
						</AppButton>
						<AppButtonSecondary to="/exchange" width="w-full sm:w-auto" className="min-h-[52px] px-6 text-base">
							Buy or Sell ZCHF
						</AppButtonSecondary>
					</div>
					<div className="mt-7 flex flex-wrap gap-3 text-sm font-semibold text-[#4b5563] dark:text-[#c7d1df]">
						<span className="rounded-full border border-[#e1d4bc] bg-white/60 px-3 py-2 dark:border-white/10 dark:bg-white/5">Clear flows</span>
						<span className="rounded-full border border-[#e1d4bc] bg-white/60 px-3 py-2 dark:border-white/10 dark:bg-white/5">Cleaner actions</span>
						<span className="rounded-full border border-[#e1d4bc] bg-white/60 px-3 py-2 dark:border-white/10 dark:bg-white/5">Better overview</span>
					</div>
				</div>
				<LandingPreviewPanel />
			</div>
		</section>
	);
}
