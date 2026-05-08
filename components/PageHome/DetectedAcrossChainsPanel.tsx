import AppButtonSecondary from "@components/AppButtonSecondary";
import { formatCurrency, getChain } from "@utils";
import { ChainId } from "@frankencoin/zchf";

export type ChainRow = {
	chainId: ChainId;
	name: string;
	isCurrent: boolean;
	status: "Current" | "Detected" | "No savings detected" | "Not checked" | "Data unavailable";
	walletZchf?: number | null;
	savingsZchf?: number | null;
};

interface Props {
	rows: ChainRow[];
	onSwitch: (chainId: ChainId) => void;
}

export default function DetectedAcrossChainsPanel({ rows, onSwitch }: Props) {
	return (
		<section className="rounded-2xl border border-menu-separator bg-card-body-primary p-6">
			<div className="flex items-start justify-between gap-3">
				<div>
					<h2 className="text-xl font-semibold text-text-primary">Detected across chains</h2>
					<p className="mt-1 text-sm text-text-secondary">
						Known balances are shown when loaded. Unknown chains stay marked as not checked.
					</p>
				</div>
			</div>
			<div className="mt-4 space-y-3">
				{rows.map((row) => (
					<div key={row.chainId} className="rounded-xl border border-menu-separator bg-card-content-secondary px-4 py-3">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div>
								<div className="font-medium text-text-primary">{row.name}</div>
								<div className="text-xs text-text-secondary">
									Status:{" "}
									<span className={row.isCurrent ? "text-text-active font-semibold" : "text-text-secondary font-medium"}>
										{row.status}
									</span>
								</div>
							</div>
							<AppButtonSecondary
								className="h-9 px-4"
								size="small"
								width="w-auto"
								disabled={row.isCurrent}
								onClick={() => onSwitch(row.chainId)}
							>
								{row.isCurrent ? "Current" : `Switch to ${getChain(row.chainId).name}`}
							</AppButtonSecondary>
						</div>
						<div className="mt-3 grid grid-cols-1 gap-2 text-sm text-text-secondary sm:grid-cols-2">
							<div>
								Wallet ZCHF:{" "}
								<span className="font-medium text-text-primary">
									{row.walletZchf === null || row.walletZchf === undefined ? "—" : `${formatCurrency(row.walletZchf, 2, 2)} ZCHF`}
								</span>
							</div>
							<div>
								Savings balance:{" "}
								<span className="font-medium text-text-primary">
									{row.savingsZchf === null || row.savingsZchf === undefined ? "—" : `${formatCurrency(row.savingsZchf, 2, 2)} ZCHF`}
								</span>
							</div>
						</div>
					</div>
				))}
			</div>
		</section>
	);
}
