import AppLink from "@components/AppLink";
import ChainLogo from "@components/ChainLogo";
import TableRow from "@components/Table/TableRow";
import { TransferReferenceQuery } from "@frankencoin/api";
import { ChainId } from "@frankencoin/zchf";
import { ContractUrl, formatCurrency, getChain, getChainByChainSelector, shortenAddress, TxUrl } from "@utils";
import { transferIsBridge } from "./transferShared";
import { formatUnits, Hash } from "viem";

interface Props {
	headers: string[];
	tab: string;
	item: TransferReferenceQuery;
	connectedAddress: string;
}

export default function TransferListRow({ headers, tab, item, connectedAddress }: Props) {
	const dateArr: string[] = new Date(item.created * 1000).toDateString().split(" ");
	const dateStr: string = `${dateArr[2]} ${dateArr[1]} ${dateArr[3]}`;

	const sourceChain = getChain(item.chainId as ChainId);
	const targetChain = getChainByChainSelector(item.targetChain);
	const isBridge = transferIsBridge(item);
	const normalizedConnected = connectedAddress.toLowerCase();
	const isSent = item.from.toLowerCase() === normalizedConnected;
	const direction = isSent ? "Sent" : "Received";
	const counterparty = isSent ? item.to : item.from;
	const route = isBridge ? `${sourceChain.name} → ${targetChain.name}` : sourceChain.name;
	const status = isBridge ? "In progress" : "Completed";

	return (
		<>
			<TableRow headers={headers} tab={tab} rawHeader={true}>
				<div className="flex flex-col md:text-left max-md:text-right">
					<AppLink className="" label={dateStr} href={TxUrl(item.txHash as Hash, sourceChain)} external={true} />
				</div>

				<div className="flex items-center justify-end gap-2">
					<span>{isBridge ? "Bridge" : "Transfer"}</span>
				</div>

				<div className="flex items-center justify-end gap-2">
					<ChainLogo chain={sourceChain.name} size={4} />
					{isBridge ? (
						<>
							<span className="text-text-secondary">→</span>
							<ChainLogo chain={targetChain.name} size={4} />
						</>
					) : null}
					<span>{route}</span>
				</div>

				<div className="flex flex-col">{direction}</div>

				<div className="flex items-center justify-end gap-2">
					<AppLink className="" label={shortenAddress(counterparty)} href={ContractUrl(counterparty, isSent ? targetChain : sourceChain)} external={true} />
				</div>

				<div className="">{formatCurrency(formatUnits(BigInt(item.amount), 18))} ZCHF</div>

				<div className="flex items-center justify-end gap-2">
					<span className="text-sm">{status}</span>
					<AppLink className="" label="View" href={TxUrl(item.txHash as Hash, sourceChain)} external={true} />
				</div>
			</TableRow>
		</>
	);
}
