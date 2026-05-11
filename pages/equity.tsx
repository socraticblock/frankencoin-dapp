import React from "react";
import Head from "next/head";
import EquityInteractionCard from "@components/PageEquity/EquityInteractionCard";
import { usePoolStats } from "@hooks";
import { ADDRESS } from "@frankencoin/zchf";
import { mainnet } from "viem/chains";
import AppNotice from "@components/AppNotice";
import AppPageHeader from "@components/AppPageHeader";
import AppButtonSecondary from "@components/AppButtonSecondary";
import { useAppKitNetwork } from "@reown/appkit/react";
import { useChainId } from "wagmi";
import AppCard from "@components/AppCard";
import AppBox from "@components/AppBox";
import DisplayLabel from "@components/DisplayLabel";
import DisplayAmount from "@components/DisplayAmount";
import DisplayOutputAlignedRight from "@components/DisplayOutputAlignedRight";
import { SOCIAL } from "@utils";

const SECONDS_PER_DAY = 86_400n;
const REDEMPTION_DURATION = SECONDS_PER_DAY * 90n;

function getRemainingRedemptionDuration(holdingDuration: bigint, canRedeem: boolean) {
	if (canRedeem || holdingDuration >= REDEMPTION_DURATION) return 0n;
	return REDEMPTION_DURATION - holdingDuration;
}

function formatDays(seconds: bigint) {
	const days = (seconds + SECONDS_PER_DAY - 1n) / SECONDS_PER_DAY;
	return `${days.toString()} day${days === 1n ? "" : "s"}`;
}

function formatHoldingProgress(holdingDuration: bigint) {
	return `${(holdingDuration / SECONDS_PER_DAY).toString()} / 90 days`;
}

function formatHoldingDaysOnly(holdingDuration: bigint) {
	const days = holdingDuration / SECONDS_PER_DAY;
	return `${days.toString()} days`;
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="flex items-center justify-between gap-4 border-b border-menu-separator py-2 last:border-b-0">
			<span className="text-sm text-text-secondary">{label}</span>
			<div className="text-right text-sm font-medium text-text-primary">{children}</div>
		</div>
	);
}

function EducationItem({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<details className="rounded-lg border border-menu-separator bg-card-content-primary p-4">
			<summary className="cursor-pointer font-medium text-text-primary">{title}</summary>
			<div className="mt-3 text-sm text-text-secondary">{children}</div>
		</details>
	);
}

