import SavingsActionWithdraw from "../SavingsActionWithdraw";
import EarnCustomTargetAddress from "./EarnCustomTargetAddress";
import { formatCurrency } from "@utils";
import { formatUnits } from "viem";
import type { Address } from "viem";

export type EarnWithdrawAllPanelProps = {
	userSavingsBalance: bigint;
	userSavingsInterest: bigint;
	existingReferralFees: bigint;
	savedAfterRefresh: bigint;
	chainName: string;
	onbehalfToggle: boolean;
	onbehalfAddress: string;
	onbehalfError: string;
	onOnbehalfToggle: (enabled: boolean) => void;
	onOnbehalfAddressChange: (value: string) => void;
	errorLabel: string;
	savingsModule: Address;
};

export default function EarnWithdrawAllPanel({
	userSavingsBalance,
	userSavingsInterest,
	existingReferralFees,
	savedAfterRefresh,
	chainName,
	onbehalfToggle,
	onbehalfAddress,
	onbehalfError,
	onOnbehalfToggle,
	onOnbehalfAddressChange,
	errorLabel,
	savingsModule,
}: EarnWithdrawAllPanelProps) {
	return (
		<div className="space-y-4 rounded-xl border border-[#e0d4bd] bg-[#fffaf0] p-5 dark:border-menu-separator dark:bg-card-body-primary">
			<div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
				<span className="text-text-secondary">Earning balance</span>
				<span className="font-semibold tabular-nums text-text-primary">
					{formatCurrency(formatUnits(userSavingsBalance, 18))} ZCHF
				</span>
			</div>
			<div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
				<span className="text-text-secondary">Ready interest</span>
				<span className="font-semibold tabular-nums text-text-primary">
					{formatCurrency(formatUnits(userSavingsInterest, 18))} ZCHF
				</span>
			</div>
			{existingReferralFees > 0n ? (
				<div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
					<span className="text-text-secondary">Existing referral fee</span>
					<span className="font-semibold tabular-nums text-text-primary">
						- {formatCurrency(formatUnits(existingReferralFees, 18))} ZCHF
					</span>
				</div>
			) : null}
			<div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
				<span className="text-text-secondary">Total received in wallet</span>
				<span className="font-semibold tabular-nums text-text-primary">
					{formatCurrency(formatUnits(savedAfterRefresh, 18))} ZCHF
				</span>
			</div>
			<div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
				<span className="text-text-secondary">Resulting earning balance</span>
				<span className="font-semibold tabular-nums text-text-primary">{formatCurrency(formatUnits(0n, 18))} ZCHF</span>
			</div>
			<p className="text-xs text-text-secondary">
				Closes your earning position on {chainName}. The savings module compounds ready interest into your balance before paying out;
				nothing stays earning after this action.
			</p>
			<EarnCustomTargetAddress
				enabled={onbehalfToggle}
				address={onbehalfAddress}
				error={onbehalfError}
				onEnabledChange={onOnbehalfToggle}
				onAddressChange={onOnbehalfAddressChange}
			/>
			<SavingsActionWithdraw
				disabled={savedAfterRefresh === 0n || !!errorLabel}
				savingsModule={savingsModule}
				targetSavingsAmount={0n}
				displayActionAmount={savedAfterRefresh}
				buttonLabel="Withdraw all to wallet"
			/>
		</div>
	);
}
