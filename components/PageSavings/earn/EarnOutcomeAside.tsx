import SavingsDetailsCard from "../SavingsDetailsCard";
import EarnTransactionPreview from "./EarnTransactionPreview";
import type { EarnPreviewRow } from "./earnPreview";
import type { SupportedChain } from "@frankencoin/zchf";
import type { Address } from "viem";
import type { SavingsOutcomeFlowIntent } from "./earnTypes";

export type EarnLockedPreviewModel = {
	rows: EarnPreviewRow[];
	resultingBalance: bigint;
	helperText: string | null;
	hideResultingBalance: boolean;
	balance: bigint;
	referrer: Address;
	referralFeePPM: bigint;
	referralFees: bigint;
	locktime: bigint;
};

export type SavingsLegacyPreviewModel = {
	account: Address;
	balance: bigint;
	change: bigint;
	direction: boolean;
	interest: bigint;
	locktime: bigint;
	referrer: Address;
	referralFeePPM: bigint;
	referralFees: bigint;
	flowIntent: SavingsOutcomeFlowIntent | null;
};

export type EarnOutcomeAsideProps = {
	chain: SupportedChain;
	earnPreviewModel?: EarnLockedPreviewModel;
	legacyPreviewModel: SavingsLegacyPreviewModel;
};

export default function EarnOutcomeAside({
	chain,
	earnPreviewModel,
	legacyPreviewModel,
}: EarnOutcomeAsideProps) {
	if (earnPreviewModel) {
		return (
			<EarnTransactionPreview
				rows={earnPreviewModel.rows}
				resultingBalance={earnPreviewModel.resultingBalance}
				helperText={earnPreviewModel.helperText}
				hideResultingBalance={earnPreviewModel.hideResultingBalance}
				balance={earnPreviewModel.balance}
				referrer={earnPreviewModel.referrer}
				referralFeePPM={earnPreviewModel.referralFeePPM}
				referralFees={earnPreviewModel.referralFees}
				locktime={earnPreviewModel.locktime}
				chain={chain}
			/>
		);
	}

	return (
		<SavingsDetailsCard
			account={legacyPreviewModel.account}
			chain={chain}
			balance={legacyPreviewModel.balance}
			change={legacyPreviewModel.change}
			direction={legacyPreviewModel.direction}
			interest={legacyPreviewModel.interest}
			locktime={legacyPreviewModel.locktime}
			referrer={legacyPreviewModel.referrer}
			referralFeePPM={legacyPreviewModel.referralFeePPM}
			referralFees={legacyPreviewModel.referralFees}
			flowIntent={legacyPreviewModel.flowIntent}
		/>
	);
}
