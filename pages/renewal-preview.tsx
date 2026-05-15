const previewRows = [
	{
		position: "0x1234...abcd",
		price: "6.00 ZCHF",
		interest: "1.00%",
		maturity: "24 Nov 2026",
		wallet: "0.00 ZCHF",
		walletTone: "normal",
		note: "No extra wallet ZCHF needed. The interest is added to the new loan.",
		action: "Roll",
	},
	{
		position: "0xabcd...9876",
		price: "5.00 ZCHF",
		interest: "1.20%",
		maturity: "30 Jun 2027",
		wallet: "124.50 ZCHF",
		walletTone: "warning",
		note:
			"This Roll / Merge needs 124.50 ZCHF from your wallet because the new position cannot borrow enough by itself. Choose a position with more room or keep this ZCHF in your wallet.",
		action: "Roll",
	},
	{
		position: "0x9876...dcba",
		price: "6.50 ZCHF",
		interest: "0.90%",
		maturity: "03 Sep 2027",
		wallet: "0.00 ZCHF",
		walletTone: "normal",
		note: "This new position is in cooldown. It can be used after cooldown ends.",
		action: "18.4h Cooldown",
	},
];

export default function RenewalPreview() {
	return (
		<main className="mx-auto max-w-6xl px-6 py-10 text-text-primary">
			<div className="mb-6 rounded-xl border border-menu-separator bg-card-content-secondary px-4 py-3 text-sm text-text-secondary">
				<strong className="text-text-primary">Preview only:</strong> this page shows how the Renewal section will look to a client.
				No wallet or real position is needed here, and all buttons are disabled.
			</div>

			<section className="space-y-4">
				<div>
					<h1 className="text-2xl font-semibold text-text-primary">Renewal</h1>
					<p className="mt-1 text-sm text-text-secondary">
						You can renew positions by rolling them into suitable new ones with the same collateral.
					</p>
				</div>

				<div className="rounded-xl border border-[#e0d4bd] bg-card-content-secondary px-4 py-3 text-sm text-text-secondary dark:border-menu-separator">
					<div className="font-semibold text-text-primary">What happens when you Roll / Merge?</div>
					<p className="mt-1">Rolling means your current loan is moved into a newer compatible position.</p>
					<p className="mt-1">
						The new loan can be a little bigger because the upfront interest for the next period is added to the loan.
					</p>
					<p className="mt-1">
						Example: if you currently owe 1,000 ZCHF and the next period&apos;s upfront interest is 10 ZCHF, after rolling
						you may owe about 1,010 ZCHF.
					</p>
					<p className="mt-1">
						<span className="font-semibold text-text-primary">ZCHF needed from wallet</span> tells you whether extra ZCHF
						must come from your wallet.
					</p>
					<p className="mt-1">
						<span className="font-semibold text-text-primary">If it says 0.00 ZCHF:</span> no extra ZCHF is needed from
						your wallet, except gas. The interest is added to the new loan.
					</p>
					<p className="mt-1">
						<span className="font-semibold text-text-primary">If it is above 0:</span> the new position cannot borrow enough
						by itself. You need that much ZCHF in your wallet, or you need to choose a position with more borrowing room.
					</p>
					<p className="mt-1">Your collateral is not sold during a normal Roll / Merge.</p>
					<div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
						<div className="font-semibold">Rolling early can cost extra.</div>
						<p className="mt-1">
							The upfront fee for your current position is not refunded. If this position still has time left before maturity,
							that time is already paid.
						</p>
						<p className="mt-1">
							Rolling now starts a new upfront-fee period today, so waiting closer to maturity is usually cheaper.
						</p>
					</div>
					<p className="mt-1 text-xs">
						Cooldown only matters if more borrowing room must be created by raising the liquidation / challenge price, or if
						the selected new position is already in cooldown.
					</p>
				</div>

				<div className="overflow-hidden rounded-xl border border-menu-separator bg-card-content-secondary">
					<div className="hidden grid-cols-[1fr_1fr_0.8fr_0.9fr_1.7fr_0.8fr] gap-4 border-b border-menu-separator px-4 py-3 text-xs font-semibold uppercase text-text-secondary md:grid">
						<div>Position</div>
						<div>Liquidation Price</div>
						<div>Annual Interest</div>
						<div>Maturity</div>
						<div>ZCHF needed from wallet</div>
						<div className="text-right">Action</div>
					</div>

					{previewRows.map((row) => (
						<div
							key={row.position}
							className="grid gap-3 border-b border-menu-separator px-4 py-4 text-sm last:border-b-0 md:grid-cols-[1fr_1fr_0.8fr_0.9fr_1.7fr_0.8fr] md:gap-4"
						>
							<div>
								<div className="text-xs uppercase text-text-secondary md:hidden">Position</div>
								<div className="font-medium text-text-primary">{row.position}</div>
							</div>
							<div>
								<div className="text-xs uppercase text-text-secondary md:hidden">Liquidation Price</div>
								<div>{row.price}</div>
							</div>
							<div>
								<div className="text-xs uppercase text-text-secondary md:hidden">Annual Interest</div>
								<div>{row.interest}</div>
							</div>
							<div>
								<div className="text-xs uppercase text-text-secondary md:hidden">Maturity</div>
								<div>{row.maturity}</div>
							</div>
							<div className="flex flex-col gap-1">
								<div className="text-xs uppercase text-text-secondary md:hidden">ZCHF needed from wallet</div>
								<span className={row.walletTone === "warning" ? "font-semibold text-text-warning" : "font-semibold text-text-primary"}>
									{row.wallet}
								</span>
								<span className="text-xs leading-5 text-text-secondary">{row.note}</span>
							</div>
							<div className="flex md:justify-end">
								<button
									type="button"
									disabled
									className="h-10 rounded-lg bg-button-default px-4 text-sm font-semibold text-white opacity-50"
								>
									{row.action}
								</button>
							</div>
						</div>
					))}
				</div>
			</section>
		</main>
	);
}
