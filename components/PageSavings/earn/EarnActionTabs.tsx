import type { EarnAction } from "./earnTypes";

export type EarnActionTabsProps = {
	earnAction: EarnAction;
	onChange: (next: EarnAction) => void;
};

export default function EarnActionTabs({ earnAction, onChange }: EarnActionTabsProps) {
	return (
		<div className="mt-6 flex w-full flex-col gap-2 sm:flex-row">
			{(["collect", "deposit", "withdraw"] as const).map((tab) => (
				<button
					key={tab}
					type="button"
					onClick={() => onChange(tab)}
					className={`min-h-[44px] flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
						earnAction === tab
							? "border-[#c4a75f] bg-[#f4ead4]/90 text-text-primary shadow-sm dark:border-[#8a7448] dark:bg-[#2a3244]"
							: "border-[#e0d4bd] bg-[#fffdf8] text-text-secondary hover:border-[#c4a75f]/60 dark:border-menu-separator dark:bg-card-body-primary"
					}`}
				>
					{tab === "collect" ? "Collect" : tab === "deposit" ? "Deposit" : "Withdraw"}
				</button>
			))}
		</div>
	);
}
