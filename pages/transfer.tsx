import Head from "next/head";
import AppPageHeader from "@components/AppPageHeader";
import TransferInteractionCard from "@components/PageTransfer/TransferInteractionCard";
import TransferListTable from "@components/PageTransfer/TransferListTable";
import AppCard from "@components/AppCard";

export default function TransferPage() {
	return (
		<>
			<Head>
				<title>Transfer ZCHF | ZCHF Desk</title>
			</Head>

			<AppPageHeader
				eyebrow="TRANSFER"
				title="Transfer ZCHF"
				description="Send ZCHF to another wallet on the same chain."
			>
				<p className="text-sm text-text-secondary">
					Transfer does not bridge or swap. It sends existing ZCHF on the selected chain to another wallet.
				</p>
			</AppPageHeader>

			<div className="md:mt-8">
				<TransferInteractionCard initialMode="transfer" lockedMode="transfer" />
			</div>

			<section className="mt-8">
				<AppCard>
					<div className="px-2 py-1">
						<h2 className="text-lg font-semibold text-text-primary">Your ZCHF movement history</h2>
						<p className="mt-1 text-sm text-text-secondary">Review submitted ZCHF transfers and bridge movements.</p>
					</div>
				</AppCard>
				<div className="mt-4">
					<TransferListTable />
				</div>
			</section>
		</>
	);
}
