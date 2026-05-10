import AppCard from "@components/AppCard";
import { ContractUrl, formatCurrency, getChain } from "@utils";
import { Address, formatUnits, zeroAddress } from "viem";
import SavingsActionRedeem from "./SavingsActionRedeem";
import AppLink from "@components/AppLink";
import { SupportedChain } from "@frankencoin/zchf";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/redux.store";
import { SavingsBalance } from "@frankencoin/api";

export type SavingsOutcomeFlowIntent =
	| "collect"
	| "collect_wallet"
	| "compound"
	| "deposit"
	| "withdraw"
	| "withdraw_partial"
	| "withdraw_all";

interface Props {
	account: Address;
	chain: SupportedChain;
	balance: bigint;
	change: bigint;
	direction: boolean;
	interest: bigint;
	locktime: bigint;
	referrer: Address;
	referralFeePPM: bigint;
	referralFees: bigint;
	/** When set, outcome row labels match the active earn action (collect / deposit / withdraw). */
	flowIntent?: SavingsOutcomeFlowIntent | null;
	/** Earn-page transaction preview: hide portfolio totals; focus on this action only. */
	variant?: "full" | "earnTransaction";
	actionAmount?: bigint;
	resultingBalance?: bigint;
	interestAlsoCollected?: bigint;
	totalReceived?: bigint;
	/** Principal (pre-refresh) and net total to wallet for withdraw-all preview rows. */
	withdrawAllPreview?: { principal: bigint; totalReceived: bigint } | null;
}

export default function SavingsDetailsCard({
	account,
	chain,
	balance,
	change,
	direction,
	interest,
	locktime,
	referrer,
	referralFeePPM,
	referralFees,
	flowIntent = null,
	variant = "full",
	actionAmount,
	resultingBalance,
	interestAlsoCollected = 0n,
	totalReceived,
	withdrawAllPreview = null,
}: Props) {
	const { savingsBalance } = useSelector((state: RootState) => state.savings);

	let entries: SavingsBalance[] = [];

	if (account != zeroAddress) {
		entries = Object.values(savingsBalance)
			.map((m) => Object.values(m))
			.flat()
			.filter((m) => BigInt(m.balance) > 0n);
	}

	const inactiveBalance = entries.filter((i) => i.chainId != chain.id);
	const totalBalance = entries.reduce((a, b) => a + BigInt(b.balance), 0n);
	const showPortfolioOverview = variant === "full";
	const isEarnTransactionPreview = variant === "earnTransaction";

	const previewRows =
		isEarnTransactionPreview && flowIntent
			? getEarnTransactionPreviewRows({
					flowIntent,
					actionAmount:
						actionAmount ??
						(flowIntent === "deposit" || flowIntent === "withdraw" || flowIntent === "withdraw_partial"
							? change < 0n
								? -change
								: change
							: interest),
					interest,
					interestAlsoCollected,
					totalReceived,
					withdrawAllPreview,
			  })
			: null;

	const movementLabel =
		flowIntent === "collect" || flowIntent === "collect_wallet"
			? "Interest to collect"
			: flowIntent === "compound"
				? "Interest to compound"
			: flowIntent === "deposit"
				? "Amount to deposit"
				: flowIntent === "withdraw" || flowIntent === "withdraw_partial"
					? "Amount from earning"
					: flowIntent === "withdraw_all"
						? "Total to receive"
						: direction
						? "Amount to deposit"
						: "Amount to withdraw";

	const movementValue =
		flowIntent === "collect" || flowIntent === "collect_wallet" || flowIntent === "compound"
			? formatCurrency(formatUnits(interest - (referrer != zeroAddress ? referralFees : 0n), 18))
			: formatCurrency(
					formatUnits((change < 0n ? -change : change) - (referrer != zeroAddress ? referralFees : 0n), 18)
			  );

	const showInterestReadyRow = flowIntent == null;

	return (
		<AppCard>
			<div className="text-lg font-bold text-center">Outcome</div>
			<div className="p-4 flex flex-col gap-2">
				{showPortfolioOverview ? (
					<>
						<div className="flex">
							<div className="flex-1 text-text-secondary">Your total balance</div>
							<div className="text-text-secondary">{formatCurrency(formatUnits(totalBalance, 18))} ZCHF</div>
						</div>
						{...inactiveBalance.map((i, idx) => <SavingsSavedItem savings={i} key={`SavingsSavedItem_${idx}`} />)}
					</>
				) : null}

				<div className={`flex ${showPortfolioOverview ? "mt-4" : ""}`}>
					<div className="flex-1 text-text-secondary">
						{isEarnTransactionPreview ? "Current earning balance" : "Current savings balance"}
					</div>
					<div className="">{formatCurrency(formatUnits(balance, 18))} ZCHF</div>
				</div>

				{previewRows ? (
					previewRows.map((row) => (
						<div className="flex" key={row.label}>
							<div className="flex-1 text-text-secondary">{row.label}</div>
							<div className="">{formatCurrency(formatUnits(row.value, 18))} ZCHF</div>
						</div>
					))
				) : (
					<>
						{showInterestReadyRow ? (
							<div className="flex">
								<div className="flex-1 text-text-secondary">Interest ready</div>
								<div className="">{formatCurrency(formatUnits(interest, 18))} ZCHF</div>
							</div>
						) : null}

						<div className="flex">
							<div className="flex-1 text-text-secondary">{movementLabel}</div>
							<div className="">
								{movementValue} ZCHF
							</div>
						</div>
					</>
				)}

				{referrer != zeroAddress ? (
					<div className="flex">
						<div className="flex-1 text-text-secondary">
							Pay out to <AppLink className="pr-2" label="referrer" href={ContractUrl(referrer, chain)} external={true} />(
							{Math.round(Number(referralFeePPM / 1000n)) / 10}%)
						</div>
						<div className="">- {formatCurrency(formatUnits(referralFees, 18))} ZCHF</div>
					</div>
				) : null}

				<hr className="border-slate-700 border-dashed" />

				<div className="flex font-bold">
					<div className="flex-1 text-text-secondary">
						{isEarnTransactionPreview ? "Resulting earning balance" : "Resulting savings balance"}
					</div>
					<div className="">{formatCurrency(formatUnits(resultingBalance ?? balance + change + interest, 18))} ZCHF</div>
				</div>

				<div className="flex mt-8">
					<div className={`flex-1 text-text-secondary`}>
						{locktime > 0
							? `Interest starts to continuously accrue after three days, in your case in ${formatCurrency(
									(parseFloat(locktime.toString()) / 60 / 60).toString()
							  )} hours.`
							: ""}
					</div>
				</div>

				{showPortfolioOverview ? (
					<div className="flex mt-6">
						<SavingsActionRedeem />
					</div>
				) : null}
			</div>
		</AppCard>
	);
}

