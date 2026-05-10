import TokenInputChain from "@components/Input/TokenInputChain";

export type EarnDepositPanelProps = {
	readyInterestWillBeAdded: boolean;
	hasMeaningfulWalletZchf: boolean;
	chainName: string;
	fromSymbol: string;
	depositAmount: bigint;
	onDepositAmountChange: (value: string) => void;
	errorLabel: string;
	hasSavingsDataError: boolean;
	userBalance: bigint;
	onChangeChain: (value: string) => void;
	lockChainSelector: boolean;
};

export default function EarnDepositPanel({
	readyInterestWillBeAdded,
	hasMeaningfulWalletZchf,
	chainName,
	fromSymbol,
	depositAmount,
	onDepositAmountChange,
	errorLabel,
	hasSavingsDataError,
	userBalance,
	onChangeChain,
	lockChainSelector,
}: EarnDepositPanelProps) {
	if (!hasMeaningfulWalletZchf) {
		return (
			<div className="mt-8 space-y-4 rounded-xl border border-[#e0d4bd] bg-[#fffaf0] p-5 text-sm dark:border-menu-separator dark:bg-card-body-primary">
				<p className="text-text-secondary">No wallet ZCHF available to deposit.</p>
			</div>
		);
	}

	return (
		<div className="mt-8 space-y-3">
			{readyInterestWillBeAdded ? (
				<div className="rounded-xl border border-[#e0d4bd] bg-[#fffaf0] p-4 text-sm text-text-secondary dark:border-menu-separator dark:bg-card-body-primary">
					Ready interest will be added to earning before this deposit.
				</div>
			) : null}
			<TokenInputChain
				label="Amount to deposit"
				chain={chainName}
				min={BigInt("0")}
				max={userBalance}
				reset={BigInt("0")}
				symbol={fromSymbol}
				placeholder={fromSymbol + " Amount"}
				value={depositAmount.toString()}
				onChange={onDepositAmountChange}
				error={hasSavingsDataError ? "" : errorLabel}
				limit={userBalance}
				limitDigit={18}
				limitLabel="Wallet"
				onChangeChain={onChangeChain}
				lockChainSelector={lockChainSelector}
				tokenLogo={"ZCHF"}
			/>
		</div>
	);
}
