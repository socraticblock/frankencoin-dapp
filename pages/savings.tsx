import type { EarnFormIntent } from "@components/PageSavings/earn/earnTypes";
import { useEarnAllocations, EarnChainRow, parseChainIdQuery } from "@components/PageSavings/useEarnAllocations";
import EarnSummaryCards from "@components/PageSavings/page/EarnSummaryCards";
import ActiveEarningSection from "@components/PageSavings/page/ActiveEarningSection";
import InactiveEarningSection from "@components/PageSavings/page/InactiveEarningSection";
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
	const hasWallet = Boolean(isConnected && account !== zeroAddress);

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
		const hasMeaningfulWallet = (row.walletZchf ?? 0) >= 0.01;
		if (hasInterest) return "collect";
		if (!hasSavings && hasMeaningfulWallet) return "deposit";
		if (hasSavings && hasMeaningfulWallet) return "deposit";
		if (hasSavings) return "withdraw";
		return null;
	}, []);

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
				const ai = a.interestStatus === "ready" ? a.interestZchf ?? 0 : -1;
				const bi = b.interestStatus === "ready" ? b.interestZchf ?? 0 : -1;
				if (bi !== ai) return bi - ai;
				return (b.savingsZchf ?? 0) - (a.savingsZchf ?? 0);
			});
	}, [chainRows]);

	const inactiveEarningRows = useMemo(() => {
		const activeIds = new Set(activeEarningRows.map((row) => row.chainId));
		return chainRows.filter((row) => !activeIds.has(row.chainId));
	}, [activeEarningRows, chainRows]);

	const summaryEarningDisplay = !hasWallet ? "—" : !savingsLoaded ? "Loading…" : `${formatCurrency(totalEarningZchf ?? 0, 2, 2)} ZCHF`;

	const summaryInterestDisplay = !hasWallet
		? "—"
		: interestTotalsIncomplete
		? "—"
		: `${formatCurrency(totalInterestReadyZchf ?? 0, 2, 2)} ZCHF`;

	const chainsCountLabel = !hasWallet
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
				<AppPageHeader title="Earn with ZCHF" description="Manage where your ZCHF earns protocol interest." />

				<EarnSummaryCards
					totalBalanceHuman={totalBalance}
					summaryEarningDisplay={summaryEarningDisplay}
					summaryInterestDisplay={summaryInterestDisplay}
					interestTotalsIncomplete={interestTotalsIncomplete}
					chainsCountLabel={chainsCountLabel}
					selectedChainName={selectedMeta.name}
					saveRatePercent={saveRateSelected}
				/>

				<ActiveEarningSection
					activeEarningRows={activeEarningRows}
					selectedChainId={selectedChainId}
					setChainRowRef={setChainRowRef}
					onSelectChain={(id) => selectChainAndFocus(id)}
					account={account}
					isConnected={isConnected}
					walletChain={walletChain}
					walletChainId={walletChainId}
					earnFormIntent={earnFormIntent}
					onConsumeEarnFormIntent={() => setEarnFormIntent(null)}
					onSwitchChain={handleSwitchChain}
					bestStartChainId={bestStartChainId}
				/>

				<InactiveEarningSection
					inactiveEarningRows={inactiveEarningRows}
					selectedChainId={selectedChainId}
					setChainRowRef={setChainRowRef}
					onSelectChain={(id) => selectChainAndFocus(id)}
					account={account}
					isConnected={isConnected}
					walletChain={walletChain}
					walletChainId={walletChainId}
					openTransferHref={openTransferHref}
					onSwitchChain={handleSwitchChain}
				/>

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

				{!hasWallet ? (
					<>
						<AppTitle title="Yearly Accounts">
							<div className="text-text-secondary text-sm">Connect wallet to view yearly savings records.</div>
						</AppTitle>
						<div className="rounded-xl border border-dashed border-menu-separator p-4 text-sm text-text-secondary">
							Connect your wallet to see savings balances, interest collected, and year-end records.
						</div>

						<AppTitle title="Your latest activities" />
						<div className="rounded-xl border border-dashed border-menu-separator p-4 text-sm text-text-secondary">
							Connect your wallet to view recent savings activity.
						</div>
					</>
				) : (
					<>
						<AppTitle title="Yearly Accounts">
							<div className="text-text-secondary text-sm">
								Yearly interest income for this account. See also the{" "}
								<AppLink className="" label="report page" href="/report" />.
							</div>
						</AppTitle>
						<ReportsYearlyTable activity={activities} />

						<AppTitle title="Your latest activities" />
						<p className="text-xs text-text-secondary">Showing activity for {selectedMeta.name}.</p>
						<SavingsRecentActivitiesTable filterChainId={selectedChainId} />
					</>
				)}
			</div>
		</>
	);
}
