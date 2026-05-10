import type { ReactNode } from "react";
import type { WithdrawMode } from "./earnTypes";

export type EarnWithdrawPanelProps = {
	withdrawMode: WithdrawMode;
	onWithdrawModePartial: () => void;
	onWithdrawModeAll: () => void;
	customPanel: ReactNode;
	allPanel: ReactNode;
};

export default function EarnWithdrawPanel({
	withdrawMode,
	onWithdrawModePartial,
	onWithdrawModeAll,
	customPanel,
	allPanel,
}: EarnWithdrawPanelProps) {
	return (
		<div className="mt-8 space-y-4">
			<div className="grid gap-2 sm:grid-cols-2">
				<button
					type="button"
					onClick={onWithdrawModePartial}
					className={`min-h-[44px] rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
						withdrawMode === "partial"
							? "border-[#c4a75f] bg-[#f4ead4]/90 text-text-primary shadow-sm dark:border-[#8a7448] dark:bg-[#2a3244]"
							: "border-[#e0d4bd] bg-[#fffdf8] text-text-secondary hover:border-[#c4a75f]/60 dark:border-menu-separator dark:bg-card-body-primary"
					}`}
				>
					Custom amount
				</button>
				<button
					type="button"
					onClick={onWithdrawModeAll}
					className={`min-h-[44px] rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
						withdrawMode === "all"
							? "border-[#c4a75f] bg-[#f4ead4]/90 text-text-primary shadow-sm dark:border-[#8a7448] dark:bg-[#2a3244]"
							: "border-[#e0d4bd] bg-[#fffdf8] text-text-secondary hover:border-[#c4a75f]/60 dark:border-menu-separator dark:bg-card-body-primary"
					}`}
				>
					Withdraw all
				</button>
			</div>
			{withdrawMode === "partial" ? customPanel : allPanel}
		</div>
	);
}
