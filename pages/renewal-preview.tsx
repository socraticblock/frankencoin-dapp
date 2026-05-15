export default function RenewalPreview() {
	return (
		<main className="mx-auto max-w-3xl px-6 py-10">
			<h1 className="text-3xl font-bold">Roll / Merge preview</h1>
			<section className="mt-6 rounded-xl border border-menu-separator bg-card-content-secondary p-4 text-sm text-text-secondary">
				<h2 className="text-lg font-semibold text-text-primary">How Roll / Merge pays interest</h2>
				<p className="mt-3">Rolling moves the old debt into the selected target position. The upfront interest for the next period is included in the new loan.</p>
				<p className="mt-2">ZCHF needed from wallet only shows the shortfall that cannot be covered by the target position.</p>
				<p className="mt-2">0.00 ZCHF means no extra wallet ZCHF is needed. It does not mean no interest. Collateral is not sold during a normal Roll / Merge.</p>
				<p className="mt-2 text-xs">Cooldown only matters when more borrowing room must be created by raising the liquidation / challenge price, or when the selected target is already in cooldown.</p>
			</section>
		</main>
	);
}
