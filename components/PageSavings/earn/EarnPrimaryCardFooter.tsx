import EarnCustomTargetAddress from "./EarnCustomTargetAddress";
import SavingsActionInterest from "../SavingsActionInterest";
import SavingsActionSave from "../SavingsActionSave";
import SavingsActionWithdraw from "../SavingsActionWithdraw";
import SavingsActionSaveOnBehalf from "../SavingsActionSaveOnBehalf";
import AppLink from "@components/AppLink";
import { ContractUrl, shortenAddress } from "@utils";
import type { SupportedChain } from "@frankencoin/zchf";
import type { Address } from "viem";
import type { EarnAction } from "./earnTypes";

export type EarnPrimaryCardFooterProps = {
	lockChainSelector: boolean;
	earnAction: EarnAction;
	chain: SupportedChain;
	onbehalfToggle: boolean;
	onbehalfAddress: string;
	onbehalfError: string;
	onOnbehalfToggle: (v: boolean) => void;
	onOnbehalfAddressChange: (v: string) => void;
	hasActionableFunds: boolean;
	error: string;
	depositBlockedByInterest: boolean;
	hasMeaningfulWalletZchf: boolean;
	depositAmount: bigint;
	savingsModule: Address;
	newReferrer: Address | undefined;
	newReferralFeePPM: bigint;
	amount: bigint;
	userSavingsBalance: bigint;
	userSavingsInterest: bigint;
	change: bigint;
};

export default function EarnPrimaryCardFooter({
	lockChainSelector,
	earnAction,
	chain,
	onbehalfToggle,
	onbehalfAddress,
	onbehalfError,
	onOnbehalfToggle,
	onOnbehalfAddressChange,
	hasActionableFunds,
	error,
	depositBlockedByInterest,
	hasMeaningfulWalletZchf,
	depositAmount,
	savingsModule,
	newReferrer,
	newReferralFeePPM,
	amount,
	userSavingsBalance,
	userSavingsInterest,
	change,
}: EarnPrimaryCardFooterProps) {
	return (
		<>
			<div className="">
				{!(lockChainSelector && earnAction === "withdraw") ? (
					<EarnCustomTargetAddress
						enabled={onbehalfToggle}
						address={onbehalfAddress}
						error={onbehalfError}
						onEnabledChange={onOnbehalfToggle}
						onAddressChange={onOnbehalfAddressChange}
					/>
				) : null}
			</div>

			<div className="mx-auto my-4 w-full flex-col flex gap-4">
				{!onbehalfToggle && !hasActionableFunds ? (
					<div className="rounded-xl border border-[#e0d4bd] bg-[#fffaf0] p-4 text-sm text-text-secondary dark:border-menu-separator dark:bg-card-body-primary">
						Add ZCHF on {chain.name} to start earning.
					</div>
				) : onbehalfToggle ? (
					<SavingsActionSaveOnBehalf
						disabled={onbehalfError != "" || onbehalfAddress == ""}
						savingsModule={savingsModule}
						amount={amount}
						onBehalf={onbehalfAddress as Address}
					/>
				) : lockChainSelector && earnAction === "collect" ? null : lockChainSelector && earnAction === "deposit" ? (
					<SavingsActionSave
						disabled={!!error || depositBlockedByInterest || !hasMeaningfulWalletZchf || depositAmount === 0n}
						savingsModule={savingsModule}
						amount={userSavingsBalance + depositAmount}
						interest={0n}
						newReferrer={newReferrer}
						newReferralFeePPM={newReferralFeePPM}
					/>
				) : lockChainSelector && earnAction === "withdraw" ? null : userSavingsInterest > 0 && amount == userSavingsBalance ? (
					<SavingsActionInterest
						disabled={!!error}
						savingsModule={savingsModule}
						balance={userSavingsBalance}
						interest={userSavingsInterest}
						newReferrer={newReferrer}
						newReferralFeePPM={newReferralFeePPM}
					/>
				) : amount > userSavingsBalance ? (
					<SavingsActionSave
						disabled={!!error}
						savingsModule={savingsModule}
						amount={amount}
						interest={userSavingsInterest}
						newReferrer={newReferrer}
						newReferralFeePPM={newReferralFeePPM}
					/>
				) : (
					<SavingsActionWithdraw
						disabled={userSavingsBalance == 0n || !!error}
						savingsModule={savingsModule}
						balance={amount}
						change={change}
						newReferrer={newReferrer}
						newReferralFeePPM={newReferralFeePPM}
					/>
				)}
			</div>

			{newReferrer ? (
				<div className="flex mt-8">
					<div className={`flex-1 text-text-secondary`}>
						<span className="font-semibold">Notice: </span>
						You are about to set a referrer{" "}
						<AppLink
							className="pr-2"
							label={shortenAddress(newReferrer)}
							href={ContractUrl(newReferrer, chain)}
							external={true}
						/>
						who will receive{" "}
						<span className="font-semibold">{Math.round(Number(newReferralFeePPM / 1000n)) / 10}%</span> of your earned interest.
					</div>
				</div>
			) : null}
		</>
	);
}
