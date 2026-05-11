import { useMemo } from "react";
import { useSelector } from "react-redux";
import { useConnection } from "wagmi";
import { Address, zeroAddress } from "viem";
import { RootState } from "../redux/redux.store";
import { normalizeAddress } from "@utils";

export type BorrowingOverview = {
	totalMinted: bigint;
	totalReserves: bigint;
	totalOwed: bigint;
	activePositionCount: number;
	challengedPositionCount: number;
	hasActiveChallenge: boolean;
	isLoading?: boolean;
};

export const useBorrowingOverview = (addressOverride?: Address): BorrowingOverview => {
	const positions = useSelector((state: RootState) => state.positions.openPositions);
	const positionsLoaded = useSelector((state: RootState) => state.positions.loaded);
	const challengesMap = useSelector((state: RootState) => state.challenges.positions.map);
	const challengesLoaded = useSelector((state: RootState) => state.challenges.loaded);
	const { address } = useConnection();
	const account = normalizeAddress(addressOverride ?? address ?? zeroAddress);

	return useMemo(() => {
		const matchingPositions = positions.filter((p) => normalizeAddress(p.owner) === account);

		let totalMinted = 0n;
		let totalReserves = 0n;
		let challengedPositionCount = 0;

		for (const position of matchingPositions) {
			const minted = BigInt(position.minted);
			const reserve = BigInt(position.reserveContribution);
			totalMinted += minted;
			totalReserves += (minted * reserve) / 1_000_000n;

			const positionChallenges = challengesMap[normalizeAddress(position.position)] ?? [];
			const hasActive = positionChallenges.some((challenge: any) => challenge?.status === "Active");
			if (hasActive) challengedPositionCount += 1;
		}

		return {
			totalMinted,
			totalReserves,
			totalOwed: totalMinted - totalReserves,
			activePositionCount: matchingPositions.length,
			challengedPositionCount,
			hasActiveChallenge: challengedPositionCount > 0,
			isLoading: !positionsLoaded || !challengesLoaded,
		};
	}, [account, challengesLoaded, challengesMap, positions, positionsLoaded]);
};
