import { FrankencoinABI, SavingsABI } from "@frankencoin/zchf";
import type { ChainId } from "@frankencoin/zchf";
import { useEffect, useRef, useState } from "react";
import type { Address } from "viem";
import { isAddress } from "viem";
import { readContract } from "wagmi/actions";
import { WAGMI_CONFIG } from "../../../app.config";

export const SAVINGS_DATA_ERROR = "Savings data could not be loaded for this chain.";

type ChainStatusSlice = { rate?: bigint | number | string } | undefined;

export type SavingsAccountRead = {
	userBalance: bigint;
	userSavingsBalance: bigint;
	userSavingsTicks: bigint;
	userSavingsInterest: bigint;
	userSavingsLocktime: bigint;
	userSavingsReferrer: Address;
	userSavingsReferralFeePPM: bigint;
	userSavingsReferralFees: bigint;
	currentTicks: bigint;
};

export function useSavingsAccountSnapshot(params: {
	account: Address;
	chainId: ChainId;
	frankencoinAddress: Address;
	savingsAdresse: Address;
	chainStatus: ChainStatusSlice;
	refreshBlock: bigint | undefined;
	onInitialSavingsBalance?: (balance: bigint) => void;
}): {
	data: SavingsAccountRead | null;
	isLoaded: boolean;
	error: string;
	hasSavingsDataError: boolean;
} {
	const { account, chainId, frankencoinAddress, savingsAdresse, chainStatus, refreshBlock, onInitialSavingsBalance } =
		params;

	const initRef = useRef(onInitialSavingsBalance);
	initRef.current = onInitialSavingsBalance;
	const shouldInitializeRef = useRef(true);

	const [isLoaded, setLoaded] = useState<boolean>(false);
	const [error, setError] = useState("");
	const [data, setData] = useState<SavingsAccountRead | null>(null);

	useEffect(() => {
		setLoaded(false);
		setError("");
		setData(null);
		shouldInitializeRef.current = true;
	}, [account, chainId]);

	useEffect(() => {
		if (!isAddress(account)) return;
		if (!chainStatus) return;

		let active = true;

		const fetchAsync = async function () {
			try {
				const [_balance, [_userSavings, _userTicks, _referrer, _referralFeePPM], _current] = await Promise.all([
					readContract(WAGMI_CONFIG, {
						address: frankencoinAddress,
						chainId: chainId,
						abi: FrankencoinABI,
						functionName: "balanceOf",
						args: [account],
					}),
					readContract(WAGMI_CONFIG, {
						address: savingsAdresse,
						chainId: chainId,
						abi: SavingsABI,
						functionName: "savings",
						args: [account],
					}),
					readContract(WAGMI_CONFIG, {
						address: savingsAdresse,
						chainId: chainId,
						abi: SavingsABI,
						functionName: "currentTicks",
					}),
				]);

				const safeRate = BigInt(chainStatus.rate || 0);
				const _locktime = safeRate > 0n && _userTicks >= _current ? (_userTicks - _current) / safeRate : 0n;
				const _tickDiff = _current - _userTicks;
				const _interest =
					_userTicks == 0n || _locktime > 0
						? 0n
						: (_tickDiff * _userSavings) / (1_000_000n * 365n * 24n * 60n * 60n);
				const _fee = (_interest * BigInt(_referralFeePPM)) / 1_000_000n;

				if (!active) return;
				setData({
					userBalance: _balance,
					userSavingsBalance: _userSavings,
					userSavingsTicks: _userTicks,
					userSavingsInterest: _interest,
					userSavingsLocktime: _locktime,
					userSavingsReferrer: _referrer,
					userSavingsReferralFeePPM: BigInt(_referralFeePPM),
					userSavingsReferralFees: _fee,
					currentTicks: _current,
				});
				if (shouldInitializeRef.current) {
					initRef.current?.(_userSavings);
					shouldInitializeRef.current = false;
				}
				setLoaded(true);
			} catch {
				if (!active) return;
				setError(SAVINGS_DATA_ERROR);
				setLoaded(true);
			}
		};

		fetchAsync();
		return () => {
			active = false;
		};
	}, [refreshBlock, account, frankencoinAddress, savingsAdresse, chainStatus, chainId]);

	const hasSavingsDataError = error === SAVINGS_DATA_ERROR;

	return {
		data,
		isLoaded,
		error,
		hasSavingsDataError,
	};
}
