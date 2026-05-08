import React from "react";
import Head from "next/head";
import EquityFPSDetailsCard from "@components/PageEquity/EquityFPSDetailsCard";
import EquityInteractionCard from "@components/PageEquity/EquityInteractionCard";
import AppTitle from "@components/AppTitle";
import { useConnection } from "wagmi";
import { useFPSBalanceHistory, useFPSEarningsHistory } from "@hooks";
import ReportsFPSYearlyTable from "@components/PageReports/ReportsFPSYearlyTable";
import { zeroAddress } from "viem";
import AppLink from "@components/AppLink";
import AppHeroSteps from "@components/AppHeroSteps";
import { ContractUrl } from "@utils";
import { ADDRESS } from "@frankencoin/zchf";
import { mainnet } from "viem/chains";
import AppNotice from "@components/AppNotice";
import AppPageHeader from "@components/AppPageHeader";
import AppButtonSecondary from "@components/AppButtonSecondary";
import AppTransactionPreview from "@components/AppTransactionPreview";
import { useAppKitNetwork } from "@reown/appkit/react";
import { useChainId } from "wagmi";

export default function Equity() {
	const { address } = useConnection();
	const chainId = useChainId();
	const appKitNetwork = useAppKitNetwork();
	const fpsHistory = useFPSBalanceHistory(address || zeroAddress);
	const fpsEarnings = useFPSEarningsHistory(address || zeroAddress);

	return (
		<>
			<Head>
				<title>Frankencoin - Invest</title>
			</Head>

			<AppPageHeader
				title="Invest in Frankencoin Pool Shares"
				description="FPS represents participation in the Frankencoin reserve pool and governance. FPS transactions happen on Ethereum mainnet."
			>
				<AppNotice
					variant="warning"
					title="FPS is available on Ethereum mainnet only."
					message="To buy or redeem Frankencoin Pool Shares, switch your wallet to Ethereum."
				>
					<div className="mt-3 max-w-xs">
						<AppButtonSecondary onClick={() => appKitNetwork.switchNetwork(mainnet)}>Switch to Ethereum</AppButtonSecondary>
					</div>
				</AppNotice>
				{chainId !== mainnet.id ? (
					<p className="text-sm text-text-secondary">Current network is not Ethereum mainnet. FPS interactions require Ethereum.</p>
				) : null}
			</AppPageHeader>

			<AppHeroSteps
				steps={[
					{
						icon: 1,
						title: "Get Pool Shares",
						description: "Add ZCHF to the Frankencoin reserve pool and get newly minted pool shares in return.",
					},
					{
						icon: 2,
						title: "Participate",
						description: "FPS's fundamental value climbs (or falls) with Frankencoin's success (or decline).",
					},
					{
						icon: 3,
						title: "Govern",
						description: "Team up with others to veto protocol extensions or collaterals you don't like.",
					},
				]}
			/>

			<div className="md:mt-8">
				<section className="grid grid-cols-1 md:grid-cols-2 gap-4 mx-auto">
					<EquityInteractionCard />
					<EquityFPSDetailsCard />
				</section>
			</div>
			<AppTransactionPreview
				action="Buy or redeem FPS"
				network="Ethereum mainnet"
				source="Your wallet"
				destination="Frankencoin Pool Shares module"
				outcome="Your FPS balance and attributable income view update after confirmation."
			/>

			<AppTitle title="Attributable Income">
				<div className="text-text-secondary">
					Historic system income <AppLink className="text-left" label={"attributable to the current address"} href={`/report`} />.
				</div>
			</AppTitle>
			<ReportsFPSYearlyTable address={address || zeroAddress} fpsHistory={fpsHistory} fpsEarnings={fpsEarnings} />
		</>
	);
}
