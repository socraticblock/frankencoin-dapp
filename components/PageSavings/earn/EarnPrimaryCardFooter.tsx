import EarnCustomTargetAddress from "./EarnCustomTargetAddress";
import SavingsActionInterest from "../SavingsActionInterest";
import SavingsActionSave from "../SavingsActionSave";
import SavingsActionWithdraw from "../SavingsActionWithdraw";
import SavingsActionSaveOnBehalf from "../SavingsActionSaveOnBehalf";
import type { SupportedChain } from "@frankencoin/zchf";
import type { Address } from "viem";
import type { EarnAction } from "./earnTypes";

export type EarnPrimaryCardFooterProps = {
	lockChainSelector: boolean;
	earnAction: EarnAction;
	chain: SupportedChain;
	onbehalfToggle: boolean;
	onbehalfAddress: string;
	onbehalfError: string;
	onOnbehalfToggle: (v: boolean) => void;
	onOnbehalfAddressChange: (v: string) => void;
	hasActionableFunds: boolean;
	error: string;
	hasMeaningfulWalletZchf: boolean;
	depositAmount: bigint;
	depositTargetAmount: bigint;
	savingsModule: Address;
	legacyTargetAmount: bigint;
	userSavingsBalance: bigint;
	userSavingsInterest: bigint;
	change: bigint;
};

export default function EarnPrimaryCardFooter({
	lockChainSelector,
	earnAction,
	chain,
	onbehalfToggle,
	onbehalfAddress,
	onbehalfError,
	onOnbehalfToggle,
	onOnbehalfAddressChange,
	hasActionableFunds,
	error,
	hasMeaningfulWalletZchf,
	depositAmount,
	depositTargetAmount,
	savingsModule,
	legacyTargetAmount,
	userSavingsBalance,
	userSavingsInterest,
	change,
}: EarnPrimaryCardFooterProps) {
	return (
		<>
			<div className="">
				{!(lockChainSelector && earnAction === "withdraw") ? (
					<EarnCustomTargetAddress
						enabled={onbehalfToggle}
						address={onbehalfAddress}
						error={onbehalfError}
						onEnabledChange={onOnbehalfToggle}
						onAddressChange={onOnbehalfAddressChange}
					/>
				) : null}
			</div>

			<div className="mx-auto my-4 w-full flex-col flex gap-4">
				{!onbehalfToggle && !hasActionableFunds ? (
					<div className="rounded-xl border border-[#e0d4bd] bg-[#fffaf0] p-4 text-sm text-text-secondary dark:border-menu-separator dark:bg-card-body-primary">
						Add ZCHF on {chain.name} to start earning.
					</div>
				) : onbehalfToggle ? (
					<SavingsActionSaveOnBehalf
						disabled={onbehalfError != "" || onbehalfAddress == ""}
						savingsModule={savingsModule}
						amount={legacyTargetAmount}
						onBehalf={onbehalfAddress as Address}
					/>
				) : lockChainSelector && earnAction === "collect" ? null : lockChainSelector && earnAction === "deposit" ? (
					<SavingsActionSave
						disabled={!!error || !hasMeaningfulWalletZchf || depositAmount === 0n}
						savingsModule={savingsModule}
						targetSavingsAmount={depositTargetAmount}
						displayActionAmount={depositAmount}
					/>
				) : lockChainSelector && earnAction === "withdraw" ? null : userSavingsInterest > 0 && legacyTargetAmount == userSavingsBalance ? (
					<SavingsActionInterest
						disabled={!!error}
						savingsModule={savingsModule}
						targetSavingsAmount={userSavingsBalance}
						displayActionAmount={userSavingsInterest}
					/>
				) : legacyTargetAmount > userSavingsBalance ? (
					<SavingsActionSave
						disabled={!!error}
						savingsModule={savingsModule}
						targetSavingsAmount={legacyTargetAmount}
						displayActionAmount={change < 0n ? -change : change}
					/>
				) : (
					<SavingsActionWithdraw
						disabled={userSavingsBalance == 0n || !!error}
						savingsModule={savingsModule}
						targetSavingsAmount={legacyTargetAmount}
						displayActionAmount={change < 0n ? -change : change}
					/>
				)}
			</div>
		</>
	);
}
