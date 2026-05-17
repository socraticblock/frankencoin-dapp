import AppButton from "@components/AppButton";
import type { CockpitCardProps } from "./deskTypes";

export default function DeskCockpitCard({
	title,
	copy,
	amount,
	secondaryCopy,
	help,
	iconLabel,
	action,
	secondaryActions,
	tone,
	onAction,
}: CockpitCardProps) {
	const toneClass = {
		brass: "border-[#d6bd7c] bg-[#fffdf8] text-[#9b7625]",
		blue: "border-blue-200 bg-blue-50/60 text-blue-700 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-300",
		violet: "border-violet-200 bg-violet-50/60 text-violet-700 dark:border-violet-900 dark:bg-violet-950/20 dark:text-violet-300",
		slate: "border-slate-200 bg-slate-50/70 text-slate-700 dark:border-slate-700 dark:bg-slate-900/20 dark:text-slate-300",
		green: "border-emerald-200 bg-emerald-50/50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300",
	}[tone];

	return (
		<article className="flex min-h-[284px] flex-col rounded-xl border border-[#dfd2bb] bg-card-content-secondary p-4 shadow-sm dark:border-menu-separator">
			<div className={`flex h-10 w-10 items-center justify-center rounded-full border ${toneClass}`} title={help}>
				<span className="text-[10px] font-semibold uppercase tracking-[0.16em]">{iconLabel}</span>
			</div>
			<div className="mt-3 text-base font-semibold text-text-primary">{title}</div>
			{amount ? <div className="mt-4 text-2xl font-semibold leading-tight text-text-primary">{amount}</div> : null}
			<p className="mt-3 text-sm leading-6 text-text-secondary">{copy}</p>
			{secondaryCopy ? <p className="mt-2 text-sm font-medium text-text-success">{secondaryCopy}</p> : null}
			<div className="flex-1" />
			{action ? (
				<div className="mt-4 space-y-2">
					<AppButton size="small" width="w-full" className="min-h-[44px] whitespace-normal px-4 py-3 text-center leading-tight" onClick={() => onAction(action)}>
						{action.label}
					</AppButton>
					{secondaryActions?.map((secondaryAction) => (
						<button
							key={secondaryAction.label}
							type="button"
							disabled={!secondaryAction.action}
							onClick={() => secondaryAction.action && onAction(secondaryAction.action)}
							className={`flex min-h-[38px] w-full items-center justify-between rounded-lg border border-[#e0d4bd] px-3 text-sm transition dark:border-menu-separator dark:bg-card-content-primary ${
								secondaryAction.action ? "bg-card-content-secondary text-text-primary hover:border-[#c4a75f]" : "cursor-not-allowed bg-[#f4efe6] text-text-secondary opacity-80"
							}`}
						>
							<span>{secondaryAction.label}</span>
							<span className="rounded-full border border-[#d7c28a] px-2 py-0.5 text-[10px] font-semibold text-[#80601d] dark:border-[#8a7448] dark:text-[#e5c978]">{secondaryAction.note}</span>
						</button>
					))}
				</div>
			) : null}
		</article>
	);
}

