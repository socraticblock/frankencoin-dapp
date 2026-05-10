import type { SavingsOutcomeFlowIntent } from "./earnTypes";

export type EarnPreviewRow = {
	label: string;
	value: bigint;
};

export type EarnPreviewRowParams = {
	flowIntent: SavingsOutcomeFlowIntent;
	actionAmount: bigint;
	interest: bigint;
	referralFees: bigint;
	interestAlsoCollected: bigint;
	totalReceived?: bigint;
	withdrawAllPreview?: { principal: bigint; totalReceived: bigint } | null;
};

/** Same row logic as legacy `getEarnTransactionPreviewRows` in SavingsDetailsCard. */
export function getEarnPreviewRows(params: EarnPreviewRowParams): EarnPreviewRow[] {
	const { flowIntent, actionAmount, interest, referralFees, interestAlsoCollected, totalReceived, withdrawAllPreview } = params;
	const netInterest = interest - referralFees;
	const interestRows =
		referralFees > 0n
			? [
					{ label: "Ready interest", value: interest },
					{ label: "Existing referral fee", value: -referralFees },
					{ label: "Net interest added to earning", value: netInterest },
			  ]
			: interest > 0n
				? [{ label: "Ready interest added to earning", value: interest }]
				: [];

	if (flowIntent === "collect" || flowIntent === "collect_wallet") {
		if (referralFees > 0n) {
			return [
				{ label: "Ready interest", value: interest },
				{ label: "Existing referral fee", value: -referralFees },
				{ label: "Received in wallet", value: netInterest },
			];
		}
		return [{ label: "Interest to collect", value: interest }];
	}
	if (flowIntent === "compound") {
		return referralFees > 0n ? interestRows : [{ label: "Interest to compound", value: interest }];
	}
	if (flowIntent === "deposit") {
		return [...interestRows, { label: "Amount to deposit", value: actionAmount }];
	}
	if (flowIntent === "withdraw_partial") {
		if (actionAmount === 0n) {
			return [{ label: "Ready interest", value: interest }];
		}
		return [...interestRows, { label: "Amount received in wallet", value: actionAmount }];
	}
	if (flowIntent === "withdraw_all") {
		if (withdrawAllPreview) {
			const rows = [
				{ label: "Earning balance", value: withdrawAllPreview.principal },
				{ label: "Ready interest", value: interest },
			];
			if (referralFees > 0n) rows.push({ label: "Existing referral fee", value: -referralFees });
			rows.push({ label: "Total received in wallet", value: withdrawAllPreview.totalReceived });
			return rows;
		}
		return [];
	}
	const rows: EarnPreviewRow[] = [{ label: "Amount to withdraw", value: actionAmount }];
	if (interestAlsoCollected > 0n) {
		rows.push({ label: "Interest also collected", value: interestAlsoCollected });
	}
	if (totalReceived != undefined) {
		rows.push({ label: "Total received in wallet", value: totalReceived });
	}
	return rows;
}
