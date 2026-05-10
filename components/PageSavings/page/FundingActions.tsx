import AppButtonSecondary from "@components/AppButtonSecondary";

export type FundingActionsProps = {
	statusLine: string;
	openTransferHref: string;
};

export default function FundingActions({ statusLine, openTransferHref }: FundingActionsProps) {
	return (
		<div className="space-y-4">
			<p className="text-sm font-medium text-text-secondary">{statusLine}</p>
			<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
				<AppButtonSecondary className="min-h-[44px]" width="w-full sm:w-auto" to={openTransferHref}>
					Open Transfer
				</AppButtonSecondary>
				<AppButtonSecondary className="min-h-[44px] opacity-60" width="w-full sm:w-auto" disabled>
					Buy with bank — Coming soon
				</AppButtonSecondary>
				<AppButtonSecondary className="min-h-[44px] opacity-60" width="w-full sm:w-auto" disabled>
					Buy on DEX — Coming soon
				</AppButtonSecondary>
			</div>
		</div>
	);
}
