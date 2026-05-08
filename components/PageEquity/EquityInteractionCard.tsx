import React, { useState } from "react";
import EquityInteractionWithZCHFFPS from "./EquityInteractionWithZCHFFPS";
import EquityInteractionWithFPSWFPS from "./EquityInteractionWithFPSWFPS";
import EquityInteractionWithWFPSRedeem from "./EquityInteractionWithWFPSRedeem";
import AppCard from "@components/AppCard";

export const EquityTokenSelectorMapping: { [key: string]: string[] } = {
	ZCHF: ["FPS"],
	FPS: ["ZCHF", "WFPS"],
	WFPS: ["FPS", "ZCHF"],
};

export default function EquityInteractionCard() {
	const [tokenFromTo, setTokenFromTo] = useState<{ from: string; to: string }>({ from: "ZCHF", to: "FPS" });
	const [showDetails, setShowDetails] = useState(false);

	return (
		<AppCard>
			<div className="mt-4 text-lg font-bold text-center">Frankencoin Pool Shares (FPS)</div>
			<div className="rounded-xl border border-menu-separator p-3">
				<p className="text-sm text-text-secondary">
					FPS are Frankencoin Pool Shares. They represent participation in the reserve pool and governance on Ethereum mainnet.
				</p>
				<button type="button" className="mt-2 text-sm underline" onClick={() => setShowDetails((prev) => !prev)}>
					{showDetails ? "Hide details" : "Learn more"}
				</button>
				{showDetails ? (
					<ul className="mt-2 text-sm text-text-secondary list-disc pl-5 space-y-1">
						<li>Reserve pool role and governance rights.</li>
						<li>Redemption timing depends on protocol rules.</li>
						<li>FPS actions are available on Ethereum mainnet only.</li>
					</ul>
				) : null}
			</div>

			{/* Load modules dynamically */}
			{(tokenFromTo.from === "ZCHF" && tokenFromTo.to === "FPS") || (tokenFromTo.from === "FPS" && tokenFromTo.to === "ZCHF") ? (
				<EquityInteractionWithZCHFFPS
					tokenFromTo={tokenFromTo}
					setTokenFromTo={setTokenFromTo}
					selectorMapping={EquityTokenSelectorMapping}
				/>
			) : null}

			{(tokenFromTo.from === "FPS" && tokenFromTo.to === "WFPS") || (tokenFromTo.from === "WFPS" && tokenFromTo.to === "FPS") ? (
				<EquityInteractionWithFPSWFPS
					tokenFromTo={tokenFromTo}
					setTokenFromTo={setTokenFromTo}
					selectorMapping={EquityTokenSelectorMapping}
				/>
			) : null}

			{tokenFromTo.from === "WFPS" && tokenFromTo.to === "ZCHF" ? (
				<EquityInteractionWithWFPSRedeem
					tokenFromTo={tokenFromTo}
					setTokenFromTo={setTokenFromTo}
					selectorMapping={EquityTokenSelectorMapping}
				/>
			) : null}
		</AppCard>
	);
}
