import SavingsInteractionCard, { EarnFormIntent } from "@components/PageSavings/SavingsInteractionCard";
import { useEarnAllocations, EarnChainRow, parseChainIdQuery } from "@components/PageSavings/useEarnAllocations";
import AppButton from "@components/AppButton";
import AppButtonSecondary from "@components/AppButtonSecondary";
import AppLink from "@components/AppLink";
import AppPageHeader from "@components/AppPageHeader";
import AppTitle from "@components/AppTitle";
import Head from "next/head";
import ReportsYearlyTable from "@components/PageReports/ReportsSavingsYearlyTable";
import SavingsRecentActivitiesTable from "@components/PageSavings/SavingsRecentActivitiesTable";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RootState, store } from "../redux/redux.store";
import { fetchLeadrate, fetchSavings } from "../redux/slices/savings.slice";
import { useConnection, useChainId } from "wagmi";
import { useRouter } from "next/router";
import { Address, isAddress, zeroAddress } from "viem";
import { useSelector } from "react-redux";
import { formatCurrency, getChain, normalizeAddress } from "@utils";
import { useAppKitNetwork } from "@reown/appkit/react";
import { ADDRESS, ChainId, ChainIdMain, ChainIdSide } from "@frankencoin/zchf";
import { mainnet } from "viem/chains";

function interestCell(row: EarnChainRow): string {
	if (row.interestStatus === "loading") return "Loading…";
	if (row.interestStatus === "error") return "Unavailable";
	if (row.interestStatus === "no_module") return "—";
	return `${formatCurrency(row.interestZchf ?? 0, 2, 2)} ZCHF`;
}

function pickerStateLabel(row: EarnChainRow): string {
	const saving = (row.savingsZchf ?? 0) > 0;
	const interest = row.interestStatus === "ready" && (row.interestZchf ?? 0) > 0;
	const wallet = row.walletZchf ?? 0;
	if (saving || interest) return "Already earning";
	if (wallet > 0) return "Ready to start";
	if (row.walletStatus === "loading") return "Loading…";
	if (row.walletStatus === "error") return "Wallet balance unavailable";
	return "No ZCHF in wallet";
}

