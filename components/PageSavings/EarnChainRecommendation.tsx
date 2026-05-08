import AppButtonSecondary from "@components/AppButtonSecondary";
import AppNotice from "@components/AppNotice";

interface Props {
	chainName: string;
	balance: string;
	onSwitch: () => void;
	hasAnyBalance: boolean;
}

export default function EarnChainRecommendation({ chainName, balance, onSwitch, hasAnyBalance }: Props) {
	if (!hasAnyBalance) {
		return (
			<AppNotice
				variant="neutral"
				title="No ZCHF found"
				message="No ZCHF was found on supported chains for this wallet. You can still review rates and deposit later."
			/>
		);
	}

	return (
		<div className="space-y-3">
			<AppNotice
				variant="info"
				title={`ZCHF found on ${chainName}`}
				message={`You have ${balance} ZCHF on ${chainName}. Switch to ${chainName} to deposit, withdraw, or collect interest.`}
			/>
			<div className="max-w-xs">
				<AppButtonSecondary onClick={onSwitch}>Switch to {chainName}</AppButtonSecondary>
			</div>
		</div>
	);
}
