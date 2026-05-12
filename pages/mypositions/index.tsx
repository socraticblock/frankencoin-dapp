import Head from "next/head";
import AppButton from "@components/AppButton";
import AppEmptyState from "@components/AppEmptyState";
import AppLink from "@components/AppLink";
import AppPageHeader from "@components/AppPageHeader";
import MyPositionsBidsTable from "@components/PageMypositions/MyPositionsBidsTable";
import MyPositionsChallengesTable from "@components/PageMypositions/MyPositionsChallengesTable";
import MyPositionsTotalsCard, { usePortfolioOverview } from "@components/PageMypositions/MyPositionsTotalsCard";
import MypositionsTable from "@components/PageMypositions/MypositionsTable";
import ReportsPositionsYearlyTable from "@components/PageReports/ReportsPositionsYearlyTable";
import WalletConnect from "@components/WalletConnect";
import { useContractUrl } from "@hooks";
import { ApiOwnerDebt, ApiOwnerValueLocked } from "@frankencoin/api";
import { normalizeAddress, shortenAddress } from "@utils";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Address, isAddress, zeroAddress } from "viem";
import { useConnection } from "wagmi";
import { FRANKENCOIN_API_CLIENT } from "../../app.config";
import { RootState, store } from "../../redux/redux.store";
import { fetchBidsList } from "../../redux/slices/bids.slice";
import { fetchChallengesList } from "../../redux/slices/challenges.slice";
import { fetchPositionsList } from "../../redux/slices/positions.slice";
import { OwnerPositionDebt, OwnerPositionFees, OwnerPositionValueLocked } from "../report";

