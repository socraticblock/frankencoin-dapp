import TableHeader from "../Table/TableHead";
import TableBody from "../Table/TableBody";
import Table from "../Table";
import TableRowEmpty from "../Table/TableRowEmpty";
import { useEffect, useMemo, useState } from "react";
import TransferListRow from "./TransferListRow";
import AppCard from "@components/AppCard";
import DateInput from "@components/Input/DateInput";
import { useConnection } from "wagmi";
import { WAGMI_CHAINS } from "../../app.config";
import AppButtonSecondary from "@components/AppButtonSecondary";
import { ChainId } from "@frankencoin/zchf";
import { shortenAddress } from "@utils";
import { useWalletTransferHistory } from "@hooks";
import {
	orderedZchfBalanceChainNames,
	sortTransferHistory,
	TRANSFER_HISTORY_HEADERS,
	transferDirection,
	transferIsBridge,
} from "./transferShared";

const RESET_DATE = new Date(new Date().getUTCFullYear().toString());
const PAGE_SIZE = 25;

type HistoryTypeFilter = "all" | "transfer" | "bridge";
type DirectionFilter = "all" | "sent" | "received";

export default function TransferListTable() {
	const headers = useMemo(() => [...TRANSFER_HISTORY_HEADERS], []);
	const [tab, setTab] = useState<string>(headers[0]);
	const [reverse, setReverse] = useState<boolean>(false);
	const { address } = useConnection();
	const [start, setStart] = useState<Date>(RESET_DATE);
	const [end, setEnd] = useState<Date | "Today">("Today");
	const [typeFilter, setTypeFilter] = useState<HistoryTypeFilter>("all");
	const [directionFilter, setDirectionFilter] = useState<DirectionFilter>("all");
	const [chainFilter, setChainFilter] = useState<string>("all");
	const [visibleRows, setVisibleRows] = useState<number>(PAGE_SIZE);

	const { walletHistory, isLoading } = useWalletTransferHistory(address, start, end);

	const chainFilterOptions = useMemo(
		() => [{ value: "all", label: "All" }, ...orderedZchfBalanceChainNames(WAGMI_CHAINS).map((name) => ({ value: name, label: name }))],
		[]
	);

	const filtered = useMemo(() => {
		if (!address) return [];
		return walletHistory.filter((item) => {
			const isBridge = transferIsBridge(item);
			const direction = transferDirection(item, address);
			const chainName = WAGMI_CHAINS.find((c) => c.id === (item.chainId as ChainId))?.name ?? "Unknown";

			if (typeFilter === "bridge" && !isBridge) return false;
			if (typeFilter === "transfer" && isBridge) return false;
			if (directionFilter !== "all" && direction !== directionFilter) return false;
			if (chainFilter !== "all" && chainName !== chainFilter) return false;
			return true;
		});
	}, [address, chainFilter, directionFilter, typeFilter, walletHistory]);

	const sorted = useMemo(
		() => sortTransferHistory(filtered, tab, reverse, address ?? ""),
		[address, filtered, reverse, tab]
	);
	const visible = sorted.slice(0, visibleRows);
	const canLoadMore = sorted.length > visible.length;

	useEffect(() => {
		setVisibleRows(PAGE_SIZE);
	}, [typeFilter, directionFilter, chainFilter, start, end, address]);

	const handleTabOnChange = (nextTab: string) => {
		if (tab === nextTab) setReverse((r) => !r);
		else {
			setReverse(false);
			setTab(nextTab);
		}
	};

	if (!address) {
		return (
			<AppCard>
				<div className="px-2 py-2 text-sm text-text-secondary">Connect your wallet to see your transfer history.</div>
			</AppCard>
		);
	}

	return (
		<div className="grid gap-4">
			<AppCard>
				<div className="mb-3 text-sm text-text-secondary">Showing ZCHF transfers sent or received by {shortenAddress(address)}.</div>
				<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
					<div>
						<label className="mb-1 block text-sm text-text-secondary">Date range</label>
						<div className="grid grid-cols-2 gap-2">
							<DateInput label="From date" value={start} onChange={(d) => d && setStart(d)} />
							<DateInput
								label="To date"
								value={end === "Today" ? new Date() : (end as Date)}
								onChange={(d) => {
									if (d) {
										const dateWithZeroTime = new Date(d);
										dateWithZeroTime.setUTCHours(0, 0, 0, 0);
										setEnd(dateWithZeroTime);
									}
								}}
								output={end === "Today" ? end : undefined}
								reset={end === "Today" ? undefined : new Date()}
								onReset={() => setEnd("Today")}
							/>
						</div>
					</div>
					<SelectFilter
						label="Type"
						value={typeFilter}
						onChange={(value) => setTypeFilter(value as HistoryTypeFilter)}
						options={[
							{ value: "all", label: "All" },
							{ value: "transfer", label: "Transfer" },
							{ value: "bridge", label: "Bridge" },
						]}
					/>
					<SelectFilter label="Chain" value={chainFilter} onChange={setChainFilter} options={chainFilterOptions} />
					<SelectFilter
						label="Direction"
						value={directionFilter}
						onChange={(value) => setDirectionFilter(value as DirectionFilter)}
						options={[
							{ value: "all", label: "All" },
							{ value: "sent", label: "Sent" },
							{ value: "received", label: "Received" },
						]}
					/>
				</div>
			</AppCard>

			<Table>
				<TableHeader headers={headers} tab={tab} reverse={reverse} tabOnChange={handleTabOnChange} />
				<TableBody>
					{isLoading ? (
						<TableRowEmpty>{"Loading your transfers..."}</TableRowEmpty>
					) : visible.length === 0 ? (
						<TableRowEmpty>{"No transfers found for this wallet and filters."}</TableRowEmpty>
					) : (
						visible.map((item) => (
							<TransferListRow
								headers={headers}
								tab={tab}
								key={`${item.chainId}-${item.count}-${item.txHash}`}
								item={item}
								connectedAddress={address}
							/>
						))
					)}
				</TableBody>
			</Table>

			{canLoadMore ? (
				<div className="flex justify-center">
					<AppButtonSecondary width="w-auto" onClick={() => setVisibleRows((prev) => prev + PAGE_SIZE)}>
						Load more
					</AppButtonSecondary>
				</div>
			) : null}
		</div>
	);
}

type SelectFilterOption = { value: string; label: string };

function SelectFilter({
	label,
	value,
	onChange,
	options,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	options: SelectFilterOption[];
}) {
	return (
		<div>
			<label className="mb-1 block text-sm text-text-secondary">{label}</label>
			<select
				value={value}
				onChange={(event) => onChange(event.target.value)}
				className="w-full rounded-lg border border-menu-separator bg-card-content-primary px-3 py-2 text-sm text-text-primary"
			>
				{options.map((option) => (
					<option key={`${label}-${option.value}`} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
		</div>
	);
}
