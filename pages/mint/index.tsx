import Head from "next/head";
import Link from "next/link";
import BorrowTable from "@components/PageBorrow/BorrowTable";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useConnection } from "wagmi";
import { ChallengesQueryItem } from "@frankencoin/api";
import { store } from "../../redux/redux.store";
import { fetchPositionsList } from "../../redux/slices/positions.slice";
import AppHeroSteps from "@components/AppHeroSteps";
import AppButtonSecondary from "@components/AppButtonSecondary";
import AppPageHeader from "@components/AppPageHeader";
import AppCard from "@components/AppCard";
import AppBox from "@components/AppBox";
import DisplayAmount from "@components/DisplayAmount";
import DisplayOutputAlignedRight from "@components/DisplayOutputAlignedRight";
import DisplayLabel from "@components/DisplayLabel";
import AppNotice from "@components/AppNotice";
import { fetchChallengesList } from "../../redux/slices/challenges.slice";
import { RootState } from "../../redux/redux.store";
import { normalizeAddress } from "@utils";
import { useBorrowingOverview } from "@hooks";
import { ADDRESS } from "@frankencoin/zchf";
import { mainnet } from "viem/chains";

const BORROW_STEPS = [
	{
		icon: 1,
		title: "Choose collateral",
		description: "Select an approved asset to secure your position.",
	},
	{
		icon: 2,
		title: "Review terms",
		description: "Check loan-to-value, interest, maturity, and liquidation conditions.",
	},
	{
		icon: 3,
		title: "Borrow ZCHF",
		description: "Confirm the transaction in your wallet.",
	},
];

export default function Borrow() {
	const { address, isConnected } = useConnection();
	const hasWallet = Boolean(isConnected && address);
	const overview = useBorrowingOverview();
	const positions = useSelector((state: RootState) => state.positions.openPositions);
	const challengesMap = useSelector((state: RootState) => state.challenges.positions.map);
	const hasActiveChallenge = (challenges: ChallengesQueryItem[]) => challenges.some((challenge) => challenge.status === "Active");

	const challengedPosition = positions.find((position) => {
		if (!address || normalizeAddress(position.owner) !== normalizeAddress(address)) return false;
		const positionChallenges = (challengesMap[normalizeAddress(position.position)] ?? []) as ChallengesQueryItem[];
		return hasActiveChallenge(positionChallenges);
	});

	const challengeStatus = overview.activePositionCount === 0
		? "No active challenges"
		: overview.isLoading
		  ? "Needs review"
		  : overview.hasActiveChallenge
		    ? "Challenged"
		    : "Healthy";

	useEffect(() => {
		store.dispatch(fetchPositionsList());
		store.dispatch(fetchChallengesList());
	}, []);

	return (
		<>
			<Head>
				<title>Frankencoin - Borrow</title>
			</Head>

			<AppPageHeader
				title="Borrow ZCHF"
				description="Use approved collateral to mint ZCHF. Review loan-to-value, interest, maturity, and challenge risk before opening a position."
			>
				<p className="max-w-3xl text-sm text-text-secondary">
					Frankencoin positions are not liquidated by a central price oracle. Positions can be challenged by market participants if the
					collateral no longer looks sufficient.
				</p>
			</AppPageHeader>

			<AppHeroSteps
				steps={BORROW_STEPS}
			/>

			<section className="mt-6">
				<AppCard>
					<h2 className="text-lg font-semibold text-text-primary">Your borrowing overview</h2>
					{!hasWallet ? (
						<div className="mt-3 rounded-xl border border-dashed border-menu-separator p-4 text-sm text-text-secondary">
							<p className="font-medium text-text-primary">Connect wallet to view borrowing overview</p>
							<p className="mt-2">Connect your wallet to see your borrowed ZCHF, active positions, and challenge status.</p>
						</div>
					) : (
						<>
							<div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
								<AppBox>
									<DisplayLabel label="Total owed" />
									{overview.activePositionCount === 0 ? (
										<DisplayOutputAlignedRight className="mt-1" output="0.00 ZCHF" />
									) : (
										<DisplayAmount
											className="mt-1"
											amount={overview.totalOwed}
											currency="ZCHF"
											address={ADDRESS[mainnet.id].frankencoin}
											hideLogo
										/>
									)}
								</AppBox>
								<AppBox>
									<DisplayLabel label="Active positions" />
									<DisplayOutputAlignedRight
										className="mt-1"
										output={overview.activePositionCount === 0 ? "None" : String(overview.activePositionCount)}
									/>
								</AppBox>
								<AppBox>
									<DisplayLabel label="Challenge status" />
									<DisplayOutputAlignedRight className="mt-1" output={challengeStatus} />
								</AppBox>
							</div>
							<div className="mt-4 flex justify-center md:justify-start">
								<Link href="/mypositions">
									<AppButtonSecondary>Manage borrowing positions</AppButtonSecondary>
								</Link>
							</div>
						</>
					)}
				</AppCard>
			</section>

			{challengedPosition ? (
				<section className="mt-4">
					<AppNotice
						variant="warning"
						title="Position challenged"
						message="One of your borrowing positions is currently challenged. Review it before the challenge period ends."
					>
						<div className="mt-3 flex flex-wrap gap-2">
							<Link href="/mypositions">
								<AppButtonSecondary>Open Portfolio</AppButtonSecondary>
							</Link>
							<Link href={`/mypositions/${challengedPosition.position}`}>
								<AppButtonSecondary>View challenged position</AppButtonSecondary>
							</Link>
						</div>
					</AppNotice>
				</section>
			) : null}

			<div className="mt-8">
				<BorrowTable inMyWalletLabel="Only assets in connected wallet" />
			</div>

			<section className="mt-8">
				<AppCard>
					<h2 className="text-base font-semibold text-text-primary">Advanced protocol tools</h2>
					<p className="mt-1 text-sm text-text-secondary">
						Experienced users can propose new collateral or custom position terms.
					</p>
					<div className="mt-4 flex items-center justify-center md:justify-start">
						<Link href={"/mint/create"}>
							<AppButtonSecondary>Propose new collateral or terms</AppButtonSecondary>
						</Link>
					</div>
				</AppCard>
			</section>
		</>
	);
}
