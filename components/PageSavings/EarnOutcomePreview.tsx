import AppTransactionPreview from "@components/AppTransactionPreview";

interface Props {
	mode: "deposit" | "withdraw" | "interest";
	amount: string;
	chainName: string;
	destination?: "wallet" | "savings";
}

export default function EarnOutcomePreview({ mode, amount, chainName, destination = "wallet" }: Props) {
	if (mode === "deposit") {
		return (
			<AppTransactionPreview
				action="Deposit ZCHF"
				amount={`${amount} ZCHF`}
				network={chainName}
				source="Your wallet"
				destination="Savings module"
				outcome="Your savings balance increases."
			/>
		);
	}
	if (mode === "withdraw") {
		return (
			<AppTransactionPreview
				action="Withdraw ZCHF"
				amount={`${amount} ZCHF`}
				network={chainName}
				source="Savings module"
				destination="Your wallet"
				outcome="Your wallet balance increases."
			/>
		);
	}
	return (
		<AppTransactionPreview
			action={destination === "wallet" ? "Collect to wallet" : "Re-deposit interest"}
			amount={`${amount} ZCHF`}
			network={chainName}
			source="Savings module"
			destination={destination === "wallet" ? "Your wallet" : "Savings balance"}
			outcome="Your claimable interest is settled."
		/>
	);
}
