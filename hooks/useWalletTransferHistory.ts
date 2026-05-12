import { TransferReferenceQuery } from "@frankencoin/api";
import { useEffect, useState } from "react";
import { FRANKENCOIN_API_CLIENT } from "../app.config";

function normalizeTransferList(response: unknown): TransferReferenceQuery[] {
	if (Array.isArray(response)) return response as TransferReferenceQuery[];
	if (response && typeof response === "object" && "list" in response && Array.isArray((response as { list?: unknown }).list)) {
		return (response as { list: TransferReferenceQuery[] }).list;
	}
	return [];
}

/**
 * Merges sent + received transfer-reference rows for a wallet (deduped).
 */
export function useWalletTransferHistory(address: string | undefined, start: Date, end: Date | "Today"): {
	walletHistory: TransferReferenceQuery[];
	isLoading: boolean;
} {
	const [walletHistory, setWalletHistory] = useState<TransferReferenceQuery[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		if (!address) {
			setWalletHistory([]);
			return;
		}

		let cancelled = false;

		const fetcher = async () => {
			const params: Record<string, string | number> = {};
			if (typeof end !== "string") params.end = end.toISOString();
			params.start = start.toISOString();

			try {
				setIsLoading(true);
				const [sent, received] = await Promise.all([
					FRANKENCOIN_API_CLIENT.get<TransferReferenceQuery[]>(`/transfer/reference/history/by/from/${address}`, { params }),
					FRANKENCOIN_API_CLIENT.get<TransferReferenceQuery[]>(`/transfer/reference/history/by/to/${address}`, { params }),
				]);
				if (cancelled) return;

				const merged = [...normalizeTransferList(sent.data), ...normalizeTransferList(received.data)];
				const uniqueById = new Map<string, TransferReferenceQuery>();
				for (const item of merged) {
					uniqueById.set(`${item.chainId}-${item.count}-${item.txHash}`, item);
				}
				setWalletHistory(Array.from(uniqueById.values()));
			} catch {
				if (!cancelled) setWalletHistory([]);
			} finally {
				if (!cancelled) setIsLoading(false);
			}
		};

		void fetcher();
		return () => {
			cancelled = true;
		};
	}, [address, end, start]);

	return { walletHistory, isLoading };
}
