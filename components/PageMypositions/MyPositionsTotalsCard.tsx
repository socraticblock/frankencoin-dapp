import AppCard from "@components/AppCard";
import { formatCurrency, normalizeAddress } from "@utils";
import { ChallengesPositionsMapping } from "@frankencoin/api";
import { Address, formatUnits, isAddress, zeroAddress } from "viem";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import { useConnection } from "wagmi";
import { RootState } from "../../redux/redux.store";

export type PortfolioOverview = {
	activeCount: number;
	totalMinted: bigint;
	totalReserves: bigint;
	totalOwed: bigint;
	challengedCount: number;
	challengeStatus: "Healthy" | "Challenged" | "No active challenges" | "Not loaded";
};

export default function MyPositionsTotalsCard() {
	const overview = usePortfolioOverview();

	return (
		<div className="space-y-3">
			<div>
				<h2 className="text-xl font-semibold text-text-primary">Portfolio overview</h2>
				<p className="mt-1 text-sm text-text-secondary">Your borrowing summary across active positions.</p>
			</div>
			<div className="grid grid-cols-1 gap-3 md:grid-cols-3">
				<OverviewCard label="Repay from wallet" value={`${formatCurrency(formatUnits(overview.totalOwed, 18), 2, 2)} ZCHF`} />
				<OverviewCard label="Active positions" value={overview.activeCount > 0 ? String(overview.activeCount) : "None"} />
				<OverviewCard
					label="Challenge status"
					value={overview.challengeStatus}
					tone={overview.challengeStatus === "Challenged" ? "warning" : "normal"}
				/>
			</div>
			<AppCard className="rounded-xl border border-[#e0d4bd] bg-card-body-primary p-4 dark:border-menu-separator">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h3 className="text-sm font-semibold text-text-primary">Accounting details</h3>
						<p className="mt-1 text-xs text-text-secondary">Technical totals use the existing position formulas.</p>
					</div>
					<div className="grid flex-1 grid-cols-1 gap-2 text-sm md:grid-cols-3">
						<AccountingDetail
							label="Total position size"
							value={`${formatCurrency(formatUnits(overview.totalMinted, 18), 2, 2)} ZCHF`}
						/>
						<AccountingDetail
							label="Retained reserves"
							value={`${formatCurrency(formatUnits(overview.totalReserves, 18), 2, 2)} ZCHF`}
						/>
						<AccountingDetail
							label="Repay from wallet"
							value={`${formatCurrency(formatUnits(overview.totalOwed, 18), 2, 2)} ZCHF`}
						/>
					</div>
				</div>
			</AppCard>
		</div>
	);
}

export function usePortfolioOverview(): PortfolioOverview {
	const positions = useSelector((state: RootState) => state.positions.list.list);
	const challenges = useSelector((state: RootState) => state.challenges.positions.map);
	const challengesLoaded = useSelector((state: RootState) => state.challenges.loaded);
	const router = useRouter();
	const rawAddress = router.query.address;
	const overwrite: Address | undefined = typeof rawAddress === "string" && isAddress(rawAddress) ? rawAddress : undefined;
	const { address } = useConnection();
	const account = overwrite || address || zeroAddress;

	const matchingPositions = positions.filter((p) => normalizeAddress(p.owner) === normalizeAddress(account) && !p.closed && !p.denied);
	let totalMinted = 0n;
	let totalReserves = 0n;

	for (const p of matchingPositions) {
		const minted = safeBigInt(p.minted);
		const reserve = safeBigInt(p.reserveContribution);
		totalMinted += minted;
		totalReserves += (minted * reserve) / 1_000_000n;
	}

	const challengedCount = countActiveChallenges(
		matchingPositions.map((p) => normalizeAddress(p.position)),
		challenges
	);
	const activeCount = matchingPositions.length;
	const challengeStatus =
		activeCount === 0 ? "No active challenges" : !challengesLoaded ? "Not loaded" : challengedCount > 0 ? "Challenged" : "Healthy";

	return {
		activeCount,
		totalMinted,
		totalReserves,
		totalOwed: totalMinted - totalReserves,
		challengedCount,
		challengeStatus,
	};
}

function countActiveChallenges(positionIds: Address[], challenges: ChallengesPositionsMapping) {
	return positionIds.reduce((count, positionId) => {
		const active = (challenges[positionId] ?? []).filter((challenge) => challenge.status === "Active");
		return count + active.length;
	}, 0);
}

function safeBigInt(value: unknown, fallback = 0n) {
	try {
		if (typeof value === "bigint") return value;
		if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.trunc(value));
		if (typeof value === "string" && value.trim() !== "") return BigInt(value);
		return fallback;
	} catch {
		return fallback;
	}
}

function OverviewCard({ label, value, tone = "normal" }: { label: string; value: string; tone?: "normal" | "warning" }) {
	return (
		<div className="rounded-xl border border-[#e0d4bd] bg-card-content-secondary p-4 shadow-sm dark:border-menu-separator">
			<div className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{label}</div>
			<div className={`mt-3 text-2xl font-semibold ${tone === "warning" ? "text-text-warning" : "text-text-primary"}`}>{value}</div>
		</div>
	);
}

function AccountingDetail({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-lg border border-[#eadfcd] bg-card-content-primary p-3 dark:border-menu-separator">
			<div className="text-xs text-text-secondary">{label}</div>
			<div className="mt-1 font-semibold text-text-primary">{value}</div>
		</div>
	);
}
