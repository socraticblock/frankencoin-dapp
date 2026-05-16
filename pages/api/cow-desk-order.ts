import type { NextApiRequest, NextApiResponse } from "next";
import { isAddress } from "viem";
import { getDeskCowChainSlug, validateDeskOrderRoute, type DeskOrderSubmitRequest } from "../../utils/cowDeskOrder";
import { fetchWithTimeout, isAbortError, isSafeQuoteId, parsePositiveUint256, withOptionalDetails } from "../../utils/apiSecurity";

const ZERO_FEE = "0";
const MAX_ORDER_VALIDITY_SECONDS = 10 * 60;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	res.setHeader("Cache-Control", "no-store");

	if (req.method !== "POST") {
		res.setHeader("Allow", "POST");
		res.status(405).json({ error: "Method not allowed" });
		return;
	}

	const body = req.body as DeskOrderSubmitRequest;
	const chainId = Number(body.chainId);
	const cowChain = getDeskCowChainSlug(chainId);
	const route = validateDeskOrderRoute({ chainId, mode: body.mode, counterAssetId: body.counterAssetId });
	const order = body.order;
	const now = Math.floor(Date.now() / 1000);

	if (!cowChain) return res.status(400).json({ error: "This chain is not enabled for ZCHF Desk order submission." });
	if (!route) return res.status(400).json({ error: "This ZCHF Desk route is not enabled for order submission." });
	if (!order || typeof order !== "object") return res.status(400).json({ error: "Missing order." });
	if (!isAddress(order.from) || !isAddress(order.receiver)) return res.status(400).json({ error: "Invalid order owner or receiver." });
	if (order.receiver.toLowerCase() !== order.from.toLowerCase()) return res.status(400).json({ error: "Receiver must match the connected wallet." });
	if (!isAddress(order.sellToken) || !isAddress(order.buyToken)) return res.status(400).json({ error: "Invalid order tokens." });
	if (order.sellToken.toLowerCase() !== route.sellAsset.address.toLowerCase()) return res.status(400).json({ error: "Sell token does not match the selected route." });
	if (order.buyToken.toLowerCase() !== route.buyAsset.address.toLowerCase()) return res.status(400).json({ error: "Buy token does not match the selected route." });
	if (order.kind !== "sell") return res.status(400).json({ error: "Only sell orders are supported." });
	if (order.partiallyFillable !== false) return res.status(400).json({ error: "Partially fillable orders are not enabled." });
	if (order.sellTokenBalance !== "erc20" || order.buyTokenBalance !== "erc20") return res.status(400).json({ error: "Only ERC-20 balance orders are supported." });
	if (order.signingScheme !== "eip712") return res.status(400).json({ error: "Only EIP-712 signing is supported." });
	if (order.feeAmount !== ZERO_FEE) return res.status(400).json({ error: "CoW order submissions must use feeAmount 0." });
	if (!isSafeQuoteId(order.quoteId)) return res.status(400).json({ error: "Invalid quote id." });
	if (parsePositiveUint256(order.sellAmount) === null) return res.status(400).json({ error: "Invalid sell amount." });
	if (parsePositiveUint256(order.buyAmount) === null) return res.status(400).json({ error: "Invalid buy amount." });
	if (!Number.isInteger(order.validTo) || order.validTo <= now) return res.status(400).json({ error: "Quote has expired. Refresh the quote and try again." });
	if (order.validTo > now + MAX_ORDER_VALIDITY_SECONDS) return res.status(400).json({ error: "Quote expiry is too far in the future. Refresh the quote and try again." });
	if (typeof order.signature !== "string" || !/^0x[a-fA-F0-9]+$/.test(order.signature)) return res.status(400).json({ error: "Missing or invalid signature." });

	try {
		const response = await fetchWithTimeout(`https://api.cow.fi/${cowChain}/api/v1/orders`, {
			method: "POST",
			headers: { "Content-Type": "application/json", Accept: "application/json" },
			body: JSON.stringify(order),
		});
		const data = await response.json().catch(() => null);
		if (!response.ok) return res.status(response.status).json(withOptionalDetails(getCowError(data), data));
		res.status(200).json({ orderUid: typeof data === "string" ? data : data?.uid ?? data?.orderUid, order: data });
	} catch (error) {
		res.status(isAbortError(error) ? 504 : 500).json({ error: isAbortError(error) ? "CoW order submission timed out. Try again." : "Order submission failed." });
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
	return "CoW order submission failed.";
}
