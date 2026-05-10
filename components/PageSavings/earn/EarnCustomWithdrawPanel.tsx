import TokenInputChain from "@components/Input/TokenInputChain";
import SavingsActionWithdraw from "../SavingsActionWithdraw";
import EarnCustomTargetAddress from "./EarnCustomTargetAddress";
import type { Address } from "viem";

export type EarnCustomWithdrawPanelProps = {
	chainName: string;
	fromSymbol: string;
	withdrawAmount: bigint;
	onChangeWithdrawAmount: (value: string) => void;
	errorLabel: string;
	hasSavingsDataError: boolean;
	savedAfterRefresh: bigint;
	onChangeChain: (value: string) => void;
	lockChainSelector: boolean;
	onbehalfToggle: boolean;
	onbehalfAddress: string;
	onbehalfError: string;
	onOnbehalfToggle: (enabled: boolean) => void;
	onOnbehalfAddressChange: (value: string) => void;
	partialWithdrawAdjustTarget: bigint | undefined;
	savingsModule: Address;
	newReferrer: Address | undefined;
	newReferralFeePPM: bigint;
};

export default function EarnCustomWithdrawPanel({
	chainName,
	fromSymbol,
	withdrawAmount,
	onChangeWithdrawAmount,
	errorLabel,
	hasSavingsDataError,
	savedAfterRefresh,
	onChangeChain,
	lockChainSelector,
	onbehalfToggle,
	onbehalfAddress,
	onbehalfError,
	onOnbehalfToggle,
	onOnbehalfAddressChange,
	partialWithdrawAdjustTarget,
	savingsModule,
	newReferrer,
	newReferralFeePPM,
}: EarnCustomWithdrawPanelProps) {
	return (
		<div className="space-y-4">
			<TokenInputChain
				label="Amount to receive in wallet"
				chain={chainName}
				symbol={fromSymbol}
				placeholder={fromSymbol + " Amount"}
				value={withdrawAmount.toString()}
				onChange={onChangeWithdrawAmount}
				error={hasSavingsDataError ? "" : errorLabel}
				limit={savedAfterRefresh}
				limitDigit={18}
				limitLabel="Available earning"
				onChangeChain={onChangeChain}
				lockChainSelector={lockChainSelector}
				tokenLogo={"ZCHF"}
				showMinShortcut={false}
				showResetShortcut={false}
				showMaxShortcut={false}
			/>
			<EarnCustomTargetAddress
				enabled={onbehalfToggle}
				address={onbehalfAddress}
				error={onbehalfError}
				onEnabledChange={onOnbehalfToggle}
				onAddressChange={onOnbehalfAddressChange}
			/>
			<SavingsActionWithdraw
				disabled={withdrawAmount === 0n || !!errorLabel || partialWithdrawAdjustTarget === undefined}
				savingsModule={savingsModule}
				balance={partialWithdrawAdjustTarget ?? 0n}
				change={withdrawAmount}
				newReferrer={newReferrer}
				newReferralFeePPM={newReferralFeePPM}
				buttonLabel="Withdraw ZCHF"
			/>
		</div>
	);
}
