import SavingsDetailsCard from "../SavingsDetailsCard";
import EarnTransactionPreview from "./EarnTransactionPreview";
import type { EarnPreviewRow } from "./earnPreview";
import type { SupportedChain } from "@frankencoin/zchf";
import type { Address } from "viem";
import type { SavingsOutcomeFlowIntent } from "./earnTypes";

export type EarnOutcomeAsideProps = {
	showEarnPreview: boolean;
	earnPreviewRows: EarnPreviewRow[];
	previewResultingBalance: bigint | undefined;
	earnPreviewHelperText: string | null;
	hideEarnResultingBalance: boolean;
	userSavingsBalance: bigint;
	earnTargetChange: bigint;
	userSavingsInterest: bigint;
	userSavingsReferrer: Address;
	userSavingsReferralFeePPM: bigint;
	userSavingsReferralFees: bigint;
	userSavingsLocktime: bigint;
	chain: SupportedChain;
	isLoaded: boolean;
	onbehalfToggle: boolean;
	legacyChange: bigint;
	legacyDirection: boolean;
	account: Address;
	previewFlowIntent: SavingsOutcomeFlowIntent | null;
};

export default function EarnOutcomeAside({
	showEarnPreview,
	earnPreviewRows,
	previewResultingBalance,
	earnPreviewHelperText,
	hideEarnResultingBalance,
	userSavingsBalance,
	earnTargetChange,
	userSavingsInterest,
	userSavingsReferrer,
	userSavingsReferralFeePPM,
	userSavingsReferralFees,
	userSavingsLocktime,
	chain,
	isLoaded,
	onbehalfToggle,
	legacyChange,
	legacyDirection,
	account,
	previewFlowIntent,
}: EarnOutcomeAsideProps) {
	if (showEarnPreview) {
		return (
			<EarnTransactionPreview
				rows={earnPreviewRows}
				resultingBalance={previewResultingBalance}
				helperText={earnPreviewHelperText}
				hideResultingBalance={hideEarnResultingBalance}
				balance={userSavingsBalance}
				change={isLoaded && !onbehalfToggle ? earnTargetChange : 0n}
				interest={isLoaded && !onbehalfToggle ? userSavingsInterest : 0n}
				referrer={userSavingsReferrer}
				referralFeePPM={userSavingsReferralFeePPM}
				referralFees={userSavingsReferralFees}
				locktime={userSavingsLocktime}
				chain={chain}
			/>
		);
	}

	return (
		<SavingsDetailsCard
			account={account}
			chain={chain}
			balance={userSavingsBalance}
			change={isLoaded && !onbehalfToggle ? legacyChange : 0n}
			direction={legacyDirection}
			interest={isLoaded && !onbehalfToggle ? userSavingsInterest : 0n}
			locktime={userSavingsLocktime}
			referrer={userSavingsReferrer}
			referralFeePPM={userSavingsReferralFeePPM}
			referralFees={userSavingsReferralFees}
			flowIntent={previewFlowIntent}
		/>
	);
}
