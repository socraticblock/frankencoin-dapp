import { SavingsBalance } from "@frankencoin/api";
import { ChainId } from "@frankencoin/zchf";

export type DeskSavingsEntry = {
	chainId: ChainId;
	balance: bigint;
	interest: bigint;
};

export function getSavingsEntries(source: unknown): DeskSavingsEntry[] {
	if (!source || typeof source !== "object") return [];
	const sections = Object.values(source as Record<string, unknown>);
	const rows: DeskSavingsEntry[] = [];

	for (const section of sections) {
		if (!section || typeof section !== "object") continue;
		const records = Object.values(section as Record<string, unknown>);
		for (const record of records) {
			if (!record || typeof record !== "object") continue;
			const chainIdValue = (record as SavingsBalance).chainId;
			const balanceValue = readBigIntField(record, "balance");
			const interestValue = readBigIntField(record, "interest");
			if (typeof chainIdValue !== "number" || balanceValue === null || interestValue === null) continue;
			rows.push({ chainId: chainIdValue as ChainId, balance: balanceValue, interest: interestValue });
		}
	}
	return rows;
}

function readBigIntField(source: unknown, key: string): bigint | null {
	if (!source || typeof source !== "object") return null;
	const raw = (source as Record<string, unknown>)[key];
	if (typeof raw === "bigint") return raw;
	if (typeof raw === "number" && Number.isFinite(raw)) return BigInt(Math.trunc(raw));
	if (typeof raw === "string" && raw.length > 0) {
		try {
			return BigInt(raw);
		} catch {
			return null;
		}
	}
	return null;
}

