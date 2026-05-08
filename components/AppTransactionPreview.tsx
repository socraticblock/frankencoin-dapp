interface Props {
	action: string;
	amount?: string;
	network?: string;
	source?: string;
	destination?: string;
	outcome?: string;
}

export default function AppTransactionPreview({ action, amount, network, source, destination, outcome }: Props) {
	return (
		<div className="rounded-xl border border-menu-separator bg-card-content-primary p-4">
			<p className="font-semibold text-text-primary mb-2">Before you sign</p>
			<ul className="text-sm text-text-secondary space-y-1">
				<li>Action: {action}</li>
				{amount ? <li>Amount: {amount}</li> : null}
				{network ? <li>Network: {network}</li> : null}
				{source ? <li>From: {source}</li> : null}
				{destination ? <li>To: {destination}</li> : null}
				{outcome ? <li>After confirmation: {outcome}</li> : null}
			</ul>
		</div>
	);
}
