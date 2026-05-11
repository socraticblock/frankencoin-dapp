import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import BorrowTable from "@components/PageBorrow/BorrowTable";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useConnection } from "wagmi";
import { Address, isAddress } from "viem";
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

export default function Borrow() {
	const router = useRouter();
	const { address } = useConnection();
	const [inspectAddressInput, setInspectAddressInput] = useState("");
	const queryAddressRaw = typeof router.query.address === "string" ? router.query.address : "";
	const viewedAddress: Address | undefined = useMemo(
		() => (queryAddressRaw && isAddress(queryAddressRaw) ? queryAddressRaw : undefined),
		[queryAddressRaw]
	);
	const showingPublicView = !!viewedAddress && (!address || normalizeAddress(viewedAddress) !== normalizeAddress(address));
	const overview = useBorrowingOverview(viewedAddress);
	const positions = useSelector((state: RootState) => state.positions.openPositions);
	const challengesMap = useSelector((state: RootState) => state.challenges.positions.map);

	const challengedPosition = positions.find((position) => {
		const ownerAddress = viewedAddress ?? address;
		if (!ownerAddress || normalizeAddress(position.owner) !== normalizeAddress(ownerAddress)) return false;
		const positionChallenges = challengesMap[normalizeAddress(position.position)] ?? [];
		return positionChallenges.some((challenge: any) => challenge?.status === "Active");
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

	const addressInputError = inspectAddressInput.length > 0 && !isAddress(inspectAddressInput) ? "Enter a valid wallet address." : "";

	const onClickViewAddress = () => {
		if (!inspectAddressInput || !isAddress(inspectAddressInput)) return;
		router.push({ pathname: "/mint", query: { address: inspectAddressInput } });
	};

	const onClickUseConnectedWallet = () => {
		setInspectAddressInput("");
		router.push("/mint");
	};

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
				steps={[
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
				]}
			/>

			<section className="mt-6">
				<AppCard>
					<h2 className="text-lg font-semibold text-text-primary">Your borrowing overview</h2>
					<div className="mt-3 rounded-lg border border-menu-separator bg-card-content-primary p-3">
						<div className="text-sm font-medium text-text-primary">Inspect wallet</div>
						<div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto]">
							<input
								type="text"
								placeholder="Enter wallet address"
								value={inspectAddressInput}
								onChange={(e) => setInspectAddressInput(e.target.value.trim())}
								className="rounded-lg border border-menu-separator bg-card-body-primary px-3 py-2 text-sm outline-none focus:border-button-default"
							/>
							<AppButtonSecondary disabled={!inspectAddressInput || !!addressInputError} onClick={onClickViewAddress}>
								View
							</AppButtonSecondary>
							<AppButtonSecondary onClick={onClickUseConnectedWallet}>Use connected wallet</AppButtonSecondary>
						</div>
						{addressInputError ? <p className="mt-2 text-sm text-text-warning">{addressInputError}</p> : null}
						{showingPublicView ? (
							<div className="mt-2 text-sm text-text-secondary">
								<p>
									Viewing public borrowing data for{" "}
									<span className="font-medium text-text-primary">
										{viewedAddress?.slice(0, 6)}...{viewedAddress?.slice(-4)}
									</span>
									.
								</p>
								<p>Read-only public view. Transactions still use your connected wallet.</p>
							</div>
						) : null}
					</div>
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
