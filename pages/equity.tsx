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
				<p className="max-w-3xl text-sm text-text-secondary">
					Direct protocol redemption requires 90 days of average holding duration. Transfer, wrap, or sell remains available separately.
				</p>
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

			<section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
				<AppCard>
					<h2 className="font-semibold text-text-primary">Your FPS position</h2>
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
						<SummaryRow label="Average holding duration">
							<DisplayOutputAlignedRight className="pt-0" output={holdingProgress} />
						</SummaryRow>
						<SummaryRow label="Direct redemption">
							<DisplayOutputAlignedRight
								className="pt-0"
								textColorOutput={poolStats.equityCanRedeem ? "text-green-600" : "text-amber-700"}
								output={redemptionStatus}
							/>
						</SummaryRow>
						<SummaryRow label="Transfer / wrap / sell">
							<DisplayOutputAlignedRight className="pt-0" textColorOutput="text-green-600" output="Available anytime" />
						</SummaryRow>
					</div>
					<p className="rounded-lg bg-card-content-primary p-3 text-sm text-text-secondary">
						Value at protocol price is calculated by the Frankencoin equity contract. It may differ from prices on external markets.
					</p>
				</AppCard>

				<AppCard>
					<h2 className="font-semibold text-text-primary">Direct redemption status</h2>
					<p className="text-sm text-text-secondary">
						Direct redemption burns FPS through the protocol and sends ZCHF from protocol equity.
					</p>
					<div>
						<SummaryRow label="Average holding duration">
							<DisplayOutputAlignedRight className="pt-0" output={holdingProgress} />
						</SummaryRow>
						<SummaryRow label="Direct redemption">
							<DisplayOutputAlignedRight
								className="pt-0"
								textColorOutput={poolStats.equityCanRedeem ? "text-green-600" : "text-amber-700"}
								output={redemptionStatus}
							/>
						</SummaryRow>
						<SummaryRow label="Transfer, wrap, or sell">
							<DisplayOutputAlignedRight className="pt-0" textColorOutput="text-green-600" output="Available anytime" />
						</SummaryRow>
					</div>
					{poolStats.equityCanRedeem ? null : (
						<div>
							<div className="h-2 rounded-full bg-card-content-primary">
								<div className="h-2 rounded-full bg-button-default" style={{ width: `${progressPercent}%` }} />
							</div>
							<div className="mt-2 flex justify-between text-xs text-text-secondary">
								<span>{holdingProgress}</span>
								<span>90 days</span>
							</div>
						</div>
					)}
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
					<h2 className="font-semibold text-text-primary">Direct redemption readiness</h2>
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