export default function Positions() {
	const { address } = useConnection();
	const router = useRouter();
	const paramAddr = router.query.address as string | undefined;
	const hasAddressParam = typeof paramAddr === "string" && paramAddr.length > 0;
	const invalidAddress = Boolean(hasAddressParam && !isAddress(paramAddr));
	const overwrite: Address | undefined = hasAddressParam && isAddress(paramAddr) ? (paramAddr as Address) : undefined;
	const viewedAddress = overwrite ?? address ?? zeroAddress;
	const hasViewedWallet = Boolean(address || overwrite);

	const [isLoading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [ownerPositionFees, setOwnerPositionFees] = useState<OwnerPositionFees[]>([]);
	const [ownerPositionDebt, setOwnerPositionDebt] = useState<OwnerPositionDebt[]>([]);
	const [ownerPositionValueLocked, setOwnerPositionValueLocked] = useState<OwnerPositionValueLocked[]>([]);
	const overview = usePortfolioOverview();
	const positions = useSelector((state: RootState) => state.positions.list.list);
	const challenges = useSelector((state: RootState) => state.challenges.list.list);
	const bids = useSelector((state: RootState) => state.bids.list.list);
	const ownedPositionIds = new Set(
		positions
			.filter((p) => normalizeAddress(p.owner) === normalizeAddress(viewedAddress) && !p.closed && !p.denied)
			.map((p) => normalizeAddress(p.position))
	);
	const matchingChallenges = challenges.filter((c) => c.status === "Active" && ownedPositionIds.has(normalizeAddress(c.position)));
	const matchingBids = bids.filter((b) => normalizeAddress(b.bidder) === normalizeAddress(viewedAddress));
	const hasYearlyData = ownerPositionFees.length > 0 || ownerPositionDebt.length > 0 || ownerPositionValueLocked.length > 0;
	const hasAdvancedActivity = matchingChallenges.length > 0 || matchingBids.length > 0;

	useEffect(() => {
		store.dispatch(fetchPositionsList());
		store.dispatch(fetchChallengesList());
		store.dispatch(fetchBidsList());
	}, []);

	useEffect(() => {
		if (!hasViewedWallet) {
			setOwnerPositionFees([]);
			setOwnerPositionDebt([]);
			setOwnerPositionValueLocked([]);
			setError("");
			return;
		}

		setLoading(true);
		const fetcher = async () => {
			try {
				const responsePositionsFees = await FRANKENCOIN_API_CLIENT.get(`/positions/owner/${viewedAddress}/fees`);
				setOwnerPositionFees((responsePositionsFees.data as { t: number; f: string }[]).map((i) => ({ t: i.t, f: BigInt(i.f) })));

				const responsePositionsDebt = await FRANKENCOIN_API_CLIENT.get(`/positions/owner/${viewedAddress}/debt`);
				const debt = responsePositionsDebt.data as ApiOwnerDebt;
				setOwnerPositionDebt(Object.keys(debt).map((y) => ({ y: Number(y), d: BigInt(debt[Number(y)]) })));

				const responsePositionsValueLocked = await FRANKENCOIN_API_CLIENT.get(`/prices/owner/${viewedAddress}/valueLocked`);
				const value = responsePositionsValueLocked.data as ApiOwnerValueLocked;
				setOwnerPositionValueLocked(Object.keys(value).map((y) => ({ y: Number(y), v: BigInt(value[Number(y)]) })));
				setError("");
			} catch (error) {
				setError(typeof error === "string" ? error : "Something did not work correctly");
			} finally {
				setLoading(false);
			}
		};

		fetcher();
	}, [hasViewedWallet, viewedAddress]);

	return (
		<>
			<Head>
				<title>Frankencoin - My Positions</title>
			</Head>

			<AppPageHeader title="Portfolio" description="Manage your borrowing positions, repayment, maturity, and challenge risk.">
				<p className="text-sm text-text-secondary">Open new positions from Borrow. Manage existing positions here.</p>
			</AppPageHeader>

			{invalidAddress ? (
				<AppEmptyState
					title="Enter a valid wallet address."
					description="The public portfolio address in the URL could not be read."
				/>
			) : !hasViewedWallet ? (
				<NoWalletState />
			) : (
				<>
					<PublicPortfolioBanner overwrite={overwrite} />
					<MyPositionsTotalsCard />
					{overview.challengedCount > 0 ? <PortfolioAttentionAlert /> : null}

					<section id="borrowing-positions" className="space-y-3">
						<div>
							<h2 className="text-xl font-semibold text-text-primary">Borrowing positions</h2>
							<p className="mt-1 text-sm text-text-secondary">Manage collateral, repayment, maturity, and challenge risk.</p>
						</div>
						<MypositionsTable />
					</section>

					<section className="space-y-3">
						<div className="flex flex-wrap items-start justify-between gap-3">
							<div>
								<h2 className="text-xl font-semibold text-text-primary">Yearly summary</h2>
								<p className="mt-1 text-sm text-text-secondary">
									Review year-end position balances and interest paid for reporting.
								</p>
							</div>
							<AppLink className="text-sm" label="Open report page" href={`/report?address=${viewedAddress}`} />
						</div>
						{error ? (
							<AppEmptyState title="Yearly summary unavailable." description={error} />
						) : !hasYearlyData && !isLoading ? (
							<AppEmptyState
								title="No yearly position summaries found yet."
								description="Year-end balances and interest paid will appear here once available."
							/>
						) : (
							<ReportsPositionsYearlyTable
								address={viewedAddress}
								ownerPositionFees={ownerPositionFees}
								ownerPositionDebt={ownerPositionDebt}
								ownerPositionValueLocked={ownerPositionValueLocked}
							/>
						)}
					</section>

					<section className="space-y-3">
						{!hasAdvancedActivity ? (
							<AppEmptyState title="Advanced activity" description="No active challenges or bids for this wallet." />
						) : (
							<>
								<div>
									<h2 className="text-xl font-semibold text-text-primary">Active challenges</h2>
									<p className="mt-1 text-sm text-text-secondary">
										Challenges are market-based checks on borrowing positions. Review them before the challenge period
										ends.
									</p>
								</div>
								{matchingChallenges.length === 0 ? (
									<AppEmptyState
										title="No active challenges for this wallet."
										description="Challenge activity will appear here when available."
									/>
								) : (
									<MyPositionsChallengesTable challengesOverride={matchingChallenges} />
								)}

								<div>
									<h2 className="text-xl font-semibold text-text-primary">Challenge bids</h2>
									<p className="mt-1 text-sm text-text-secondary">Track bids placed in active or past challenges.</p>
								</div>
								{matchingBids.length === 0 ? (
									<AppEmptyState
										title="No challenge bids found for this wallet."
										description="Auction bids will appear here when available."
									/>
								) : (
									<MyPositionsBidsTable />
								)}
							</>
						)}
					</section>
				</>
			)}
		</>
	);
}

function PortfolioAttentionAlert() {
	return (
		<section className="rounded-xl border border-amber-300 bg-[#fff8ea] p-4 text-text-primary shadow-sm dark:border-amber-800 dark:bg-amber-950/20">
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div>
					<h2 className="font-semibold">Position needs attention</h2>
					<p className="mt-1 text-sm text-text-secondary">
						One or more borrowing positions are currently challenged. Review the position before the challenge period ends.
					</p>
				</div>
				<AppButton to="#borrowing-positions" size="small" width="w-auto" className="min-h-[40px] px-4">
					Review challenged positions
				</AppButton>
			</div>
		</section>
	);
}

function NoWalletState() {
	return (
		<section className="rounded-xl border border-[#e0d4bd] bg-card-content-secondary p-5 dark:border-menu-separator">
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div>
					<h2 className="text-lg font-semibold text-text-primary">Connect your wallet to view your portfolio.</h2>
					<p className="mt-1 text-sm text-text-secondary">
						You will see borrowing positions, repayment information, maturity dates, and challenge status here.
					</p>
				</div>
				<WalletConnect />
			</div>
		</section>
	);
}

function PublicPortfolioBanner({ overwrite }: { overwrite?: Address }) {
	const link = useContractUrl(overwrite ?? zeroAddress);
	if (overwrite == undefined) return null;

	return (
		<section className="rounded-xl border border-[#e0d4bd] bg-card-content-secondary p-4 dark:border-menu-separator">
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div>
					<div className="font-semibold text-text-primary">
						Viewing public portfolio for{" "}
						{<AppLink className="" label={shortenAddress(overwrite)} href={link} external={true} />}
					</div>
					<p className="mt-1 text-sm text-text-secondary">Read-only view. Transactions still use your connected wallet.</p>
				</div>
				<AppButton to="/mypositions" size="small" width="w-auto" className="min-h-[40px] px-4">
					Use connected wallet
				</AppButton>
			</div>
		</section>
	);
}
