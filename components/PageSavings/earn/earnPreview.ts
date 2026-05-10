import type { SavingsOutcomeFlowIntent } from "./earnTypes";

export type EarnPreviewRow = {
	label: string;
	value: bigint;
};

export type EarnPreviewRowParams = {
	flowIntent: SavingsOutcomeFlowIntent;
	actionAmount: bigint;
	interest: bigint;
	interestAlsoCollected: bigint;
	totalReceived?: bigint;
	withdrawAllPreview?: { principal: bigint; totalReceived: bigint } | null;
};

/** Same row logic as legacy `getEarnTransactionPreviewRows` in SavingsDetailsCard. */
export function getEarnPreviewRows(params: EarnPreviewRowParams): EarnPreviewRow[] {
	const { flowIntent, actionAmount, interest, interestAlsoCollected, totalReceived, withdrawAllPreview } = params;

	if (flowIntent === "collect" || flowIntent === "collect_wallet") {
		return [{ label: "Interest to collect", value: interest }];
	}
	if (flowIntent === "compound") {
		return [{ label: "Interest to compound", value: interest }];
	}
	if (flowIntent === "deposit") {
		return [{ label: "Amount to deposit", value: actionAmount }];
	}
	if (flowIntent === "withdraw_partial") {
		if (actionAmount === 0n) {
			return [{ label: "Ready interest", value: interest }];
		}
		return [
			{ label: "Ready interest added to earning", value: interest },
			{ label: "Amount received in wallet", value: actionAmount },
		];
	}
	if (flowIntent === "withdraw_all") {
		if (withdrawAllPreview) {
			return [
				{ label: "Earning balance", value: withdrawAllPreview.principal },
				{ label: "Ready interest", value: interest },
				{ label: "Total received in wallet", value: withdrawAllPreview.totalReceived },
			];
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
