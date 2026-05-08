import { useMemo } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../redux/redux.store";
import { ChainId } from "@frankencoin/zchf";
import { formatUnits } from "viem";
import { getChain } from "@utils";

export default function useZCHFChainBalances() {
	const status = useSelector((state: RootState) => state.savings.savingsInfo.status);

	return useMemo(() => {
		const entries = Object.keys(status || {})
			.map((id) => Number(id) as ChainId)
			.map((chainId) => {
				const chainName = getChain(chainId).name;
				const balances = Object.values(status?.[chainId] ?? {});
				const balance = balances.reduce((max, item: any) => (item?.savings > max ? item.savings : max), 0n);
				return { chainId, chainName, rawBalance: balance, balance: Number(formatUnits(balance, 18)).toFixed(2) };
			});

		const recommended = entries.sort((a, b) => Number(b.rawBalance - a.rawBalance))[0];
		return {
			chains: entries,
			recommended,
			hasAnyBalance: entries.some((c) => c.rawBalance > 0n),
		};
	}, [status]);
}