function getEarnTransactionPreviewRows({
	flowIntent,
	actionAmount,
	interest,
	interestAlsoCollected,
	totalReceived,
	withdrawAllPreview,
}: {
	flowIntent: SavingsOutcomeFlowIntent;
	actionAmount: bigint;
	interest: bigint;
	interestAlsoCollected: bigint;
	totalReceived?: bigint;
	withdrawAllPreview?: { principal: bigint; totalReceived: bigint } | null;
}): { label: string; value: bigint }[] {
	if (flowIntent === "collect" || flowIntent === "collect_wallet") {
		return [{ label: "Interest to collect", value: interest }];
	}
	if (flowIntent === "compound") {
		return [{ label: "Interest to compound", value: interest }];
	}
	if (flowIntent === "deposit") {
		return [{ label: "Amount to deposit", value: actionAmount }];
	}
	if (flowIntent === "withdraw_partial") {
		const rows: { label: string; value: bigint }[] = [{ label: "Amount from earning", value: actionAmount }];
		if (actionAmount === 0n) {
			rows.push({ label: "Interest ready", value: interest });
		} else {
			rows.push({ label: "Interest stays earning", value: interest });
			rows.push({ label: "Received in wallet", value: actionAmount });
		}
		return rows;
	}
	if (flowIntent === "withdraw_all") {
		if (withdrawAllPreview) {
			return [
				{ label: "Earning balance", value: withdrawAllPreview.principal },
				{ label: "Interest collected", value: interest },
				{ label: "Total received in wallet", value: withdrawAllPreview.totalReceived },
			];
		}
		return [];
	}
	const rows = [{ label: "Amount to withdraw", value: actionAmount }];
	if (interestAlsoCollected > 0n) {
		rows.push({ label: "Interest also collected", value: interestAlsoCollected });
	}
	if (totalReceived != undefined) {
		rows.push({ label: "Total received in wallet", value: totalReceived });
	}
	return rows;
}

interface SavingsSavedItemProps {
	savings: SavingsBalance;
}

function SavingsSavedItem({ savings }: SavingsSavedItemProps) {
	return (
		<div className="flex">
			<div className="flex-1 text-text-secondary pl-2">Therefore on {getChain(savings.chainId).name}</div>
			<div className="text-text-secondary">{formatCurrency(formatUnits(BigInt(savings.balance), 18))} ZCHF</div>
		</div>
	);
}
