import type { NextApiRequest, NextApiResponse } from "next";
import { isAddress } from "viem";
import { getCowChainSlug, validateBaseUsdcZchfOrderRoute, type DeskOrderSubmitRequest } from "../../utils/cowDeskOrder";

const ZERO_FEE = "0";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "POST") {
		res.setHeader("Allow", "POST");
		res.status(405).json({ error: "Method not allowed" });
		return;
	}

	const body = req.body as DeskOrderSubmitRequest;
	const chainId = Number(body.chainId);
	const cowChain = getCowChainSlug(chainId);
	const route = validateBaseUsdcZchfOrderRoute({ chainId, mode: body.mode, counterAssetId: body.counterAssetId });
	const order = body.order;

	if (!cowChain) return res.status(400).json({ error: "This chain is not enabled for ZCHF Desk order submission." });
	if (!route) return res.status(400).json({ error: "Only Base USDC to ZCHF execution is enabled right now." });
	if (!order || typeof order !== "object") return res.status(400).json({ error: "Missing order." });
	if (!isAddress(order.from) || !isAddress(order.receiver)) return res.status(400).json({ error: "Invalid order owner or receiver." });
	if (!isAddress(order.sellToken) || !isAddress(order.buyToken)) return res.status(400).json({ error: "Invalid order tokens." });
	if (order.sellToken.toLowerCase() !== route.sellAsset.address.toLowerCase()) return res.status(400).json({ error: "Sell token does not match the selected route." });
	if (order.buyToken.toLowerCase() !== route.buyAsset.address.toLowerCase()) return res.status(400).json({ error: "Buy token does not match the selected route." });
	if (order.kind !== "sell") return res.status(400).json({ error: "Only sell orders are supported." });
	if (order.partiallyFillable !== false) return res.status(400).json({ error: "Partially fillable orders are not enabled." });
	if (order.sellTokenBalance !== "erc20" || order.buyTokenBalance !== "erc20") return res.status(400).json({ error: "Only ERC-20 balance orders are supported." });
	if (order.signingScheme !== "eip712") return res.status(400).json({ error: "Only EIP-712 signing is supported." });
	if (order.feeAmount !== ZERO_FEE) return res.status(400).json({ error: "CoW order submissions must use feeAmount 0." });
	if (typeof order.quoteId !== "number") return res.status(400).json({ error: "Missing quote id." });
	if (!/^\d+$/.test(order.sellAmount) || BigInt(order.sellAmount) <= 0n) return res.status(400).json({ error: "Invalid sell amount." });
	if (!/^\d+$/.test(order.buyAmount) || BigInt(order.buyAmount) <= 0n) return res.status(400).json({ error: "Invalid buy amount." });
	if (!Number.isInteger(order.validTo) || order.validTo <= Math.floor(Date.now() / 1000)) return res.status(400).json({ error: "Quote has expired. Refresh the quote and try again." });
	if (typeof order.signature !== "string" || !order.signature.startsWith("0x")) return res.status(400).json({ error: "Missing signature." });

	try {
		const response = await fetch(`https://api.cow.fi/${cowChain}/api/v1/orders`, {
			method: "POST",
			headers: { "Content-Type": "application/json", Accept: "application/json" },
			body: JSON.stringify(order),
		});
		const data = await response.json().catch(() => null);
		if (!response.ok) {
			return res.status(response.status).json({
				error: getCowError(data),
				details: data,
			});
		}
		res.setHeader("Cache-Control", "no-store");
		res.status(200).json({ orderUid: typeof data === "string" ? data : data?.uid ?? data?.orderUid, order: data });
	} catch (error) {
		res.status(500).json({ error: error instanceof Error ? error.message : "Order submission failed." });
	}
}

function getCowError(value: unknown) {
	if (value && typeof value === "object") {
		const data = value as Record<string, unknown>;
		if (typeof data.description === "string") return data.description;
		if (typeof data.error === "string") return data.error;
		if (typeof data.message === "string") return data.message;
	}
	return "CoW order submission failed.";
}
