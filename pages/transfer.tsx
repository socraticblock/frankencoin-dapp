import Head from "next/head";
import AppLink from "@components/AppLink";
import AppPageHeader from "@components/AppPageHeader";
import TransferInteractionCard from "@components/PageTransfer/TransferInteractionCard";
import TransferListTable from "@components/PageTransfer/TransferListTable";
import AppCard from "@components/AppCard";

export default function TransferPage() {
	return (
		<>
			<Head>
				<title>Frankencoin - Transfer & Bridge</title>
			</Head>

			<AppPageHeader
				title="Transfer & Bridge"
				description="Send ZCHF to another wallet or move ZCHF between supported chains."
			>
				<p className="text-sm text-text-secondary">
					Transfers happen on one chain. Bridges move ZCHF from one chain to another using CCIP and may take longer to arrive.
				</p>
				<p className="mt-1 text-sm text-text-secondary">
					Track bridge delivery in{" "}
					<AppLink label="CCIP Explorer" href="https://ccip.chain.link" external={true} className="" />.
				</p>
			</AppPageHeader>

			<div className="md:mt-8">
				<TransferInteractionCard />
			</div>

			<section className="mt-8">
				<AppCard>
					<div className="px-2 py-1">
						<h2 className="text-lg font-semibold text-text-primary">Your transfer history</h2>
						<p className="mt-1 text-sm text-text-secondary">Filter by date, type, chain, and direction.</p>
					</div>
				</AppCard>
				<div className="mt-4">
					<TransferListTable />
				</div>
			</section>
		</>
	);
}
