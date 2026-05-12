import AppButton from "@components/AppButton";
import AppEmptyState from "@components/AppEmptyState";
import TokenLogo from "@components/TokenLogo";
import { ChallengesPositionsMapping, PositionQuery, PriceQueryObjectArray } from "@frankencoin/api";
import { formatCurrency, normalizeAddress } from "@utils";
import { useRouter } from "next/router";
import { Address, formatUnits } from "viem";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/redux.store";

type PositionViewModel = {
	position: PositionQuery;
	positionAddress: Address;
	collateralName: string;
	collateralSymbol: string;
	collateralAmount: number;
	collateralValue?: number;
	borrowed: number;
	repayFromWallet: number;
	available?: number;
	liquidationPrice?: number;
	loanToValue?: number;
	safetyBuffer?: number;
	maturity: string;
	status: "Healthy" | "Challenged" | "Matured" | "Not loaded";
};

type Props = {
	account: Address;
	hasAccount: boolean;
	isPublicView: boolean;
};

export default function MypositionsTable({ account, hasAccount, isPublicView }: Props) {
	const router = useRouter();

	const positions = useSelector((state: RootState) => state.positions.list.list);
	const challenges = useSelector((state: RootState) => state.challenges.positions.map);
	const challengesLoaded = useSelector((state: RootState) => state.challenges.loaded);
	const prices = useSelector((state: RootState) => state.prices.coingecko);
	const accountId = normalizeAddress(account);

	const matchingPositions = positions.filter((p) => {
		if (normalizeAddress(p.owner) !== accountId) return false;
		if (p.closed || p.denied) return false;
		return true;
	});

	const rows = matchingPositions
		.map((position) => buildPositionView(position, challenges, challengesLoaded, prices))
		.filter((row): row is PositionViewModel => row !== null);

	if (!hasAccount) {
		return (
			<AppEmptyState
				title="Connect your wallet to view your portfolio."
				description="You will see borrowing positions, repayment information, maturity dates, and challenge status here."
				actionLabel="Connect wallet"
				actionHref="#"
			/>
		);
	}

	if (rows.length === 0) {
		return (
			<AppEmptyState
				title={isPublicView ? "No borrowing positions found for this address." : "No borrowing positions yet"}
				description={
					isPublicView
						? "Make sure this is the borrower wallet address."
						: "Open a borrowing position by choosing approved collateral and minting ZCHF."
				}
				actionLabel={isPublicView ? undefined : "Borrow ZCHF"}
				actionHref={isPublicView ? undefined : "/mint"}
			/>
		);
	}

	return (
		<div className="space-y-4">
			<div className="hidden overflow-hidden rounded-xl border border-[#e0d4bd] bg-card-content-secondary shadow-sm dark:border-menu-separator lg:block">
				<div className="grid grid-cols-[1.15fr_1.05fr_1.1fr_0.75fr_0.7fr_0.55fr] gap-4 border-b border-[#eadfcd] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary dark:border-menu-separator">
					<div>Collateral</div>
					<div>Borrowed</div>
					<div>Risk</div>
					<div>Maturity</div>
					<div>Status</div>
					<div className="text-right">Actions</div>
				</div>
				{rows.map((row) => (
					<PositionDesktopRow
						key={row.positionAddress}
						row={row}
						onManage={() => router.push(`/mypositions/${row.positionAddress}`)}
					/>
				))}
			</div>

			<div className="space-y-3 lg:hidden">
				{rows.map((row) => (
					<PositionMobileCard
						key={row.positionAddress}
						row={row}
						onManage={() => router.push(`/mypositions/${row.positionAddress}`)}
					/>
				))}
			</div>
		</div>
	);
}

