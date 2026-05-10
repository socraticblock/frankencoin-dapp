import { useEffect, useMemo, useState } from "react";
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

export function useEarnCustomTargetState(params: {
	resetKey: string;
}): {
	customTargetState: EarnCustomTargetState;
	customTargetActions: EarnCustomTargetActions;
} {
	const { resetKey } = params;

	const [onbehalfToggle, setOnbehalfToggle] = useState(false);
	const [onbehalfAddress, setOnbehalfAddress] = useState("");
	const [onbehalfError, setOnbehalfError] = useState("");
	// Builder referral fee disabled for ZCHF Desk launch.
	// Existing on-chain referrer data is still read from savings(account), but this app does not set a new referrer.
	const newReferrer = useMemo<Address | undefined>(() => undefined, []);
	const newReferralFeePPM = 0n;

	useEffect(() => {
		setOnbehalfToggle(false);
		setOnbehalfAddress("");
		setOnbehalfError("");
	}, [resetKey]);

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
