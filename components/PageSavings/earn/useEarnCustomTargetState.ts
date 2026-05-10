import { useEffect, useState } from "react";
import type { Address } from "viem";
import { isAddress } from "viem";

export type EarnCustomTargetState = {
	newReferrer: Address | undefined;
	newReferralFeePPM: bigint;
	onbehalfToggle: boolean;
	onbehalfAddress: string;
	onbehalfError: string;
};

export type EarnCustomTargetActions = {
	setOnbehalfToggle: (enabled: boolean) => void;
	setOnbehalfAddress: (value: string) => void;
};

function parseReferralFeePPM(value: string | string[] | undefined): bigint {
	if (typeof value !== "string" || value.length === 0) return 0n;
	try {
		const parsed = BigInt(value);
		return parsed > 0n ? parsed : 0n;
	} catch {
		return 0n;
	}
}

export function useEarnCustomTargetState(params: {
	queryReferrer: string | string[] | undefined;
	queryReferralFeePPM: string | string[] | undefined;
	resetKey: string;
}): {
	customTargetState: EarnCustomTargetState;
	customTargetActions: EarnCustomTargetActions;
} {
	const { queryReferrer, queryReferralFeePPM, resetKey } = params;

	const [newReferrer, setNewReferrer] = useState<Address | undefined>(undefined);
	const [newReferralFeePPM, setNewReferralFeePPM] = useState(0n);
	const [onbehalfToggle, setOnbehalfToggle] = useState(false);
	const [onbehalfAddress, setOnbehalfAddress] = useState("");
	const [onbehalfError, setOnbehalfError] = useState("");

	useEffect(() => {
		setNewReferrer(undefined);
		setNewReferralFeePPM(0n);
		setOnbehalfToggle(false);
		setOnbehalfAddress("");
		setOnbehalfError("");
	}, [resetKey]);

	useEffect(() => {
		if (typeof queryReferrer === "string" && queryReferrer.length !== 0 && isAddress(queryReferrer)) {
			setNewReferrer(queryReferrer);
		}
		setNewReferralFeePPM(parseReferralFeePPM(queryReferralFeePPM));
	}, [queryReferrer, queryReferralFeePPM]);

	useEffect(() => {
		if (isAddress(onbehalfAddress) || onbehalfAddress == "") {
			setOnbehalfError("");
		} else {
			setOnbehalfError("Address is not valid.");
		}
	}, [onbehalfAddress]);

	return {
		customTargetState: {
			newReferrer,
			newReferralFeePPM,
			onbehalfToggle,
			onbehalfAddress,
			onbehalfError,
		},
		customTargetActions: {
			setOnbehalfToggle,
			setOnbehalfAddress,
		},
	};
}
