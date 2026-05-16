import type { NextApiRequest, NextApiResponse } from "next";
import { isAddress } from "viem";
import type { ChainId } from "@frankencoin/zchf";
import { COW_EMPTY_APP_DATA, COW_EMPTY_APP_DATA_HASH, getDeskCowChainSlug } from "../../utils/cowDeskOrder";
import { getDeskRoute, type DeskSwapMode } from "../../utils/exchangeAssets";
import { fetchWithTimeout, isAbortError, parsePositiveUint256, withOptionalDetails } from "../../utils/apiSecurity";

type QuoteBody = {
	chainId?: number;
	mode?: DeskSwapMode;
	counterAssetId?: string;
	sellAmountBeforeFee?: string;
	from?: string;
	receiver?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	res.setHeader("Cache-Control", "no-store");

	if (req.method !== "POST") {
		res.setHeader("Allow", "POST");
		res.status(405).json({ error: "Method not allowed" });
		return;
	}

	const body = req.body as QuoteBody;
	const chainId = Number(body.chainId) as ChainId;
	const mode = body.mode;
	const counterAssetId = body.counterAssetId;
	const sellAmountBeforeFee = body.sellAmountBeforeFee;
	const from = body.from;
	const receiver = body.receiver || from;
	const cowChain = getDeskCowChainSlug(chainId);

	if (!cowChain) return res.status(400).json({ error: "This chain is not enabled for ZCHF Desk quotes." });
	if (!mode || !counterAssetId) return res.status(400).json({ error: "Missing route selection." });
	if (parsePositiveUint256(sellAmountBeforeFee) === null) return res.status(400).json({ error: "Enter a valid amount." });
	if (!from || !receiver || !isAddress(from) || !isAddress(receiver)) return res.status(400).json({ error: "Connect a valid wallet before requesting a quote." });
	if (receiver.toLowerCase() !== from.toLowerCase()) return res.status(400).json({ error: "Receiver must match the connected wallet." });

	const route = getDeskRoute(mode, chainId, counterAssetId);
	if (!route) return res.status(400).json({ error: "This route is not allowed in ZCHF Desk." });

	try {
		const quote = await fetchWithTimeout(`https://api.cow.fi/${cowChain}/api/v1/quote`, {
			method: "POST",
			headers: { "Content-Type": "application/json", Accept: "application/json" },
			body: JSON.stringify({
				sellToken: route.sellAsset.address,
				buyToken: route.buyAsset.address,
				from,
				receiver,
				kind: "sell",
				sellAmountBeforeFee,
				partiallyFillable: false,
				appData: COW_EMPTY_APP_DATA,
				appDataHash: COW_EMPTY_APP_DATA_HASH,
				sellTokenBalance: "erc20",
				buyTokenBalance: "erc20",
				signingScheme: "eip712",
				priceQuality: "optimal",
			}),
		});

		const data = await quote.json().catch(() => null);
		if (!quote.ok) return res.status(quote.status).json(withOptionalDetails(getCowError(data), data));

		res.status(200).json({
			chainId,
			mode,
			sellAsset: route.sellAsset,
			buyAsset: route.buyAsset,
			quote: data?.quote ?? data,
			expiration: data?.expiration,
			id: data?.id,
		});
	} catch (error) {
		res.status(isAbortError(error) ? 504 : 500).json({ error: isAbortError(error) ? "CoW quote request timed out. Try again." : "Quote request failed." });
	}
}

function getCowError(value: unknown) {
	if (typeof value === "string") return value;
	if (value && typeof value === "object") {
		const data = value as Record<string, unknown>;
		if (typeof data.description === "string") return data.description;
		if (typeof data.error === "string") return data.error;
		if (typeof data.message === "string") return data.message;
	}
	return "No reliable CoW route found for this trade right now.";
}
