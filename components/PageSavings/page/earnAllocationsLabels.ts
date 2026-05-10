import type { EarnChainRow } from "@components/PageSavings/useEarnAllocations";
import { formatCurrency } from "@utils";

export function interestCell(row: EarnChainRow): string {
	if (row.interestStatus === "loading") return "Loading…";
	if (row.interestStatus === "error") return "Unavailable";
	if (row.interestStatus === "no_module") return "—";
	return `${formatCurrency(row.interestZchf ?? 0, 2, 2)} ZCHF`;
}

export function pickerStateLabel(row: EarnChainRow): string {
	const saving = (row.savingsZchf ?? 0) > 0;
	const interest = row.interestStatus === "ready" && (row.interestZchf ?? 0) > 0;
	const wallet = row.walletZchf ?? 0;
	if (saving || interest) return "Already earning";
	if (wallet > 0) return "Ready to start";
	if (row.walletStatus === "loading") return "Loading…";
	if (row.walletStatus === "error") return "Wallet balance unavailable";
	return "No ZCHF in wallet";
}
