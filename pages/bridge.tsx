import Head from "next/head";
import AppLink from "@components/AppLink";
import AppPageHeader from "@components/AppPageHeader";
import TransferInteractionCard from "@components/PageTransfer/TransferInteractionCard";
import AppCard from "@components/AppCard";

export default function BridgePage() {
	return (
		<>
			<Head>
				<title>Bridge ZCHF | ZCHF Desk</title>
			</Head>

			<AppPageHeader
				eyebrow="BRIDGE"
				title="Bridge ZCHF"
				description="Move ZCHF you already own from one chain to another."
			>
				<p className="text-sm text-text-secondary">
					Bridge does not buy, sell, or exchange ZCHF. It moves existing ZCHF between supported chains using CCIP and may take longer to arrive.
				</p>
				<p className="mt-1 text-sm text-text-secondary">
					Track bridge delivery in <AppLink label="CCIP Explorer" href="https://ccip.chain.link" external={true} className="" />.
				</p>
			</AppPageHeader>

			<AppCard>
				<div className="px-2 py-1">
					<h2 className="text-lg font-semibold text-text-primary">Bridge flow</h2>
					<p className="mt-1 text-sm leading-6 text-text-secondary">
						Choose <span className="font-semibold text-text-primary">Bridge</span> below, then select the source chain, destination chain, recipient wallet, and amount.
					</p>
				</div>
			</AppCard>

			<div className="md:mt-8">
				<TransferInteractionCard />
			</div>
		</>
	);
}
