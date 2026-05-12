import { useSelector } from "react-redux";
import { RootState } from "../../redux/redux.store";
import Table from "@components/Table";
import TableHeader from "@components/Table/TableHead";
import TableBody from "@components/Table/TableBody";
import TableRowEmpty from "@components/Table/TableRowEmpty";
import { useConnection } from "wagmi";
import { Address, formatUnits, isAddress, zeroAddress } from "viem";
import { normalizeAddress } from "../../utils/format";
import { BidsQueryItem, ChallengesId, ChallengesQueryItemMapping, PositionQuery, PositionsQueryObjectArray } from "@frankencoin/api";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import MyPositionsBidsRow from "./MyPositionsBidsRow";

export default function MyPositionsBidsTable() {
	const headers: string[] = ["Filled Size", "Price", "Bid Amount", "State"];
	const [tab, setTab] = useState<string>(headers[0]);
	const [reverse, setReverse] = useState<boolean>(false);
	const [list, setList] = useState<BidsQueryItem[]>([]);

	const bids = useSelector((state: RootState) => state.bids.list.list);
	const challenges = useSelector((state: RootState) => state.challenges.mapping.map);
	const positions = useSelector((state: RootState) => state.positions.mapping.map);

	const router = useRouter();
	const overwrite = router.query.address as Address;

	const { address } = useConnection();
	const account = overwrite || address || zeroAddress;

	const normalizedAccount = safeNormalizeAddress(account);
	const matchingBids = normalizedAccount ? bids.filter((b) => safeNormalizeAddress(b.bidder) === normalizedAccount) : [];
	const safeBids = matchingBids.filter((b) => {
		const pid = safeNormalizeAddress(b.position);
		if (!pid) return false;

		const position = positions[pid];
		if (!hasRenderablePosition(position)) return false;

		const cid = `${pid}-challenge-${b.number}` as ChallengesId;
		return Boolean(challenges[cid]);
	});

	const sorted: BidsQueryItem[] = sortBids({
		bids: safeBids,
		challenges,
		positions,
		headers,
		tab,
		reverse,
	});

	useEffect(() => {
		const idList = list.map((l) => l.position).join("_");
		const idSorted = sorted.map((l) => l.position).join("_");
		if (idList != idSorted) setList(sorted);
	}, [list, sorted]);

	const handleTabOnChange = function (e: string) {
		if (tab === e) {
			setReverse(!reverse);
		} else {
			setReverse(false);
			setTab(e);
		}
	};

	return (
		<Table>
			<TableHeader headers={headers} tab={tab} reverse={reverse} tabOnChange={handleTabOnChange} actionCol />
			<TableBody>
				{list.length == 0 ? (
					<TableRowEmpty>{"You do not have any bids yet."}</TableRowEmpty>
				) : (
					list.map((b) => <MyPositionsBidsRow key={b.id} headers={headers} tab={tab} bid={b} />)
				)}
			</TableBody>
		</Table>
	);
}

type SortBids = {
	bids: BidsQueryItem[];
	challenges: ChallengesQueryItemMapping;
	positions: PositionsQueryObjectArray;
	headers: string[];
	tab: string;
	reverse: boolean;
};

function sortBids(params: SortBids): BidsQueryItem[] {
	const { bids, challenges, positions, headers, tab, reverse } = params;
	const sortedBids = [...bids];

	if (tab === headers[0]) {
		// Filled Size
		sortedBids.sort((a, b) => {
			const calc = function (b: BidsQueryItem) {
				const pid = safeNormalizeAddress(b.position);
				const pos: PositionQuery | undefined = pid ? positions[pid] : undefined;
				if (!hasRenderablePosition(pos)) return Number.NEGATIVE_INFINITY;

				const size: number = parseFloat(formatUnits(b.filledSize, pos.collateralDecimals));
				const price: number = parseFloat(formatUnits(b.price, 36 - pos.collateralDecimals));
				return size * price;
			};
			return calc(b) - calc(a);
		});
	} else if (tab === headers[1]) {
		// Price
		sortedBids.sort((a, b) => {
			const calc = function (b: BidsQueryItem) {
				const pid = safeNormalizeAddress(b.position);
				const pos: PositionQuery | undefined = pid ? positions[pid] : undefined;
				if (!hasRenderablePosition(pos)) return Number.NEGATIVE_INFINITY;

				return parseFloat(formatUnits(b.price, 36 - pos.collateralDecimals));
			};
			return calc(b) - calc(a);
		});
	} else if (tab === headers[2]) {
		// Bid Amount
		sortedBids.sort((a, b) => {
			const calc = function (b: BidsQueryItem) {
				return parseFloat(formatUnits(b.bid, 18));
			};
			return calc(b) - calc(a);
		});
	} else if (tab === headers[3]) {
		// Type
		sortedBids.sort((a, b) => a.bidType.localeCompare(b.bidType));
	}

	return reverse ? sortedBids.reverse() : sortedBids;
}

function safeNormalizeAddress(address?: string): Address | undefined {
	if (!address || !isAddress(address)) return undefined;

	try {
		return normalizeAddress(address);
	} catch {
		return undefined;
	}
}

function hasRenderablePosition(position?: PositionQuery): position is PositionQuery {
	return (
		position != undefined &&
		typeof position.collateralDecimals === "number" &&
		typeof position.collateralSymbol === "string" &&
		position.collateralSymbol.length > 0
	);
}