export default function SavingsPage() {
	const { status } = useSelector((state: RootState) => state.savings.savingsInfo);
	const activities = useSelector((state: RootState) => state.savings.savingsActivity);
	const totalBalance = useSelector((state: RootState) => state.savings.savingsInfo.totalBalance);
	const { address, isConnected } = useConnection();
	const router = useRouter();
	const appKitNetwork = useAppKitNetwork();
	const walletChainId = useChainId() as ChainId;
	const walletChain = getChain(walletChainId);

	const queryAddress: Address = normalizeAddress(String(router.query.address));
	const account: Address = isAddress(queryAddress) ? queryAddress : address ?? zeroAddress;

	const {
		chainRows,
		totalEarningZchf,
		totalInterestReadyZchf,
		interestTotalsIncomplete,
		activeEarningChainCount,
		savingsLoaded,
		defaultSelectedChainId,
	} = useEarnAllocations(account);

	const [selectedChainId, setSelectedChainId] = useState<ChainId>(mainnet.id as ChainId);
	const [earnFormIntent, setEarnFormIntent] = useState<EarnFormIntent>(null);
	const chainRowRefs = useRef(new Map<ChainId, HTMLDivElement>());
	const autoIntentKeyRef = useRef("");

	const selectedMeta = getChain(selectedChainId);
	const selectedRow = chainRows.find((r) => r.chainId === selectedChainId);
	const walletOnSelected = walletChainId === selectedChainId;
	const selectedHasSavings = (selectedRow?.savingsZchf ?? 0) > 0;
	const selectedHasInterest = selectedRow?.interestStatus === "ready" && (selectedRow?.interestZchf ?? 0) > 0;
	const selectedHasWalletZchf = (selectedRow?.walletZchf ?? 0) > 0;
	const selectedIsActiveSavings = selectedHasSavings || selectedHasInterest;
	const selectedIsReadyToDeposit = !selectedIsActiveSavings && selectedHasWalletZchf;

	const savingsAddrSelected = normalizeAddress(
		selectedChainId === mainnet.id
			? ADDRESS[selectedChainId as ChainIdMain].savingsReferral
			: ADDRESS[selectedChainId as ChainIdSide].ccipBridgedSavings
	);
	const saveRateSelected = (status[selectedChainId]?.[savingsAddrSelected]?.rate ?? 0) / 10000;

	useEffect(() => {
		store.dispatch(fetchLeadrate());
		store.dispatch(fetchSavings(account === zeroAddress ? undefined : account));
	}, [account]);

	useEffect(() => {
		if (!router.isReady) return;
		const raw = router.query.chainId;
		const q = parseChainIdQuery(raw);
		if (q !== null) {
			setSelectedChainId(q);
			return;
		}
		if (raw !== undefined && String(raw) !== "") {
			setSelectedChainId(defaultSelectedChainId);
			return;
		}
		setSelectedChainId(defaultSelectedChainId);
	}, [router.isReady, router.query.chainId, defaultSelectedChainId]);

	useEffect(() => {
		const autoIntentKey = `${selectedChainId}:${walletOnSelected}:${selectedIsReadyToDeposit}`;
		if (!walletOnSelected || !selectedIsReadyToDeposit) {
			autoIntentKeyRef.current = "";
			return;
		}
		if (earnFormIntent !== null) return;
		if (autoIntentKeyRef.current === autoIntentKey) return;
		autoIntentKeyRef.current = autoIntentKey;
		setEarnFormIntent("deposit");
	}, [earnFormIntent, selectedChainId, selectedIsReadyToDeposit, walletOnSelected]);

	const setSelectedChain = useCallback(
		(id: ChainId) => {
			setSelectedChainId(id);
			void router.replace({ pathname: router.pathname, query: { ...router.query, chainId: String(id) } }, undefined, {
				shallow: true,
			});
		},
		[router]
	);

	const setChainRowRef = useCallback((id: ChainId, node: HTMLDivElement | null) => {
		if (node) {
			chainRowRefs.current.set(id, node);
		} else {
			chainRowRefs.current.delete(id);
		}
	}, []);

	const focusChainRow = useCallback((id: ChainId) => {
		requestAnimationFrame(() => {
			const row = chainRowRefs.current.get(id);
			if (!row) return;
			row.scrollIntoView({ behavior: "smooth", block: "start" });
			row.focus({ preventScroll: true });
		});
	}, []);

	const getDefaultIntentForRow = useCallback((row?: EarnChainRow): EarnFormIntent => {
		if (!row) return null;
		const hasSavings = (row.savingsZchf ?? 0) > 0;
		const hasInterest = row.interestStatus === "ready" && (row.interestZchf ?? 0) > 0;
		const hasWallet = (row.walletZchf ?? 0) > 0;
		if (hasInterest) return "collect";
		if (!hasSavings && !hasInterest && hasWallet) return "deposit";
		return null;
	}, []);

	const selectActiveChainWithIntent = useCallback(
		(id: ChainId, intent: Exclude<EarnFormIntent, null>) => {
			setEarnFormIntent(intent);
			setSelectedChain(id);
			focusChainRow(id);
		},
		[focusChainRow, setSelectedChain]
	);

	const selectChainAndFocus = useCallback(
		(id: ChainId, nextIntent: EarnFormIntent | "auto" = "auto") => {
			const row = chainRows.find((candidate) => candidate.chainId === id);
			setEarnFormIntent(nextIntent === "auto" ? getDefaultIntentForRow(row) : nextIntent);
			setSelectedChain(id);
			focusChainRow(id);
		},
		[chainRows, focusChainRow, getDefaultIntentForRow, setSelectedChain]
	);

	const handleSwitchChain = async (id: ChainId) => {
		try {
			await appKitNetwork.switchNetwork(getChain(id));
		} catch {
			/* silent cancel */
		}
	};

	const activeEarningRows = useMemo(() => {
		return [...chainRows]
			.filter((row) => (row.savingsZchf ?? 0) > 0 || (row.interestStatus === "ready" && (row.interestZchf ?? 0) > 0))
			.sort((a, b) => {
				const ai = a.interestStatus === "ready" ? (a.interestZchf ?? 0) : -1;
				const bi = b.interestStatus === "ready" ? (b.interestZchf ?? 0) : -1;
				if (bi !== ai) return bi - ai;
				return (b.savingsZchf ?? 0) - (a.savingsZchf ?? 0);
			});
	}, [chainRows]);

	const inactiveEarningRows = useMemo(() => {
		const activeIds = new Set(activeEarningRows.map((row) => row.chainId));
		return chainRows.filter((row) => !activeIds.has(row.chainId));
	}, [activeEarningRows, chainRows]);

	const summaryEarningDisplay =
		!isConnected || account === zeroAddress
			? "—"
			: !savingsLoaded
				? "Loading…"
				: `${formatCurrency(totalEarningZchf ?? 0, 2, 2)} ZCHF`;

	const summaryInterestDisplay =
		!isConnected || account === zeroAddress
			? "—"
			: interestTotalsIncomplete
				? "—"
				: `${formatCurrency(totalInterestReadyZchf ?? 0, 2, 2)} ZCHF`;

	const chainsCountLabel =
		!isConnected || account === zeroAddress
			? "—"
			: !savingsLoaded
				? "Loading…"
				: `${activeEarningChainCount} ${activeEarningChainCount === 1 ? "chain" : "chains"}`;

	const bestStartChainId = useMemo(() => {
		const sorted = [...inactiveEarningRows].sort((a, b) => (b.walletZchf ?? 0) - (a.walletZchf ?? 0));
		return sorted[0]?.chainId ?? (mainnet.id as ChainId);
	}, [inactiveEarningRows]);

	const openTransferHref = useMemo(() => {
		const params = new URLSearchParams();
		params.set("chainId", String(selectedChainId));
		if (router.query.address) params.set("address", String(router.query.address));
		return `/transfer?${params.toString()}`;
	}, [router.query.address, selectedChainId]);

	return (
		<>
			<Head>
				<title>Frankencoin - Earn</title>
			</Head>

			<div className="space-y-8">
				<AppPageHeader
					title="Earn with ZCHF"
					description="Manage where your ZCHF earns protocol interest."
				/>

				<section className="relative overflow-hidden rounded-2xl border border-[#dfd2bb] bg-[#fffaf0] p-5 shadow-sm dark:border-menu-separator dark:bg-card-body-primary md:p-6">
					<div className="pointer-events-none absolute inset-0 opacity-[0.025] [background-image:radial-gradient(#0b1f3a_0.7px,transparent_0.7px)] [background-size:6px_6px] dark:opacity-[0.04]" />
					<div className="relative space-y-4">
						<p className="text-sm text-text-secondary">
							Across the protocol, over {Math.floor(totalBalance / 1_000_000)} million ZCHF participate in savings. Your balances
							below are for this wallet.
						</p>
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
							<div className="rounded-xl border border-[#e0d4bd] bg-[#fffdf8]/95 px-4 py-4 dark:border-menu-separator dark:bg-card-content-secondary">
								<div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9b7625] dark:text-[#e5c978]">
									Total earning
								</div>
								<div className="mt-2 text-xl font-semibold text-text-primary">{summaryEarningDisplay}</div>
							</div>
							<div className="rounded-xl border border-[#e0d4bd] bg-[#fffdf8]/95 px-4 py-4 dark:border-menu-separator dark:bg-card-content-secondary">
								<div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9b7625] dark:text-[#e5c978]">
									Interest ready
								</div>
								<div className="mt-2 text-xl font-semibold text-text-primary">{summaryInterestDisplay}</div>
								{interestTotalsIncomplete ? (
									<p className="mt-1 text-xs text-text-secondary">Some chains are still updating.</p>
								) : null}
							</div>
							<div className="rounded-xl border border-[#e0d4bd] bg-[#fffdf8]/95 px-4 py-4 dark:border-menu-separator dark:bg-card-content-secondary">
								<div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9b7625] dark:text-[#e5c978]">
									Active earning chains
								</div>
								<div className="mt-2 text-xl font-semibold text-text-primary">{chainsCountLabel}</div>
							</div>
						</div>
						<p className="text-xs text-text-secondary">
							Current protocol savings rate on {selectedMeta.name}: {formatCurrency(saveRateSelected)}% per year (indicative).
						</p>
					</div>
				</section>

				<section className="space-y-3">
					<div>
						<h2 className="text-lg font-semibold text-text-primary">Your earning allocations</h2>
						<p className="mt-1 text-sm text-text-secondary">
							See where your ZCHF is earning and manage each chain when needed.
						</p>
					</div>

					{!isConnected || account === zeroAddress ? (
						<div className="rounded-xl border border-[#e0d4bd] bg-card-content-secondary px-4 py-6 text-center text-sm text-text-secondary dark:border-menu-separator">
							Connect your wallet to view earning allocations.
						</div>
					) : activeEarningRows.length === 0 ? (
						<div className="rounded-xl border border-[#e0d4bd] bg-[#fffdf8] px-4 py-8 text-center dark:border-menu-separator dark:bg-card-body-primary">
							<p className="text-text-primary font-medium">You are not earning on any ZCHF yet.</p>
							<p className="mt-2 text-sm text-text-secondary">Choose a chain below and deposit when you are ready.</p>
							<AppButton
								className="mt-4 min-h-[44px] w-full max-w-sm sm:mx-auto"
								width="w-full max-w-sm"
								onClick={() => selectChainAndFocus(bestStartChainId)}
							>
								Start earning
							</AppButton>
						</div>
					) : (
						<div className="w-full space-y-4">
							{activeEarningRows.map((row) => {
								const isSelected = selectedChainId === row.chainId;
								const interestReady =
									row.interestStatus === "ready" && (row.interestZchf ?? 0) > 0;
								const collectDisabled = !interestReady;
								const depositDisabled = (row.walletZchf ?? 0) <= 0;
								const withdrawDisabled = (row.savingsZchf ?? 0) <= 0;
								return (
									<div
										key={row.chainId}
										ref={(node) => setChainRowRef(row.chainId, node)}
										tabIndex={-1}
										className="outline-none"
									>
										<div className="w-full rounded-2xl border border-[#e0d4bd] bg-[#fffdf8] p-5 shadow-sm dark:border-menu-separator dark:bg-card-content-secondary md:p-6">
											<div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
												<div className="min-w-0 flex-1 space-y-3">
													<div className="text-lg font-semibold text-text-primary">{row.name}</div>
													<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-10 sm:gap-y-2">
														<div>
															<div className="text-xs font-medium uppercase tracking-wide text-text-secondary">
																Earning
															</div>
															<div className="mt-1 text-base font-semibold tabular-nums text-text-primary">
																{formatCurrency(row.savingsZchf ?? 0, 2, 2)} ZCHF
															</div>
														</div>
														<div>
															<div className="text-xs font-medium uppercase tracking-wide text-text-secondary">
																Interest ready
															</div>
															<div className="mt-1 text-base font-semibold tabular-nums text-text-primary">
																{interestCell(row)}
															</div>
														</div>
													</div>
												</div>
												<div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto lg:flex-shrink-0 lg:justify-end">
													<AppButtonSecondary
														className="min-h-[44px] w-full sm:min-w-[7.5rem] sm:flex-1 lg:w-36 lg:flex-none"
														width="w-full sm:flex-1 lg:w-36"
														disabled={collectDisabled}
														onClick={() => selectActiveChainWithIntent(row.chainId, "collect")}
													>
														Collect
													</AppButtonSecondary>
													<AppButtonSecondary
														className="min-h-[44px] w-full sm:min-w-[7.5rem] sm:flex-1 lg:w-36 lg:flex-none"
														width="w-full sm:flex-1 lg:w-36"
														disabled={depositDisabled}
														onClick={() => selectActiveChainWithIntent(row.chainId, "deposit")}
													>
														Deposit
													</AppButtonSecondary>
													<AppButtonSecondary
														className="min-h-[44px] w-full sm:min-w-[7.5rem] sm:flex-1 lg:w-36 lg:flex-none"
														width="w-full sm:flex-1 lg:w-36"
														disabled={withdrawDisabled}
														onClick={() => selectActiveChainWithIntent(row.chainId, "withdraw")}
													>
														Withdraw
													</AppButtonSecondary>
												</div>
											</div>
											{isSelected ? (
												<div className="mt-6 border-t border-[#eadfcd] pt-6 dark:border-menu-separator">
													<ActiveEarnChainPanel
														row={row}
														account={account}
														isConnected={isConnected}
														walletChain={walletChain}
														walletChainId={walletChainId}
														earnFormIntent={earnFormIntent}
														onConsumeEarnFormIntent={() => setEarnFormIntent(null)}
														onSwitchChain={() => handleSwitchChain(row.chainId)}
													/>
												</div>
											) : null}
										</div>
									</div>
								);
							})}
						</div>
					)}
				</section>

				<section className="space-y-3 rounded-2xl border border-[#e8dcc8] bg-[#fffdf9] p-5 dark:border-menu-separator dark:bg-card-body-primary md:p-6">
					<h2 className="text-lg font-semibold text-text-primary">Start earning on another chain</h2>
					<p className="text-sm text-text-secondary">Choose where you want new ZCHF savings to earn.</p>
					{inactiveEarningRows.length === 0 ? (
						<div className="mt-3 rounded-xl border border-[#e0d4bd] bg-card-content-secondary px-4 py-5 text-sm text-text-secondary dark:border-menu-separator">
							You are already earning on every supported chain.
						</div>
					) : (
					<div className="mt-3 space-y-2">
						{inactiveEarningRows.map((row) => {
							const isSelected = selectedChainId === row.chainId;
							return (
								<div
									key={row.chainId}
									ref={(node) => setChainRowRef(row.chainId, node)}
									tabIndex={-1}
									className="outline-none"
								>
									<button
										type="button"
										onClick={() => selectChainAndFocus(row.chainId)}
										className={`flex w-full flex-col gap-1 rounded-xl border px-4 py-3 text-left text-sm transition md:flex-row md:items-center md:justify-between ${
											isSelected
												? "rounded-b-none border-[#c4a75f] bg-[#f4ead4]/80 dark:border-[#8a7448] dark:bg-[#242b38]"
												: "border-[#e0d4bd] bg-card-content-secondary hover:border-[#c4a75f]/70 dark:border-menu-separator"
										}`}
									>
										<div className="font-semibold text-text-primary">{row.name}</div>
										<div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary md:text-sm">
											<span>
												Wallet ZCHF:{" "}
												{row.walletStatus === "loaded"
													? `${formatCurrency(row.walletZchf ?? 0, 2, 2)}`
													: row.walletStatus === "loading"
														? "…"
														: row.walletStatus === "error"
															? "—"
															: "—"}
											</span>
											<span>Currently earning: {formatCurrency(row.savingsZchf ?? 0, 2, 2)}</span>
											<span>Interest ready: {interestCell(row)}</span>
											<span className="font-medium text-[#80601d] dark:text-[#e5c978]">{pickerStateLabel(row)}</span>
										</div>
									</button>
									{isSelected ? (
										<InactiveEarnChainPanel
											row={row}
											account={account}
											isConnected={isConnected}
											walletChain={walletChain}
											walletChainId={walletChainId}
											openTransferHref={openTransferHref}
											onSwitchChain={() => handleSwitchChain(row.chainId)}
										/>
									) : null}
								</div>
							);
						})}
					</div>
					)}
				</section>

				<div className="text-sm text-text-secondary">
					Alternatively, you can earn yield by lending on{" "}
					<AppLink
						label="Morpho"
						href="https://app.morpho.org/ethereum/earn?assetIdsFilter=ecc8bd13-eab5-4c7b-97e1-ba23d58f8cd3"
						external
						className=""
					/>
					.
				</div>

				<AppTitle title="Yearly Accounts">
					<div className="text-text-secondary text-sm">
						Yearly interest income for this account. See also the <AppLink className="" label="report page" href="/report" />.
					</div>
				</AppTitle>
				<ReportsYearlyTable activity={account === zeroAddress ? [] : activities} />

				<AppTitle title="Your latest activities" />
				<p className="text-xs text-text-secondary">Showing activity for {selectedMeta.name}.</p>
				<SavingsRecentActivitiesTable filterChainId={selectedChainId} />
			</div>
		</>
	);
}