function PositionDesktopRow({ row, onManage }: { row: PositionViewModel; onManage: () => void }) {
	return (
		<div className="grid grid-cols-[1.15fr_1.05fr_1.1fr_0.75fr_0.7fr_0.55fr] gap-4 border-b border-[#eadfcd] px-4 py-4 text-sm last:border-b-0 dark:border-menu-separator">
			<CollateralCell row={row} />
			<BorrowedCell row={row} />
			<RiskCell row={row} />
			<div className="font-medium text-text-primary">{row.maturity}</div>
			<div>
				<StatusPill status={row.status} />
			</div>
			<div className="flex justify-end">
				<AppButton size="small" width="w-auto" className="min-h-[36px] px-4" onClick={onManage}>
					Manage
				</AppButton>
			</div>
		</div>
	);
}

function PositionMobileCard({ row, onManage }: { row: PositionViewModel; onManage: () => void }) {
	return (
		<article className="rounded-xl border border-[#e0d4bd] bg-card-content-secondary p-4 shadow-sm dark:border-menu-separator">
			<div className="flex items-start justify-between gap-3">
				<CollateralCell row={row} />
				<StatusPill status={row.status} />
			</div>
			<div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
				<BorrowedCell row={row} />
				<RiskCell row={row} />
				<div>
					<div className="text-xs text-text-secondary">Maturity</div>
					<div className="font-semibold text-text-primary">{row.maturity}</div>
				</div>
			</div>
			<AppButton size="small" width="w-full" className="mt-4 min-h-[42px]" onClick={onManage}>
				Manage
			</AppButton>
		</article>
	);
}

function CollateralCell({ row }: { row: PositionViewModel }) {
	return (
		<div className="flex min-w-0 items-start gap-3">
			<TokenLogo currency={row.collateralSymbol} size={7} />
			<div className="min-w-0">
				<div className="font-semibold text-text-primary">{row.collateralName}</div>
				<div className="text-sm text-text-secondary">
					{formatCurrency(row.collateralAmount, 2, 2)} {row.collateralSymbol} deposited
				</div>
				{row.collateralValue !== undefined ? (
					<div className="text-xs text-text-secondary">Value: {formatCurrency(row.collateralValue, 2, 2)} ZCHF</div>
				) : null}
			</div>
		</div>
	);
}

function BorrowedCell({ row }: { row: PositionViewModel }) {
	return (
		<div className="space-y-1">
			<MiniMetric label="Total position size" value={`${formatCurrency(row.borrowed, 2, 2)} ZCHF`} />
			<MiniMetric label="Repay from wallet" value={`${formatCurrency(row.repayFromWallet, 2, 2)} ZCHF`} />
			{row.available !== undefined ? (
				<MiniMetric label="Available" value={`${formatCurrency(row.available, 2, 2)} ZCHF`} muted />
			) : null}
		</div>
	);
}

function RiskCell({ row }: { row: PositionViewModel }) {
	return (
		<div className="space-y-1">
			{row.loanToValue !== undefined ? (
				<MiniMetric label="Estimated Loan-to-Value" value={`${formatCurrency(row.loanToValue, 2, 2)}%`} />
			) : null}
			<MiniMetric
				label="Liquidation price"
				value={row.liquidationPrice !== undefined ? `${formatCurrency(row.liquidationPrice, 2, 2)} ZCHF` : "Unavailable"}
				muted={row.liquidationPrice === undefined}
			/>
			{row.safetyBuffer !== undefined ? (
				<MiniMetric label="Estimated safety buffer" value={`${formatCurrency(row.safetyBuffer, 2, 2)}%`} />
			) : null}
		</div>
	);
}

