import { valueProps } from "./landingContent";

export default function LandingValueProps() {
	return (
		<section className="rounded-2xl border border-[#e6dcc8] bg-[#fffdf8] p-5 shadow-sm dark:border-[#2a3444] dark:bg-[#111827] md:p-6">
			<div className="grid gap-5 md:grid-cols-[0.8fr_1.2fr] md:items-start">
				<div>
					<p className="text-xs font-black uppercase tracking-[0.18em] text-[#9b7625] dark:text-[#e5c978]">Built for trust</p>
					<h2 className="mt-3 text-2xl font-black tracking-tight text-[#111827] dark:text-[#f8f2e8]">Simple outside. Auditable inside.</h2>
				</div>
				<div className="grid gap-3 md:grid-cols-3">
					{valueProps.map((item) => (
						<article key={item.title} className="border-t border-[#e7dcc9] pt-4 dark:border-white/10">
							<h3 className="text-sm font-black text-[#111827] dark:text-[#f8f2e8]">{item.title}</h3>
							<p className="mt-2 text-sm leading-6 text-[#566174] dark:text-[#c7d1df]">{item.copy}</p>
						</article>
					))}
				</div>
			</div>
		</section>
	);
}
