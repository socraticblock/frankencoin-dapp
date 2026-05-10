import AppCard from "@components/AppCard";
import AppLink from "@components/AppLink";
import { ContractUrl, formatCurrency } from "@utils";
import type { SupportedChain } from "@frankencoin/zchf";
import type { Address } from "viem";
import { formatUnits, zeroAddress } from "viem";
import type { EarnPreviewRow } from "./earnPreview";

export type EarnTransactionPreviewProps = {
	rows: EarnPreviewRow[];
	resultingBalance?: bigint;
	helperText?: string | null;
	hideResultingBalance?: boolean;
	balance: bigint;
	change: bigint;
	interest: bigint;
	referrer: Address;
	referralFeePPM: bigint;
	referralFees: bigint;
	locktime: bigint;
	chain: SupportedChain;
};

export default function EarnTransactionPreview({
	rows,
	resultingBalance,
	helperText,
	hideResultingBalance,
	balance,
	change,
	interest,
	referrer,
	referralFeePPM,
	referralFees,
	locktime,
	chain,
}: EarnTransactionPreviewProps) {
	return (
		<AppCard>
			<div className="text-lg font-bold text-center">Preview</div>
			<div className="p-4 flex flex-col gap-2">
				<div className="flex">
					<div className="flex-1 text-text-secondary">Current earning balance</div>
					<div className="">{formatCurrency(formatUnits(balance, 18))} ZCHF</div>
				</div>

				{rows.map((row) => (
					<div className="flex" key={row.label}>
						<div className="flex-1 text-text-secondary">{row.label}</div>
						<div className="">{formatCurrency(formatUnits(row.value, 18))} ZCHF</div>
					</div>
				))}

				{helperText ? <div className="mt-1 text-sm text-text-secondary">{helperText}</div> : null}

				{referrer != zeroAddress ? (
					<div className="flex">
						<div className="flex-1 text-text-secondary">
							Pay out to <AppLink className="pr-2" label="referrer" href={ContractUrl(referrer, chain)} external={true} />(
							{Math.round(Number(referralFeePPM / 1000n)) / 10}%)
						</div>
						<div className="">- {formatCurrency(formatUnits(referralFees, 18))} ZCHF</div>
					</div>
				) : null}

				{!hideResultingBalance ? (
					<>
						<hr className="border-slate-700 border-dashed" />
						<div className="flex font-bold">
							<div className="flex-1 text-text-secondary">Resulting earning balance</div>
							<div className="">
								{formatCurrency(formatUnits(resultingBalance ?? balance + change + interest, 18))} ZCHF
							</div>
						</div>
					</>
				) : null}

				<div className="flex mt-8">
					<div className={`flex-1 text-text-secondary`}>
						{locktime > 0
							? `Interest starts to continuously accrue after three days, in your case in ${formatCurrency(
									(parseFloat(locktime.toString()) / 60 / 60).toString()
							  )} hours.`
							: ""}
					</div>
				</div>
			</div>
		</AppCard>
	);
}
