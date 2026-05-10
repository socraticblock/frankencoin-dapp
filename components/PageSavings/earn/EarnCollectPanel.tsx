import { formatCurrency } from "@utils";
import { formatUnits } from "viem";
import SavingsActionInterest from "../SavingsActionInterest";
import SavingsActionSave from "../SavingsActionSave";
import type { Address } from "viem";
import type { CollectAction } from "./earnTypes";

export type EarnCollectPanelProps = {
	userSavingsBalance: bigint;
	userSavingsInterest: bigint;
	compoundTargetAmount: bigint;
	netInterestAmount: bigint;
	collectAction: CollectAction;
	onCollectActionChange: (next: CollectAction) => void;
	error: boolean;
	savingsModule: Address;
};

export default function EarnCollectPanel({
	userSavingsBalance,
	userSavingsInterest,
	compoundTargetAmount,
	netInterestAmount,
	collectAction,
	onCollectActionChange,
	error,
	savingsModule,
}: EarnCollectPanelProps) {
	return (
		<div className="mt-8 space-y-4 rounded-xl border border-[#e0d4bd] bg-[#fffaf0] p-5 dark:border-menu-separator dark:bg-card-body-primary">
			{userSavingsInterest === 0n ? (
				<p className="text-sm text-text-secondary">No interest ready to collect.</p>
			) : (
				<>
					<div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
						<span className="text-text-secondary">Interest ready</span>
						<span className="font-semibold tabular-nums text-text-primary">
							{formatCurrency(formatUnits(userSavingsInterest, 18))} ZCHF
						</span>
					</div>
					<div className="grid gap-2 sm:grid-cols-2">
						<button
							type="button"
							onClick={() => onCollectActionChange("collect_wallet")}
							className={`min-h-[44px] rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
								collectAction === "collect_wallet"
									? "border-[#c4a75f] bg-[#f4ead4]/90 text-text-primary shadow-sm dark:border-[#8a7448] dark:bg-[#2a3244]"
									: "border-[#e0d4bd] bg-[#fffdf8] text-text-secondary hover:border-[#c4a75f]/60 dark:border-menu-separator dark:bg-card-body-primary"
							}`}
						>
							Collect to wallet
						</button>
						<button
							type="button"
							onClick={() => onCollectActionChange("compound")}
							className={`min-h-[44px] rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
								collectAction === "compound"
									? "border-[#c4a75f] bg-[#f4ead4]/90 text-text-primary shadow-sm dark:border-[#8a7448] dark:bg-[#2a3244]"
									: "border-[#e0d4bd] bg-[#fffdf8] text-text-secondary hover:border-[#c4a75f]/60 dark:border-menu-separator dark:bg-card-body-primary"
							}`}
						>
							Compound into earning
						</button>
					</div>
					<div className="pt-1">
						{collectAction === "compound" ? (
							<SavingsActionSave
								disabled={!!error}
								savingsModule={savingsModule}
								targetSavingsAmount={compoundTargetAmount}
								displayActionAmount={netInterestAmount}
								buttonLabel="Compound interest"
							/>
						) : (
							<SavingsActionInterest
								disabled={!!error}
								savingsModule={savingsModule}
								targetSavingsAmount={userSavingsBalance}
								displayActionAmount={netInterestAmount}
								buttonLabel="Collect to wallet"
							/>
						)}
					</div>
				</>
			)}
		</div>
	);
}
