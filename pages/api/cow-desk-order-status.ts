import type { NextApiRequest, NextApiResponse } from "next";
import { getCowChainSlug } from "../../utils/cowDeskOrder";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "GET") {
		res.setHeader("Allow", "GET");
		res.status(405).json({ error: "Method not allowed" });
		return;
	}

	const chainId = Number(req.query.chainId);
	const orderUid = typeof req.query.orderUid === "string" ? req.query.orderUid : "";
	const cowChain = getCowChainSlug(chainId);

	if (!cowChain) return res.status(400).json({ error: "This chain is not enabled for ZCHF Desk order tracking." });
	if (!orderUid || !orderUid.startsWith("0x")) return res.status(400).json({ error: "Missing order uid." });

	try {
		const [orderResponse, statusResponse] = await Promise.all([
			fetch(`https://api.cow.fi/${cowChain}/api/v1/orders/${orderUid}`, {
				headers: { Accept: "application/json" },
			}),
			fetch(`https://api.cow.fi/${cowChain}/api/v1/orders/${orderUid}/status`, {
				headers: { Accept: "application/json" },
			}),
		]);

		const order = await orderResponse.json().catch(() => null);
		const status = await statusResponse.json().catch(() => null);

		if (!orderResponse.ok) {
			return res.status(orderResponse.status).json({
				error: getCowError(order),
				details: order,
			});
		}

		res.setHeader("Cache-Control", "no-store");
		res.status(200).json({
			orderUid,
			order,
			status: statusResponse.ok ? status : null,
			statusError: statusResponse.ok ? null : getCowError(status),
		});
	} catch (error) {
		res.status(500).json({ error: error instanceof Error ? error.message : "Order status request failed." });
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
