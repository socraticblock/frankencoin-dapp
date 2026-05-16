import type { NextApiRequest, NextApiResponse } from "next";
import { getDeskCowChainSlug } from "../../utils/cowDeskOrder";
import { fetchWithTimeout, isAbortError, isCowOrderUid, withOptionalDetails } from "../../utils/apiSecurity";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	res.setHeader("Cache-Control", "no-store");

	if (req.method !== "GET") {
		res.setHeader("Allow", "GET");
		res.status(405).json({ error: "Method not allowed" });
		return;
	}

	const chainId = Number(req.query.chainId);
	const orderUid = typeof req.query.orderUid === "string" ? req.query.orderUid : "";
	const cowChain = getDeskCowChainSlug(chainId);

	if (!cowChain) return res.status(400).json({ error: "This chain is not enabled for ZCHF Desk order tracking." });
	if (!isCowOrderUid(orderUid)) return res.status(400).json({ error: "Invalid CoW order id." });

	try {
		const [orderResponse, statusResponse] = await Promise.all([
			fetchWithTimeout(`https://api.cow.fi/${cowChain}/api/v1/orders/${orderUid}`, {
				headers: { Accept: "application/json" },
			}),
			fetchWithTimeout(`https://api.cow.fi/${cowChain}/api/v1/orders/${orderUid}/status`, {
				headers: { Accept: "application/json" },
			}),
		]);

		const order = await orderResponse.json().catch(() => null);
		const status = await statusResponse.json().catch(() => null);

		if (!orderResponse.ok) return res.status(orderResponse.status).json(withOptionalDetails(getCowError(order), order));

		res.status(200).json({
			orderUid,
			order,
			status: statusResponse.ok ? status : null,
			statusError: statusResponse.ok ? null : getCowError(status),
		});
	} catch (error) {
		res.status(isAbortError(error) ? 504 : 500).json({ error: isAbortError(error) ? "CoW order status request timed out. Try again." : "Order status request failed." });
	}
}

function getCowError(value: unknown) {
	if (value && typeof value === "object") {
		const data = value as Record<string, unknown>;
		if (typeof data.description === "string") return data.description;
		if (typeof data.error === "string") return data.error;
		if (typeof data.message === "string") return data.message;
	}
	return "CoW order status request failed.";
}
