import Head from "next/head";
import Link from "next/link";
import BorrowTable from "@components/PageBorrow/BorrowTable";
import { useEffect } from "react";
import { store } from "../../redux/redux.store";
import { fetchPositionsList } from "../../redux/slices/positions.slice";
import AppTitle from "@components/AppTitle";
import AppHeroSteps from "@components/AppHeroSteps";
import AppButtonSecondary from "@components/AppButtonSecondary";
import AppPageHeader from "@components/AppPageHeader";

export default function Borrow() {
	useEffect(() => {
		store.dispatch(fetchPositionsList());
	}, []);

	return (
		<>
			<Head>
				<title>Frankencoin - Borrow</title>
			</Head>

			<AppPageHeader
				title="Borrow ZCHF"
				description="Use approved collateral to mint ZCHF. Review loan-to-value, interest, maturity, and risk before opening a position."
			/>

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

			<div className="mt-8">
				<BorrowTable />
			</div>

			<div className="flex items-center justify-center">
				<Link href={"/mint/create"}>
					<AppButtonSecondary>Propose New Position or Collateral</AppButtonSecondary>
				</Link>
			</div>
		</>
	);
}
