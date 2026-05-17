import AppLink from "@components/AppLink";
import { SOCIAL } from "@utils";

export default function DeskConfidenceSection() {
	return (
		<section className="rounded-2xl border border-[#e8dcc8] bg-[#fffdf9] p-5 shadow-sm dark:border-menu-separator dark:bg-card-body-primary md:p-6">
			<h2 className="text-lg font-semibold tracking-tight text-text-primary">Use Frankencoin Desk with confidence</h2>
			<p className="mt-1 max-w-2xl text-sm text-text-secondary">Simple context for safe wallet actions and learning the protocol.</p>
			<div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
				<article className="rounded-xl border border-[#e0d4bd] bg-card-content-secondary/80 p-4 dark:border-menu-separator dark:bg-card-content-secondary">
					<h3 className="text-sm font-semibold text-text-primary">Before you sign</h3>
					<p className="mt-2 text-xs leading-relaxed text-text-secondary">Review amount, network, and expected outcome on each page before your wallet opens. If something looks wrong, stop and verify on-chain.</p>
				</article>
				<article className="rounded-xl border border-[#e0d4bd] bg-card-content-secondary/80 p-4 dark:border-menu-separator dark:bg-card-content-secondary">
					<h3 className="text-sm font-semibold text-text-primary">Learn Frankencoin</h3>
					<p className="mt-2 text-xs leading-relaxed text-text-secondary">Frankencoin is a collateral-backed Swiss franc stablecoin protocol. The docs cover ZCHF, FPS, mechanics, risks, and governance.</p>
					<AppLink label="Open documentation" href={SOCIAL.Docs} external icon className="mt-3 inline-flex items-center text-xs font-medium text-card-input-max hover:text-card-input-hover" />
				</article>
			</div>
		</section>
	);
}

