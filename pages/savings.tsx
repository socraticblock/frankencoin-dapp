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
import { useCallback, useEffect, useMemo, useState } from "react";
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
	const wallet = row.walletZchf ?? 0;
	if (saving) return "Already earning";
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
		supportedChains,
		chainRows,
		activeAllocationRows,
		totalEarningZchf,
		totalInterestReadyZchf,
		interestTotalsIncomplete,
		activeEarningChainCount,
		savingsLoaded,
		defaultSelectedChainId,
	} = useEarnAllocations(account);

	const [selectedChainId, setSelectedChainId] = useState<ChainId>(mainnet.id as ChainId);
	const [earnFormIntent, setEarnFormIntent] = useState<EarnFormIntent>(null);

	const selectedMeta = getChain(selectedChainId);
	const selectedRow = chainRows.find((r) => r.chainId === selectedChainId);
	const walletOnSelected = walletChainId === selectedChainId;

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

	const setSelectedChain = useCallback(
		(id: ChainId) => {
			setSelectedChainId(id);
			void router.replace({ pathname: router.pathname, query: { ...router.query, chainId: String(id) } }, undefined, {
				shallow: true,
			});
		},
		[router]
	);

	const handleSwitchToSelected = async () => {
		try {
			await appKitNetwork.switchNetwork(getChain(selectedChainId));
		} catch {
			/* silent cancel */
		}
	};

	const useLedgerLayout = activeAllocationRows.length >= 3;

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
		const sorted = [...chainRows].sort((a, b) => (b.walletZchf ?? 0) - (a.walletZchf ?? 0));
		return sorted[0]?.chainId ?? (mainnet.id as ChainId);
	}, [chainRows]);

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
					) : activeAllocationRows.length === 0 ? (
						<div className="rounded-xl border border-[#e0d4bd] bg-[#fffdf8] px-4 py-8 text-center dark:border-menu-separator dark:bg-card-body-primary">
							<p className="text-text-primary font-medium">You are not earning on any ZCHF yet.</p>
							<p className="mt-2 text-sm text-text-secondary">Choose a chain below and deposit when you are ready.</p>
							<AppButton
								className="mt-4 min-h-[44px] w-full max-w-sm sm:mx-auto"
								width="w-full max-w-sm"
								onClick={() => setSelectedChain(bestStartChainId)}
							>
								Start earning
							</AppButton>
						</div>
					) : useLedgerLayout ? (
						<div className="overflow-hidden rounded-xl border border-[#e0d4bd] dark:border-menu-separator">
							<div className="hidden grid-cols-[1.1fr_1fr_1fr_auto] gap-2 border-b border-[#eadfcd] bg-[#f7f0e4] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-secondary md:grid dark:border-menu-separator dark:bg-card-content-secondary">
								<span>Chain</span>
								<span className="text-right md:text-left">Earning</span>
								<span className="text-right md:text-left">Interest ready</span>
								<span className="text-right"> </span>
							</div>
							<div className="divide-y divide-[#eadfcd] dark:divide-menu-separator">
								{activeAllocationRows.map((row) => (
									<div
										key={row.chainId}
										className="grid grid-cols-1 gap-3 px-3 py-3 text-sm md:grid-cols-[1.1fr_1fr_1fr_auto] md:items-center"
									>
										<div className="font-semibold text-text-primary">{row.name}</div>
										<div>
											<span className="text-xs text-text-secondary md:hidden">Earning · </span>
											<span className="font-medium">{formatCurrency(row.savingsZchf ?? 0, 2, 2)} ZCHF</span>
										</div>
										<div>
											<span className="text-xs text-text-secondary md:hidden">Interest · </span>
											<span className="font-medium text-text-primary">{interestCell(row)}</span>
										</div>
										<div className="flex flex-col gap-2 md:items-end">
											<AppButtonSecondary
												size="small"
												className="min-h-[40px] w-full md:w-auto"
												onClick={() => setSelectedChain(row.chainId)}
											>
												Manage
											</AppButtonSecondary>
										</div>
									</div>
								))}
							</div>
						</div>
					) : (
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							{activeAllocationRows.map((row) => (
								<div
									key={row.chainId}
									className="rounded-xl border border-[#e0d4bd] bg-[#fffdf8] p-4 shadow-sm dark:border-menu-separator dark:bg-card-content-secondary"
								>
									<div className="text-base font-semibold text-text-primary">{row.name}</div>
									<div className="mt-3 space-y-1 text-sm">
										<div>
											<span className="text-text-secondary">Earning · </span>
											<span className="font-medium">{formatCurrency(row.savingsZchf ?? 0, 2, 2)} ZCHF</span>
										</div>
										<div>
											<span className="text-text-secondary">Interest ready · </span>
											<span className="font-medium">{interestCell(row)}</span>
										</div>
									</div>
									<div className="mt-4 flex flex-col gap-2">
										{walletChainId === row.chainId ? (
											<>
												<AppButtonSecondary
													className="min-h-[44px] w-full"
													width="w-full"
													onClick={() => {
														setSelectedChain(row.chainId);
														setEarnFormIntent("collect");
													}}
												>
													Collect interest
												</AppButtonSecondary>
												<AppButtonSecondary
													className="min-h-[44px] w-full"
													width="w-full"
													onClick={() => {
														setSelectedChain(row.chainId);
														setEarnFormIntent("deposit");
													}}
												>
													Deposit more
												</AppButtonSecondary>
												<AppButtonSecondary
													className="min-h-[44px] w-full"
													width="w-full"
													onClick={() => {
														setSelectedChain(row.chainId);
														setEarnFormIntent("withdraw");
													}}
												>
													Withdraw
												</AppButtonSecondary>
											</>
										) : (
											<AppButtonSecondary
												className="min-h-[44px] w-full"
												width="w-full"
												onClick={async () => {
													setSelectedChain(row.chainId);
													try {
														await appKitNetwork.switchNetwork(getChain(row.chainId));
													} catch {
														/* silent */
													}
												}}
											>
												Switch to {row.name} to manage
											</AppButtonSecondary>
										)}
									</div>
								</div>
							))}
						</div>
					)}
				</section>

				<section className="space-y-3 rounded-2xl border border-[#e8dcc8] bg-[#fffdf9] p-5 dark:border-menu-separator dark:bg-card-body-primary md:p-6">
					<h2 className="text-lg font-semibold text-text-primary">Start earning on another chain</h2>
					<p className="text-sm text-text-secondary">Choose where your ZCHF should earn.</p>
					<div className="mt-3 space-y-2">
						{supportedChains.map((c) => {
							const row = chainRows.find((r) => r.chainId === c.id)!;
							return (
								<button
									key={c.id}
									type="button"
									onClick={() => setSelectedChain(c.id as ChainId)}
									className={`flex w-full flex-col gap-1 rounded-xl border px-4 py-3 text-left text-sm transition md:flex-row md:items-center md:justify-between ${
										selectedChainId === c.id
											? "border-[#c4a75f] bg-[#f4ead4]/80 dark:border-[#8a7448] dark:bg-[#242b38]"
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
							);
						})}
					</div>
				</section>

				<section className="space-y-4 rounded-2xl border border-[#e0d4bd] bg-card-content-secondary p-5 dark:border-menu-separator md:p-6">
					<div>
						<h2 className="text-lg font-semibold text-text-primary">{selectedMeta.name} earning</h2>
						{selectedRow ? (
							<div className="mt-2 space-y-1 text-sm text-text-secondary">
								<p>
									You have {formatCurrency(selectedRow.savingsZchf ?? 0, 2, 2)} ZCHF earning on {selectedMeta.name}.
								</p>
								{selectedRow.interestStatus === "ready" ? (
									<p className="text-text-primary">
										{formatCurrency(selectedRow.interestZchf ?? 0, 2, 2)} ZCHF interest is ready to collect.
									</p>
								) : selectedRow.interestStatus === "loading" ? (
									<p>Interest on this chain is loading.</p>
								) : selectedRow.interestStatus === "error" ? (
									<p>Interest on this chain is temporarily unavailable.</p>
								) : null}
								<p>
									Your wallet is currently connected to <span className="font-medium text-text-primary">{walletChain.name}</span>.
								</p>
							</div>
						) : null}
					</div>

					{!isConnected || account === zeroAddress ? (
						<p className="text-sm text-text-secondary">Connect your wallet to manage earning on {selectedMeta.name}.</p>
					) : walletOnSelected ? (
						<>
							<p className="text-sm font-medium text-text-success">Ready to manage on {selectedMeta.name}.</p>
							<SavingsInteractionCard
								earnFormIntent={earnFormIntent}
								onConsumeEarnFormIntent={() => setEarnFormIntent(null)}
							/>
						</>
					) : (
						<div className="space-y-4">
							{(selectedRow?.walletZchf ?? 0) > 0 ? (
								<p className="text-sm text-text-secondary">
									You have {formatCurrency(selectedRow!.walletZchf ?? 0, 2, 2)} ZCHF in your wallet on {selectedMeta.name}.
									Switch networks to deposit into earning or adjust savings.
								</p>
							) : (
								<p className="text-sm text-text-secondary">You do not have ZCHF on this chain yet.</p>
							)}
							<AppButton className="min-h-[48px] w-full sm:w-auto" width="w-full sm:w-auto" onClick={handleSwitchToSelected}>
								Switch to {selectedMeta.name} to manage
							</AppButton>
							{(selectedRow?.walletZchf ?? 0) <= 0 ? (
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
							) : null}
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