function ActiveEarnChainPanel({
	row,
	account,
	isConnected,
	walletChain,
	walletChainId,
	earnFormIntent,
	onConsumeEarnFormIntent,
	onSwitchChain,
}: {
	row: EarnChainRow;
	account: Address;
	isConnected: boolean;
	walletChain: { name: string };
	walletChainId: ChainId;
	earnFormIntent: EarnFormIntent;
	onConsumeEarnFormIntent: () => void;
	onSwitchChain: () => void;
}) {
	const walletOnSelected = walletChainId === row.chainId;

	if (!isConnected || account === zeroAddress) {
		return (
			<div className="w-full rounded-xl border border-[#e0d4bd] bg-card-content-secondary p-5 dark:border-menu-separator md:p-6">
				<p className="text-sm text-text-secondary">Connect your wallet to manage earning on {row.name}.</p>
			</div>
		);
	}

	if (!walletOnSelected) {
		return (
			<div className="w-full space-y-4 rounded-xl border border-[#e0d4bd] bg-card-content-secondary p-5 dark:border-menu-separator md:p-6">
				<p className="text-sm text-text-secondary">
					Your wallet is currently connected to{" "}
					<span className="font-medium text-text-primary">{walletChain.name}</span>.
				</p>
				<p className="text-sm font-medium text-text-primary">Switch to {row.name} to manage.</p>
				<AppButton className="min-h-[48px] w-full sm:w-auto" width="w-full sm:w-auto" onClick={onSwitchChain}>
					Switch to {row.name}
				</AppButton>
			</div>
		);
	}

	return (
		<div className="w-full">
			<SavingsInteractionCard
				earnFormIntent={earnFormIntent}
				onConsumeEarnFormIntent={onConsumeEarnFormIntent}
				lockChainSelector
			/>
		</div>
	);
}

