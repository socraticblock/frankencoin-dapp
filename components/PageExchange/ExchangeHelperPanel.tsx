import AppButton from "@components/AppButton";

export default function ExchangeHelperPanel() {
	return (
		<section className="grid grid-cols-1 gap-4 md:grid-cols-2">
			<div className="rounded-2xl border border-[#e8dcc8] bg-[#fffdf9] p-5 shadow-sm dark:border-menu-separator dark:bg-card-body-primary">
				<h2 className="text-lg font-semibold text-text-primary">Already have ZCHF?</h2>
				<p className="mt-2 text-sm leading-6 text-text-secondary">Move it to another chain, send it to another wallet, or start earning with your ZCHF.</p>
				<div className="mt-4 flex flex-wrap gap-2">
					<AppButton to="/bridge" width="w-auto" className="min-h-[42px] px-4">
						Bridge ZCHF
					</AppButton>
					<AppButton to="/transfer" width="w-auto" className="min-h-[42px] px-4">
						Transfer ZCHF
					</AppButton>
					<AppButton to="/savings" width="w-auto" className="min-h-[42px] px-4">
						Start earning
					</AppButton>
				</div>
			</div>
			<div className="rounded-2xl border border-[#e8dcc8] bg-[#fffdf9] p-5 shadow-sm dark:border-menu-separator dark:bg-card-body-primary">
				<h2 className="text-lg font-semibold text-text-primary">Looking for FPS or WFPS?</h2>
				<p className="mt-2 text-sm leading-6 text-text-secondary">Use Invest to mint, redeem, wrap, or unwrap Frankencoin Pool Shares. Exchange only handles buying and selling ZCHF.</p>
				<AppButton to="/equity" width="w-auto" className="mt-4 min-h-[42px] px-4">
					Open Invest
				</AppButton>
			</div>
		</section>
	);
}
