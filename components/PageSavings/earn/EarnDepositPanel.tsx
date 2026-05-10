import TokenInputChain from "@components/Input/TokenInputChain";
import { formatCurrency } from "@utils";
import { formatUnits } from "viem";

export type EarnDepositPanelProps = {
	blockedByInterest: boolean;
	hasMeaningfulWalletZchf: boolean;
	userSavingsInterest: bigint;
	chainName: string;
	fromSymbol: string;
	depositAmount: bigint;
	onDepositAmountChange: (value: string) => void;
	errorLabel: string;
	hasSavingsDataError: boolean;
	userBalance: bigint;
	onChangeChain: (value: string) => void;
	lockChainSelector: boolean;
	onGoToCollect: () => void;
};

export default function EarnDepositPanel({
	blockedByInterest,
	hasMeaningfulWalletZchf,
	userSavingsInterest,
	chainName,
	fromSymbol,
	depositAmount,
	onDepositAmountChange,
	errorLabel,
	hasSavingsDataError,
	userBalance,
	onChangeChain,
	lockChainSelector,
	onGoToCollect,
}: EarnDepositPanelProps) {
	if (blockedByInterest) {
		return (
			<div className="mt-8 space-y-4 rounded-xl border border-[#e0d4bd] bg-[#fffaf0] p-5 text-sm dark:border-menu-separator dark:bg-card-body-primary">
				<p className="text-text-primary">
					{formatCurrency(formatUnits(userSavingsInterest, 18))} ZCHF interest is ready. Collect it or compound it before
					depositing more ZCHF.
				</p>
				<button
					type="button"
					onClick={onGoToCollect}
					className="min-h-[44px] rounded-lg border border-[#c4a75f] bg-[#f4ead4]/90 px-4 py-2.5 font-medium text-text-primary transition hover:bg-[#ecdcbf] dark:border-[#8a7448] dark:bg-[#2a3244]"
				>
					Go to Collect
				</button>
			</div>
		);
	}

	if (!hasMeaningfulWalletZchf) {
		return (
			<div className="mt-8 space-y-4 rounded-xl border border-[#e0d4bd] bg-[#fffaf0] p-5 text-sm dark:border-menu-separator dark:bg-card-body-primary">
				<p className="text-text-secondary">No wallet ZCHF available to deposit.</p>
			</div>
		);
	}

	return (
		<div className="mt-8 space-y-3">
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