function InactiveEarnChainPanel({
	row,
	account,
	isConnected,
	walletChain,
	walletChainId,
	openTransferHref,
	onSwitchChain,
}: {
	row: EarnChainRow;
	account: Address;
	isConnected: boolean;
	walletChain: { name: string };
	walletChainId: ChainId;
	openTransferHref: string;
	onSwitchChain: () => void;
}) {
	const walletOnSelected = walletChainId === row.chainId;
	const hasWalletZchf = (row.walletZchf ?? 0) > 0;
	const statusLine = hasWalletZchf
		? `Ready to start earning on ${row.name}.`
		: `Add ZCHF on ${row.name} to start earning.`;

	if (!isConnected || account === zeroAddress) {
		return (
			<div className="rounded-b-xl border border-t-0 border-[#c4a75f] bg-card-content-secondary p-4 dark:border-[#8a7448] md:p-5">
				<p className="text-sm text-text-secondary">Connect your wallet to view funding options for {row.name}.</p>
			</div>
		);
	}

	if (!walletOnSelected) {
		return (
			<div className="space-y-4 rounded-b-xl border border-t-0 border-[#c4a75f] bg-card-content-secondary p-4 dark:border-[#8a7448] md:p-5">
				<p className="text-sm text-text-secondary">
					Your wallet is currently connected to{" "}
					<span className="font-medium text-text-primary">{walletChain.name}</span>.
				</p>
				<p className="text-sm font-medium text-text-primary">Switch to {row.name} to fund this chain.</p>
				<AppButton className="min-h-[48px] w-full sm:w-auto" width="w-full sm:w-auto" onClick={onSwitchChain}>
					Switch to {row.name}
				</AppButton>
			</div>
		);
	}

	return (
		<div className="rounded-b-xl border border-t-0 border-[#c4a75f] bg-card-content-secondary p-4 shadow-sm dark:border-[#8a7448] md:p-5">
			<FundingActions statusLine={statusLine} openTransferHref={openTransferHref} />
		</div>
	);
}

function FundingActions({ statusLine, openTransferHref }: { statusLine: string; openTransferHref: string }) {
	return (
		<div className="space-y-4">
			<p className="text-sm font-medium text-text-secondary">{statusLine}</p>
			<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
				<AppButtonSecondary className="min-h-[44px]" width="w-full sm:w-auto" to={openTransferHref}>
					Open Transfer
				</AppButtonSecondary>
				<AppButtonSecondary className="min-h-[44px] opacity-60" width="w-full sm:w-auto" disabled>
					Buy with bank — Coming soon
				</AppButtonSecondary>
				<AppButtonSecondary className="min-h-[44px] opacity-60" width="w-full sm:w-auto" disabled>
					Buy on DEX — Coming soon
				</AppButtonSecondary>
			</div>
		</div>
	);
}
