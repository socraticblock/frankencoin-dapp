export default function RenewalPreview() {
	return (
		<main className="mx-auto max-w-3xl px-6 py-10">
			<h1 className="text-3xl font-bold">Roll / Merge preview</h1>
			<section className="mt-6 rounded-xl border border-menu-separator bg-card-content-secondary p-4 text-sm text-text-secondary">
				<h2 className="text-lg font-semibold text-text-primary">What happens when you Roll / Merge?</h2>
				<p className="mt-3">Rolling means your current loan is moved into a newer compatible position.</p>
				<p className="mt-2">The new loan can be a little bigger because the upfront interest for the next period is added to the loan.</p>
				<p className="mt-2">Example: if you currently owe 1,000 ZCHF and the next period&apos;s upfront interest is 10 ZCHF, after rolling you may owe about 1,010 ZCHF.</p>
				<p className="mt-2"><strong className="text-text-primary">ZCHF needed from wallet</strong> tells you whether extra ZCHF must come from your wallet.</p>
				<p className="mt-2"><strong className="text-text-primary">If it says 0.00 ZCHF:</strong> no extra ZCHF is needed from your wallet, except gas. The interest is added to the new loan.</p>
				<p className="mt-2"><strong className="text-text-primary">If it is above 0:</strong> the new position cannot borrow enough by itself. You need that much ZCHF in your wallet, or you need to choose a position with more borrowing room.</p>
				<p className="mt-2">Your collateral is not sold during a normal Roll / Merge.</p>
				<p className="mt-2 text-xs">Cooldown only matters if more borrowing room must be created by raising the liquidation / challenge price, or if the selected new position is already in cooldown.</p>
			</section>
		</main>
	);
}