function MiniMetric({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
	return (
		<div>
			<div className="text-xs text-text-secondary">{label}</div>
			<div className={`font-semibold ${muted ? "text-text-secondary" : "text-text-primary"}`}>{value}</div>
		</div>
	);
}

function StatusPill({ status }: { status: PositionViewModel["status"] }) {
	const className =
		status === "Challenged"
			? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
			: status === "Matured"
			? "border-[#d7c28a] bg-[#f7ecd2] text-[#80601d] dark:border-[#8a7448] dark:bg-[#242b38] dark:text-[#e5c978]"
			: status === "Not loaded"
			? "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/20 dark:text-slate-300"
			: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300";
	return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${className}`}>{status}</span>;
}

function buildPositionView(
	position: PositionQuery,
	challenges: ChallengesPositionsMapping,
	challengesLoaded: boolean,
	prices: PriceQueryObjectArray
): PositionViewModel | null {
	const collateralAddress = safeNormalizeAddress(position.collateral);
	const zchfAddress = safeNormalizeAddress(position.zchf);
	const positionAddress = safeNormalizeAddress(position.position);
	if (!positionAddress) return null;

	const collateralDecimals = safeDecimals(position.collateralDecimals);
	const zchfDecimals = safeDecimals(position.zchfDecimals);
	const collTokenPrice = collateralAddress ? prices[collateralAddress]?.price?.usd : undefined;
	const zchfPrice = zchfAddress ? prices[zchfAddress]?.price?.usd : undefined;
	const minted = safeBigInt(position.minted);
	const collateralAmount = safeFormatUnits(position.collateralBalance, collateralDecimals, 0);
	const borrowed = safeFormatUnits(minted, zchfDecimals, 0);
	const reserve = (minted * safeBigInt(position.reserveContribution)) / 1_000_000n;
	const repayFromWallet = safeFormatUnits(minted - reserve, zchfDecimals, 0);
	const rawLiquidationPrice = safeFormatUnits(position.price, 36 - collateralDecimals, Number.NaN);
	const liquidationPrice = Number.isFinite(rawLiquidationPrice) ? rawLiquidationPrice : undefined;
	const available = safeFormatUnits(
		position.version === 2 ? (position as { availableForMinting?: unknown }).availableForMinting : position.availableForClones,
		18,
		0
	);
	const collateralValue = collTokenPrice && zchfPrice ? (collateralAmount * collTokenPrice) / zchfPrice : undefined;
	const loanToValue = collateralValue && collateralValue > 0 ? (borrowed / collateralValue) * 100 : undefined;
	const safetyBuffer = loanToValue !== undefined ? Math.max(0, 100 - loanToValue) : undefined;
	const activeChallenges = positionAddress ? (challenges[positionAddress] ?? []).filter((challenge) => challenge.status === "Active") : [];
	const expiration = safeNumber(position.expiration);
	const isMatured = expiration !== undefined && expiration * 1000 < Date.now();

	return {
		position,
		positionAddress,
		collateralName: safeText(position.collateralName, "Collateral"),
		collateralSymbol: safeText(position.collateralSymbol, "TOKEN"),
		collateralAmount,
		collateralValue,
		borrowed,
		repayFromWallet,
		available,
		liquidationPrice,
		loanToValue,
		safetyBuffer,
		maturity: expiration !== undefined ? formatMaturity(expiration) : "Unavailable",
		status: activeChallenges.length > 0 ? "Challenged" : !challengesLoaded ? "Not loaded" : isMatured ? "Matured" : "Healthy",
	};
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

function safeNumber(value: unknown, fallback?: number) {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) return parsed;
	}
	return fallback;
}

function safeDecimals(value: unknown, fallback = 18) {
	const parsed = safeNumber(value, fallback) ?? fallback;
	return Math.min(36, Math.max(0, Math.trunc(parsed)));
}

function safeFormatUnits(value: unknown, decimals: unknown, fallback: number) {
	try {
		return parseFloat(formatUnits(safeBigInt(value), safeDecimals(decimals)));
	} catch {
		return fallback;
	}
}

function safeNormalizeAddress(value: unknown): Address | undefined {
	try {
		if (typeof value !== "string" || value.trim() === "") return undefined;
		return normalizeAddress(value);
	} catch {
		return undefined;
	}
}

function safeText(value: unknown, fallback: string) {
	return typeof value === "string" && value.trim() !== "" ? value : fallback;
}

function formatMaturity(timestamp: number) {
	return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(timestamp * 1000));
}
