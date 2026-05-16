import AppLink from "@components/AppLink";
import { landingActions } from "./landingContent";
import LandingVisualAsset from "./LandingVisualAsset";
import { landingMotion } from "./motion";

const TONE_CLASS = {
	blue: "border-blue-200/80 bg-blue-50/45 text-blue-800 dark:border-blue-500/20 dark:bg-blue-400/10 dark:text-blue-200",
	green: "border-emerald-200/80 bg-emerald-50/45 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-200",
	violet: "border-violet-200/80 bg-violet-50/45 text-violet-800 dark:border-violet-500/20 dark:bg-violet-400/10 dark:text-violet-200",
	brass: "border-[#d6bd7c]/70 bg-[#fff6e0]/60 text-[#80601d] dark:border-[#d6bd7c]/25 dark:bg-[#d6bd7c]/10 dark:text-[#e8d08b]",
};

export default function LandingActionGrid() {
	return (
		<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
			{landingActions.map((action, index) => (
				<article
					key={action.title}
					className={`relative min-h-[230px] overflow-hidden rounded-xl border border-[#e4d8c4] bg-[#fffdf8] p-5 shadow-sm dark:border-[#2a3444] dark:bg-[#101826] ${landingMotion.card}`}
					style={{ animationDelay: `${index * 70}ms` }}
				>
					<div className="absolute -right-6 -top-6 opacity-30 dark:opacity-24">
						<LandingVisualAsset visual={action.visual} size="watermark" />
					</div>
					<div className="relative flex h-full flex-col">
						<div className={`inline-flex h-11 w-11 items-center justify-center rounded-full border ${TONE_CLASS[action.tone]}`}>
							<LandingVisualAsset visual={action.visual} size="icon" className="scale-[0.62]" />
						</div>
						<h2 className="mt-5 text-lg font-black text-[#111827] dark:text-[#f8f2e8]">{action.title}</h2>
						<p className="mt-3 text-sm leading-6 text-[#566174] dark:text-[#c7d1df]">{action.copy}</p>
						<div className="flex-1" />
						<AppLink href={action.href} label={action.label} icon className="mt-5 inline-flex text-sm font-black text-[#0b1f3a] hover:text-[#12345a] dark:text-[#e8d08b] dark:hover:text-[#f5dea2]" />
					</div>
				</article>
			))}
		</section>
	);
}