export default function Equity() {
	const chainId = useChainId();
	const appKitNetwork = useAppKitNetwork();
	const poolStats = usePoolStats();
	const redemptionLeft = getRemainingRedemptionDuration(poolStats.equityHoldingDuration, poolStats.equityCanRedeem);
	const redemptionStatus = poolStats.equityCanRedeem ? "Ready" : `Available in ${formatDays(redemptionLeft)}`;
	const holdingProgress = formatHoldingProgress(poolStats.equityHoldingDuration);
	const holdingDaysLabel = poolStats.equityCanRedeem
		? formatHoldingDaysOnly(poolStats.equityHoldingDuration)
		: holdingProgress;
	const protocolValue = (poolStats.equitySupply * poolStats.equityPrice) / BigInt(1e18);
	const positionValue = (poolStats.equityBalance * poolStats.equityPrice) / BigInt(1e18);
	const progressPercent = Math.min(100, Number((poolStats.equityHoldingDuration * 100n) / REDEMPTION_DURATION));

	return (
		<>
			<Head>
				<title>Frankencoin - Invest</title>
			</Head>

			<AppPageHeader
				title="Invest in Frankencoin Pool Shares"
				description="FPS gives you participation in Frankencoin's equity reserve and governance. It can rise when the protocol earns fees or liquidation gains, and fall if the reserve pool takes losses."
			>
				{chainId !== mainnet.id ? (
					<AppNotice
						variant="warning"
						title="FPS is available on Ethereum mainnet only."
						message="To buy or redeem Frankencoin Pool Shares, switch your wallet to Ethereum."
					>
						<div className="mt-3 max-w-xs">
							<AppButtonSecondary onClick={() => appKitNetwork.switchNetwork(mainnet)}>Switch to Ethereum</AppButtonSecondary>
						</div>
					</AppNotice>
				) : null}
			</AppPageHeader>

			<section className="mt-6">
				<AppCard className="p-4 md:p-6">
					<div className="mb-4">
						<h2 className="text-lg font-semibold text-text-primary">Your FPS position</h2>
						<p className="mt-1 text-sm text-text-secondary">
							See your FPS balance, protocol value, and direct redemption readiness.
						</p>
					</div>

					<div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-0">
						<div className="md:pr-6">
							<p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-secondary">Position</p>
							<div>
								<SummaryRow label="FPS balance">
									<DisplayAmount
										className="pt-0"
										amount={poolStats.equityBalance}
										currency="FPS"
										address={ADDRESS[mainnet.id].equity}
										hideLogo
									/>
								</SummaryRow>
								<SummaryRow label="Value at protocol price">
									<DisplayAmount
										className="pt-0"
										amount={positionValue}
										currency="ZCHF"
										address={ADDRESS[mainnet.id].frankencoin}
										hideLogo
									/>
								</SummaryRow>
								<SummaryRow label="Transfer / wrap / sell">
									<span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-sm font-medium text-emerald-800 dark:text-emerald-200">
										Available anytime
									</span>
								</SummaryRow>
							</div>
						</div>

						<div className="border-t border-menu-separator pt-6 md:border-l md:border-t-0 md:pl-6 md:pt-0">
							<p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-secondary">Direct redemption</p>
							<p className="mb-3 text-xs leading-relaxed text-text-secondary">
								Direct protocol redemption requires 90 days of average holding duration. Transfer, wrap, or sell remains available separately.
							</p>
							<div>
								<SummaryRow label="Average holding duration">
									<DisplayOutputAlignedRight className="pt-0" output={holdingDaysLabel} />
								</SummaryRow>
								<SummaryRow label="Direct redemption">
									<span
										className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium ${
											poolStats.equityCanRedeem
												? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
												: "bg-amber-500/15 text-amber-900 dark:text-amber-100"
										}`}
									>
										{redemptionStatus}
									</span>
								</SummaryRow>
							</div>
							<div className="mt-4">
								<div className="h-1.5 overflow-hidden rounded-full bg-card-content-primary">
									<div
										className={`h-full rounded-full ${poolStats.equityCanRedeem ? "bg-emerald-600/40" : "bg-amber-600/70"}`}
										style={{ width: `${poolStats.equityCanRedeem ? 100 : progressPercent}%` }}
									/>
								</div>
								{poolStats.equityCanRedeem ? null : (
									<div className="mt-1.5 flex justify-between text-xs text-text-secondary">
										<span>{holdingProgress}</span>
										<span>90 days</span>
									</div>
								)}
							</div>
						</div>
					</div>

					<div className="mt-4 border-t border-menu-separator bg-card-content-primary/80 px-3 py-2.5 dark:bg-card-content-primary/40">
						<p className="text-xs leading-relaxed text-text-secondary">
							Value at protocol price is calculated by the Frankencoin equity contract. It may differ from prices on external markets.
						</p>
					</div>
				</AppCard>
			</section>

			<section className="mt-4">
				<EquityInteractionCard />
			</section>

			<section className="mt-4">
				<AppCard>
					<h2 className="font-semibold text-text-primary">Protocol value snapshot</h2>
					<div className="grid grid-cols-1 gap-2 md:grid-cols-3 lg:grid-cols-6">
						<AppBox tight>
							<DisplayLabel label="Protocol price" />
							<DisplayAmount amount={poolStats.equityPrice} currency="ZCHF" address={ADDRESS[mainnet.id].frankencoin} />
						</AppBox>
						<AppBox tight>
							<DisplayLabel label="FPS supply" />
							<DisplayAmount amount={poolStats.equitySupply} currency="FPS" address={ADDRESS[mainnet.id].equity} />
						</AppBox>
						<AppBox tight>
							<DisplayLabel label="Value of all FPS" />
							<DisplayAmount amount={protocolValue} currency="ZCHF" address={ADDRESS[mainnet.id].frankencoin} />
						</AppBox>
						<AppBox tight>
							<DisplayLabel label="Equity capital" />
							<DisplayAmount amount={poolStats.frankenEquity} currency="ZCHF" address={ADDRESS[mainnet.id].frankencoin} />
						</AppBox>
						<AppBox tight>
							<DisplayLabel label="Minter reserve" />
							<DisplayAmount amount={poolStats.frankenMinterReserve} currency="ZCHF" address={ADDRESS[mainnet.id].frankencoin} />
						</AppBox>
						<AppBox tight>
							<DisplayLabel label="Total reserve" />
							<DisplayAmount amount={poolStats.frankenTotalReserve} currency="ZCHF" address={ADDRESS[mainnet.id].frankencoin} />
						</AppBox>
					</div>
					<p className="text-sm text-text-secondary">
						Protocol price is calculated by the Frankencoin equity contract from protocol equity and FPS supply. It is not necessarily the same
						as prices on external venues.
					</p>
				</AppCard>
			</section>

			<section className="mt-4">
				<AppCard>
					<h2 className="font-semibold text-text-primary">How direct redemption works</h2>
					<p className="text-sm text-text-secondary">
						Direct protocol redemption requires your address's average FPS holding duration to reach 90 days. This rule applies to redeeming FPS
						for ZCHF through the protocol, not to transferring or wrapping FPS.
					</p>
					<p className="text-sm text-text-secondary">
						Your address has one average FPS holding duration. Adding new FPS can lower the average and may delay direct protocol redemption.
					</p>
					<EducationItem title="Example">
						Example: if you hold 1 FPS for 30 days and then add 1 more FPS, your average holding duration becomes about 15 days. Direct
						redemption becomes available when the average reaches 90 days.
					</EducationItem>
				</AppCard>
			</section>

			<section className="mt-4 mb-8">
				<AppCard>
					<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
						<h2 className="font-semibold text-text-primary">How FPS works</h2>
						<a className="text-sm underline" href={SOCIAL.Docs} target="_blank" rel="noreferrer">
							Read Frankencoin docs
						</a>
					</div>
					<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
						<EducationItem title="What gives FPS value?">
							FPS participates in Frankencoin's equity reserve. If the protocol earns fees or liquidation gains, protocol value can rise. If
							losses occur, value can fall.
						</EducationItem>
						<EducationItem title="What is protocol price?">
							Protocol price is calculated by the Frankencoin equity contract from protocol equity and FPS supply. It is not necessarily the
							same as prices on external venues.
						</EducationItem>
						<EducationItem title="Why can't I redeem yet?">
							Direct protocol redemption requires 90 days of average holding duration. This rule applies to redeeming FPS for ZCHF through the
							protocol, not to transferring or wrapping FPS.
						</EducationItem>
						<EducationItem title="What happens if I mint more FPS?">
							Your address has one average FPS holding duration. Adding new FPS can lower the average and may delay direct protocol redemption.
						</EducationItem>
						<EducationItem title="What is WFPS?">
							WFPS is wrapped FPS. Wrapping converts FPS into WFPS 1:1, and unwrapping converts WFPS back into FPS 1:1.
						</EducationItem>
					</div>
				</AppCard>
			</section>
		</>
	);
}
