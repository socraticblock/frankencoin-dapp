import AppCard from "@components/AppCard";
import AppButton from "@components/AppButton";
import TokenInputSelect from "@components/Input/TokenInputSelect";
import GuardSupportedChain from "@components/Guards/GuardSupportedChain";
import { mainnet } from "viem/chains";
import { formatBigInt } from "@utils";
import { ACTIONS, formatTokenAmount } from "./equityActionShared";
import { useEquityActionController } from "./useEquityActionController";

function PreviewRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between gap-4 text-sm">
			<span className="text-text-secondary">{label}</span>
			<span className="text-right font-medium text-text-primary">{value}</span>
		</div>
	);
}

export default function EquityInteractionCard() {
	const {
		action,
		setAction,
		amount,
		error,
		onChangeAmount,
		isMint,
		isRedeem,
		isWrap,
		fromSymbol,
		toSymbol,
		fromBalance,
		outputAmount,
		inputLabel,
		outputLabel,
		actionCopy,
		previewCopy,
		buttonText,
		buttonDisabled,
		isBusy,
		showMintMoreWarning,
		showMintNoZchfHelper,
		showMintDisabledHelper,
		poolStats,
		estimatedFps,
		estimatedZchf,
		outputLimitAmount,
		outputLimitLabel,
		handlePrimaryAction,
	} = useEquityActionController();

	return (
		<AppCard className="p-4">
			<div className="flex flex-col gap-4">
				<div>
					<h2 className="text-lg font-semibold text-text-primary">Choose an FPS action</h2>
					<p className="mt-1 text-sm text-text-secondary">{actionCopy}</p>
					{isRedeem ? (
						<p className="mt-2 text-sm text-text-secondary">
							{poolStats.equityCanRedeem
								? "Your average holding duration is above 90 days. Direct redemption is available."
								: "Direct redemption is not ready yet. You can still transfer, wrap, or sell FPS through available market routes."}
						</p>
					) : null}
				</div>

				<div className="grid grid-cols-2 gap-2 md:grid-cols-4">
					{ACTIONS.map((item) => (
						<button
							key={item}
							type="button"
							className={`rounded-lg border px-3 py-2 text-sm transition ${
								action === item
									? "border-button-default bg-card-content-primary font-semibold text-text-primary"
									: "border-menu-separator text-text-secondary hover:text-text-primary"
							}`}
							onClick={() => setAction(item)}
						>
							{item}
						</button>
					))}
				</div>

				<div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
					<div className="space-y-4">
						<TokenInputSelect
							max={fromBalance}
							min={0n}
							symbol={fromSymbol}
							symbolOptions={[fromSymbol]}
							symbolOnChange={() => {}}
							onChange={onChangeAmount}
							value={amount.toString()}
							error={error}
							placeholder={`${fromSymbol} amount`}
							label={inputLabel}
							limit={fromBalance}
							limitDigit={18}
							limitLabel={isMint ? "Wallet ZCHF balance" : "Balance"}
						/>

						<TokenInputSelect
							symbol={toSymbol}
							symbolOptions={[toSymbol]}
							symbolOnChange={() => {}}
							hideMaxLabel
							output={formatTokenAmount(outputAmount).toFixed(4)}
							label={outputLabel}
							disabled={true}
							limit={outputLimitAmount}
							limitDigit={18}
							limitLabel={outputLimitLabel}
						/>

						{showMintMoreWarning ? (
							<div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
								Adding new FPS can lower your average holding duration and may delay direct protocol redemption.
							</div>
						) : null}

						{showMintNoZchfHelper ? (
							<p className="text-sm text-text-secondary">No ZCHF available in this wallet.</p>
						) : showMintDisabledHelper ? (
							<p className="text-sm text-text-secondary">Enter an amount of ZCHF to mint FPS.</p>
						) : null}

						<GuardSupportedChain chain={mainnet}>
							<AppButton isLoading={isBusy} disabled={buttonDisabled} onClick={handlePrimaryAction}>
								{buttonText}
							</AppButton>
						</GuardSupportedChain>
					</div>

					<aside className="rounded-xl border border-menu-separator bg-card-content-primary p-4">
						<h3 className="font-semibold text-text-primary">Before you sign</h3>
						<p className="mt-2 text-sm text-text-secondary">{previewCopy}</p>
						{isMint || isRedeem ? (
							<p className="mt-2 text-sm text-text-secondary">The protocol pricing formula includes a 0.3% mint/redeem adjustment.</p>
						) : null}
						<div className="mt-4 space-y-2">
							{isMint ? (
								<>
									<PreviewRow label="ZCHF provided" value={`${formatBigInt(amount)} ZCHF`} />
									<PreviewRow label="Estimated FPS received" value={`${formatBigInt(estimatedFps)} FPS`} />
									<PreviewRow label="Protocol pricing adjustment" value="0.3%" />
									<PreviewRow label="New FPS balance" value={`${formatBigInt(poolStats.equityBalance + estimatedFps)} FPS`} />
								</>
							) : isRedeem ? (
								<>
									<PreviewRow label="FPS redeemed" value={`${formatBigInt(amount)} FPS`} />
									<PreviewRow label="Estimated ZCHF received" value={`${formatBigInt(estimatedZchf)} ZCHF`} />
									<PreviewRow label="Protocol pricing adjustment" value="0.3%" />
									<PreviewRow
										label="Remaining FPS balance"
										value={`${formatBigInt(amount > poolStats.equityBalance ? 0n : poolStats.equityBalance - amount)} FPS`}
									/>
								</>
							) : isWrap ? (
								<>
									<PreviewRow label="FPS wrapped" value={`${formatBigInt(amount)} FPS`} />
									<PreviewRow label="WFPS received" value={`${formatBigInt(amount)} WFPS`} />
									<PreviewRow label="Rate" value="1 FPS = 1 WFPS" />
								</>
							) : (
								<>
									<PreviewRow label="WFPS unwrapped" value={`${formatBigInt(amount)} WFPS`} />
									<PreviewRow label="FPS received" value={`${formatBigInt(amount)} FPS`} />
									<PreviewRow label="Rate" value="1 WFPS = 1 FPS" />
								</>
							)}
						</div>
					</aside>
				</div>
			</div>
		</AppCard>
	);
}
