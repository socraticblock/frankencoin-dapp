import Head from "next/head";
import MypositionsTable from "@components/PageMypositions/MypositionsTable";
import MyPositionsChallengesTable from "@components/PageMypositions/MyPositionsChallengesTable";
import MyPositionsBidsTable from "@components/PageMypositions/MyPositionsBidsTable";
import { useRouter } from "next/router";
import { Address, isAddress, zeroAddress } from "viem";
import { shortenAddress } from "@utils";
import { useEffect, useState } from "react";
import { store } from "../../redux/redux.store";
import { fetchPositionsList } from "../../redux/slices/positions.slice";
import { fetchChallengesList } from "../../redux/slices/challenges.slice";
import { fetchBidsList } from "../../redux/slices/bids.slice";
import AppTitle from "@components/AppTitle";
import AppLink from "@components/AppLink";
import { useContractUrl } from "@hooks";
import { useConnection } from "wagmi";
import ReportsPositionsYearlyTable from "@components/PageReports/ReportsPositionsYearlyTable";
import { OwnerPositionDebt, OwnerPositionFees, OwnerPositionValueLocked } from "../report";
import { FRANKENCOIN_API_CLIENT } from "../../app.config";
import { ApiOwnerDebt, ApiOwnerValueLocked } from "@frankencoin/api";
import AppPageHeader from "@components/AppPageHeader";
import AppEmptyState from "@components/AppEmptyState";
import MyPositionsTotalsCard from "@components/PageMypositions/MyPositionsTotalsCard";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/redux.store";

export default function Positions() {
	const { address } = useConnection();
	const router = useRouter();
	const paramAddr = router.query.address as Address;
	const overwrite: Address | undefined = isAddress(paramAddr) ? paramAddr : undefined;

	const [isLoading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string>("");

	const [ownerPositionFees, setOwnerPositionFees] = useState<OwnerPositionFees[]>([]);
	const [ownerPositionDebt, setOwnerPositionDebt] = useState<OwnerPositionDebt[]>([]);
	const [ownerPositionValueLocked, setOwnerPositionValueLocked] = useState<OwnerPositionValueLocked[]>([]);
	const challenges = useSelector((state: RootState) => state.challenges.list.list);
	const bids = useSelector((state: RootState) => state.bids.list.list);

	useEffect(() => {
		store.dispatch(fetchPositionsList());
		store.dispatch(fetchChallengesList());
		store.dispatch(fetchBidsList());
	}, []);

	useEffect(() => {
		if (address == undefined && overwrite == undefined) {
			setOwnerPositionFees([]);
			setOwnerPositionDebt([]);
			setError("");
			return;
		}

		setLoading(true);
		const fetcher = async () => {
			try {
				const responsePositionsFees = await FRANKENCOIN_API_CLIENT.get(`/positions/owner/${overwrite || address}/fees`);
				setOwnerPositionFees((responsePositionsFees.data as { t: number; f: string }[]).map((i) => ({ t: i.t, f: BigInt(i.f) })));

				const responsePositionsDebt = await FRANKENCOIN_API_CLIENT.get(`/positions/owner/${overwrite || address}/debt`);
				const debt = responsePositionsDebt.data as ApiOwnerDebt;

				const yearly: OwnerPositionDebt[] = Object.keys(debt).map((y) => ({
					y: Number(y),
					d: BigInt(debt[Number(y)]),
				}));

				setOwnerPositionDebt(yearly);

				const responsePositionsValueLocked = await FRANKENCOIN_API_CLIENT.get(`/prices/owner/${overwrite || address}/valueLocked`);
				const value = responsePositionsValueLocked.data as ApiOwnerValueLocked;

				const yearlyValue: OwnerPositionValueLocked[] = Object.keys(value).map((y) => ({
					y: Number(y),
					v: BigInt(value[Number(y)]),
				}));

				setOwnerPositionValueLocked(yearlyValue);

				// clear all errors
				setError("");
			} catch (error) {
				if (typeof error == "string") {
					setError(error);
				} else {
					setError("Something did not work correctly");
				}
			}
		};

		fetcher();
		setLoading(false);
	}, [address, overwrite]);

	return (
		<>
			<Head>
				<title>Frankencoin - My Positions</title>
			</Head>

			<AppPageHeader
				title="Portfolio"
				description="Your command center for borrowing positions, yearly summaries, and advanced activity."
			/>
			<MyPositionsTotalsCard />

			{/* Section Positions */}
			<AppTitle title="Borrowing Positions">
				<DisplayWarningMessage overwrite={overwrite} />
			</AppTitle>

			<MypositionsTable />

			{/* Section Report */}
			<AppTitle title="Yearly Accounts">
				<DisplayWarningMessage overwrite={overwrite} />
				<div className="text-text-secondary">
					Open positions at the end of each year as well as interest paid. See also the
					<AppLink className="" label={" report page"} href={`/report?address=${overwrite ?? address ?? zeroAddress}`} />.
				</div>
			</AppTitle>

			<ReportsPositionsYearlyTable
				address={overwrite ?? address ?? zeroAddress}
				ownerPositionFees={ownerPositionFees}
				ownerPositionDebt={ownerPositionDebt}
				ownerPositionValueLocked={ownerPositionValueLocked}
			/>

			{/* Section Challenges */}
			<AppTitle title="Advanced activity: Challenges">
				<DisplayWarningMessage overwrite={overwrite} />
			</AppTitle>
			{challenges.length === 0 ? (
				<AppEmptyState
					title="No initiated challenges."
					description="Challenges appear here when you participate in protocol defense."
				/>
			) : (
				<MyPositionsChallengesTable />
			)}

			{/* Section Bids */}
			<AppTitle title="Advanced activity: Bids">
				<DisplayWarningMessage overwrite={overwrite} />
			</AppTitle>
			{bids.length === 0 ? (
				<AppEmptyState title="No bids found." description="Bids appear here when you participate in auctions or challenge resolution." />
			) : (
				<MyPositionsBidsTable />
			)}
		</>
	);
}

function DisplayWarningMessage(props: { overwrite: Address | undefined }) {
	const link = useContractUrl(props.overwrite ?? zeroAddress);
	if (props.overwrite == undefined) return;

	return (
		<div>
			<div className="font-bold text-sm">
				Public View for: {<AppLink className="" label={shortenAddress(props.overwrite)} href={link} external={true} />}
			</div>
		</div>
	);
}
