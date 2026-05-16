import Head from "next/head";
import Link from "next/link";

const actionCards = [
	{
		title: "Buy or Sell ZCHF",
		copy: "Use fiat or wallet crypto to buy ZCHF, or sell ZCHF back with a focused flow.",
		cta: "Open Exchange",
		href: "/exchange",
	},
	{
		title: "Earn with ZCHF",
		copy: "Deposit ZCHF into earning and manage ready interest clearly before signing.",
		cta: "Start earning",
		href: "/savings",
	},
	{
		title: "Move ZCHF",
		copy: "Bridge ZCHF between chains or transfer it to another wallet from one calm place.",
		cta: "Bridge or Transfer",
		href: "/bridge",
	},
	{
		title: "Borrow against collateral",
		copy: "Open or manage collateral-backed borrowing positions with clearer context.",
		cta: "Explore borrowing",
		href: "/mint",
	},
	{
		title: "Invest in the Protocol",
		copy: "Mint, redeem, wrap, or unwrap Frankencoin Pool Shares from the Invest page.",
		cta: "Open Invest",
		href: "/equity",
	},
	{
		title: "Review your positions",
		copy: "See borrowing positions and personal Frankencoin activity in your portfolio.",
		cta: "Open Portfolio",
		href: "/mypositions",
	},
];

const previewCards = [
	{
		badge: "ZCHF",
		title: "Wallet ZCHF",
		amount: "3.60 ZCHF",
		copy: "Balance in your wallet",
		button: "Open wallet",
		figure: "F",
		tone: "blue",
	},
	{
		badge: "SAVE",
		title: "Earning",
		amount: "2,168 ZCHF",
		copy: "Interest available",
		extra: "17.90 ZCHF",
		button: "Go to Earn",
		figure: "◒",
		tone: "green",
	},
	{
		badge: "FPS",
		title: "Protocol Investment",
		amount: "0.00 FPS",
		copy: "No FPS invested",
		button: "Go to Invest",
		figure: "FPS",
		tone: "brass",
	},
	{
		badge: "DEBT",
		title: "Borrowing",
		amount: "0.00 ZCHF",
		copy: "No active borrowing",
		button: "Explore Borrowing",
		figure: "Ξ",
		tone: "violet",
	},
];

const chips = [
	{ icon: "↔", title: "Buy or Sell ZCHF", copy: "Exchange instantly" },
	{ icon: "⌁", title: "Earn with ZCHF", copy: "Grow your balance" },
	{ icon: "⇄", title: "Move ZCHF", copy: "Bridge, transfer, or swap" },
];

const valueProps = [
	{
		title: "One clear place",
		copy: "The main Frankencoin actions are organized into simple, focused flows.",
	},
	{
		title: "Built around ZCHF and FPS",
		copy: "Designed specifically for ZCHF, earning, borrowing, movement, and Frankencoin Pool Shares.",
	},
	{
		title: "Safer before signing",
		copy: "Each action should make the network, amount, and expected result clear before your wallet opens.",
	},
];

export default function LandingPage() {
	return (
		<>
			<Head>
				<title>Frankencoin Desk</title>
				<meta name="description" content="A simpler way to use the Frankencoin Protocol." />
			</Head>
			<div className="frankencoin-landing -mt-20 overflow-hidden bg-[#fbf4e6] text-slate-950 dark:bg-[#030812] dark:text-white">
				<section className="relative min-h-screen px-5 pb-20 pt-32 sm:px-8 lg:px-14 xl:px-20">
					<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_24%,rgba(196,167,95,0.28),transparent_31%),radial-gradient(circle_at_12%_12%,rgba(255,244,214,0.9),transparent_27%),linear-gradient(180deg,#fff8ea_0%,#fbf4e6_48%,#efe4d1_100%)] dark:bg-[radial-gradient(circle_at_72%_26%,rgba(196,167,95,0.2),transparent_30%),radial-gradient(circle_at_50%_122%,rgba(215,194,138,0.34),transparent_32%),linear-gradient(180deg,#07111f_0%,#050d19_48%,#030812_100%)]" />
					<div className="pointer-events-none absolute inset-0 opacity-[0.11] dark:opacity-[0.16] [background-image:radial-gradient(currentColor_0.55px,transparent_0.55px)] [background-size:18px_18px] text-[#9b7625] dark:text-white" />
					<div className="landing-orbit pointer-events-none absolute left-[-12%] right-[-12%] bottom-[-21rem] h-[34rem] rounded-[50%] border-t border-[#c4a75f]/45 bg-[radial-gradient(ellipse_at_top,rgba(196,167,95,0.28),rgba(11,31,58,0.08)_32%,transparent_68%)] shadow-[0_-36px_90px_rgba(196,167,95,0.22)] dark:border-white/25 dark:bg-[radial-gradient(ellipse_at_top,rgba(215,194,138,0.26),rgba(11,31,58,0.45)_32%,transparent_70%)] dark:shadow-[0_-44px_110px_rgba(215,194,138,0.16)]" />

					<div className="relative mx-auto grid max-w-[112rem] items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14 xl:gap-20">
						<div className="landing-stagger max-w-3xl pt-8 lg:pt-20">
							<p className="landing-fade-up text-sm font-semibold uppercase tracking-[0.22em] text-[#9b7625] dark:text-[#d7c28a]">Frankencoin Desk</p>
							<h1 className="landing-fade-up mt-8 max-w-[13ch] text-5xl font-black leading-[1.12] tracking-[-0.055em] text-slate-900 drop-shadow-sm dark:text-[#f7f2ea] sm:text-6xl lg:text-7xl 2xl:text-8xl">
								A simpler way to use the Frankencoin Protocol
							</h1>
							<p className="landing-fade-up mt-7 max-w-2xl text-xl leading-8 text-slate-700 dark:text-[#f7f2ea]/90 sm:text-2xl sm:leading-10">
								Borrow, earn, exchange, bridge, transfer, and invest with Frankencoin from one clear place.
							</p>
							<p className="landing-fade-up mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-[#d6cec2]">
								Manage ZCHF and FPS with a cleaner interface built for the Frankencoin Protocol.
							</p>
							<div className="landing-fade-up mt-10 flex flex-col gap-4 sm:flex-row">
								<Link href="/desk" className="group inline-flex min-h-[64px] items-center justify-center gap-4 rounded-xl border border-[#e2c98d] bg-gradient-to-br from-[#fff0cc] to-[#e3bd78] px-10 text-lg font-black text-[#0b1f3a] shadow-[0_16px_45px_rgba(155,118,37,0.18)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(155,118,37,0.26)]">
									Open your Desk <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
								</Link>
								<Link href="#what-you-can-do" className="group inline-flex min-h-[64px] items-center justify-center rounded-xl border border-[#9b7625]/65 bg-white/30 px-10 text-lg font-black text-[#9b7625] backdrop-blur transition duration-300 hover:-translate-y-1 hover:bg-white/60 dark:bg-transparent dark:text-[#e5c978] dark:hover:bg-white/10">
									Explore Frankencoin
								</Link>
							</div>
							<div className="landing-fade-up mt-8 flex items-center gap-3 text-base font-semibold text-slate-600 dark:text-[#d6cec2]">
								<span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#c4a75f]/25 text-[#80601d] dark:bg-[#c4a75f]/20 dark:text-[#e5c978]">◆</span>
								Clear flows. Cleaner actions. Better overview.
							</div>
						</div>

						<div className="landing-preview relative lg:pt-20">
							<PreviewPanel />
							<p className="mt-7 flex items-center justify-center gap-3 text-base text-slate-600 dark:text-[#d6cec2]"><span className="text-2xl text-[#9b7625] dark:text-[#d7c28a]">≋</span> Built around ZCHF, FPS, earning, borrowing, and movement.</p>
						</div>
					</div>

					<div className="relative mx-auto mt-14 grid max-w-[112rem] gap-4 sm:grid-cols-3 lg:mt-4 lg:max-w-3xl lg:translate-y-8 lg:mx-0">
						{chips.map((chip) => (
							<div key={chip.title} className="landing-chip flex items-center gap-4 rounded-2xl border border-[#d6bd7c]/35 bg-white/45 p-4 backdrop-blur dark:border-white/10 dark:bg-white/[0.03]">
								<span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0b4f8f]/15 text-2xl text-[#0b4f8f] dark:bg-[#3e96f4]/20 dark:text-[#8db2da]">{chip.icon}</span>
								<div><div className="font-black text-slate-900 dark:text-white">{chip.title}</div><div className="mt-1 text-sm text-slate-600 dark:text-[#d6cec2]">{chip.copy}</div></div>
							</div>
						))}
					</div>
				</section>

				<section id="what-you-can-do" className="relative px-5 py-24 sm:px-8 lg:px-14 xl:px-20">
					<div className="mx-auto max-w-[112rem]">
						<div className="max-w-3xl">
							<p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#9b7625] dark:text-[#d7c28a]">What you can do</p>
							<h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-slate-900 dark:text-white sm:text-5xl">Frankencoin actions, organized clearly.</h2>
						</div>
						<div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
							{actionCards.map((card) => (
								<Link key={card.title} href={card.href} className="group rounded-3xl border border-[#e8dcc8] bg-white/70 p-6 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-[#c4a75f] hover:shadow-xl dark:border-white/10 dark:bg-white/[0.055]">
									<h3 className="text-xl font-black text-slate-900 dark:text-white">{card.title}</h3>
									<p className="mt-3 min-h-[72px] text-base leading-7 text-slate-600 dark:text-[#d6cec2]">{card.copy}</p>
									<span className="mt-6 inline-flex items-center gap-2 font-black text-[#9b7625] dark:text-[#e5c978]">{card.cta}<span className="transition group-hover:translate-x-1">→</span></span>
								</Link>
							))}
						</div>
					</div>
				</section>

				<section className="px-5 py-20 sm:px-8 lg:px-14 xl:px-20">
					<div className="mx-auto grid max-w-[112rem] gap-5 md:grid-cols-3">
						{valueProps.map((prop) => (
							<article key={prop.title} className="rounded-3xl border border-[#e8dcc8] bg-[#fffaf0]/75 p-7 dark:border-white/10 dark:bg-white/[0.045]">
								<div className="mb-5 h-1 w-14 rounded-full bg-[#c4a75f]" />
								<h3 className="text-2xl font-black text-slate-900 dark:text-white">{prop.title}</h3>
								<p className="mt-4 text-base leading-7 text-slate-600 dark:text-[#d6cec2]">{prop.copy}</p>
							</article>
						))}
					</div>
				</section>

				<section className="px-5 pb-28 pt-10 sm:px-8 lg:px-14 xl:px-20">
					<div className="mx-auto flex max-w-[112rem] flex-col items-start justify-between gap-8 rounded-[2rem] border border-[#d6bd7c]/55 bg-gradient-to-br from-[#fff5dc] to-[#efe1c5] p-8 shadow-[0_24px_80px_rgba(155,118,37,0.14)] dark:border-[#8a7448]/45 dark:from-white/[0.08] dark:to-white/[0.03] md:flex-row md:items-center md:p-10">
						<div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#9b7625] dark:text-[#d7c28a]">Ready?</p><h2 className="mt-3 text-3xl font-black tracking-[-0.035em] text-slate-900 dark:text-white sm:text-4xl">Ready to manage your Frankencoin activity?</h2></div>
						<div className="flex flex-col gap-3 sm:flex-row"><Link href="/desk" className="rounded-xl bg-[#0b1f3a] px-7 py-4 font-black text-white transition hover:-translate-y-1 dark:bg-[#e7c985] dark:text-[#07111f]">Open your Desk</Link><Link href="/exchange" className="rounded-xl border border-[#c4a75f] px-7 py-4 font-black text-[#9b7625] transition hover:-translate-y-1 dark:text-[#e5c978]">Buy or Sell ZCHF</Link></div>
					</div>
				</section>
			</div>
		</>
	);
}

function PreviewPanel() {
	return (
		<div className="relative mx-auto max-w-[58rem]">
			<div className="absolute -inset-5 rounded-[2.5rem] bg-[#c4a75f]/20 blur-3xl dark:bg-[#d7c28a]/10" />
			<div className="relative rounded-[1.75rem] border border-[#9b7625]/45 bg-[#fffaf0]/80 p-5 shadow-[0_36px_110px_rgba(11,31,58,0.18)] backdrop-blur-2xl dark:border-white/25 dark:bg-[#0b1423]/78 dark:shadow-[0_36px_120px_rgba(0,0,0,0.48)] sm:p-7">
				<div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-center gap-3"><img src="/coin/zchf.png" alt="" className="h-10 w-10 rounded-full" /><div className="text-xl font-black text-slate-900 dark:text-white">Frankencoin Desk</div></div>
					<div className="flex items-center gap-3 text-sm font-black"><span className="inline-flex items-center gap-2 rounded-xl bg-slate-900/5 px-4 py-2 dark:bg-white/[0.08]"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Ethereum⌄</span><span className="inline-flex items-center gap-2 rounded-xl bg-slate-900/5 px-4 py-2 dark:bg-white/[0.08]"><span className="h-7 w-7 rounded-full bg-gradient-to-br from-emerald-300 to-violet-500" /> 0x30...864001</span></div>
				</div>
				<div className="mb-5 flex flex-col gap-4 rounded-xl border border-[#c4a75f]/55 bg-[#fff8ea]/70 p-4 dark:bg-[#111c2c]/85 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-center gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-full border border-[#c4a75f]/70 text-[#9b7625] dark:text-[#e5c978]">★</span><div><div className="text-sm font-semibold text-[#9b7625] dark:text-[#d7c28a]">Suggested next action</div><div className="mt-1 font-semibold text-slate-900 dark:text-white">17.90 ZCHF interest is ready to collect.</div></div></div>
					<Link href="/savings" className="group inline-flex min-h-[48px] items-center justify-center gap-3 rounded-lg bg-slate-900/10 px-5 font-black text-slate-900 transition hover:bg-[#c4a75f]/20 dark:bg-white/10 dark:text-white">Manage earning <span className="text-[#9b7625] transition group-hover:translate-x-1 dark:text-[#e5c978]">›</span></Link>
				</div>
				<div className="grid gap-3 md:grid-cols-2">
					{previewCards.map((card) => <PreviewCard key={card.title} {...card} />)}
				</div>
			</div>
		</div>
	);
}

function PreviewCard({ badge, title, amount, copy, extra, button, figure, tone }: (typeof previewCards)[number]) {
	const toneClass: Record<string, string> = {
		blue: "border-blue-500/55 text-blue-600 dark:text-blue-300",
		green: "border-emerald-500/55 text-emerald-600 dark:text-emerald-300",
		brass: "border-[#c4a75f]/75 text-[#9b7625] dark:text-[#e5c978]",
		violet: "border-violet-500/60 text-violet-600 dark:text-violet-300",
	};
	return (
		<article className="group relative min-h-[14.5rem] overflow-hidden rounded-xl border border-slate-900/10 bg-white/55 p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#c4a75f]/70 dark:border-white/10 dark:bg-white/[0.04]">
			<div className="absolute right-7 top-14 flex h-24 w-24 items-center justify-center rounded-full border border-[#c4a75f]/25 bg-slate-900/5 text-2xl font-black text-[#9b7625]/50 dark:bg-white/[0.03] dark:text-[#d7c28a]/40">{figure}</div>
			<span className={`relative inline-flex h-11 w-11 items-center justify-center rounded-full border text-[10px] font-black tracking-[0.16em] ${toneClass[tone]}`}>{badge}</span>
			<h3 className="relative mt-4 font-black text-slate-900 dark:text-white">{title}</h3>
			<div className="relative mt-3 text-3xl font-black text-slate-900 dark:text-white">{amount}</div>
			<p className="relative mt-2 text-sm text-slate-600 dark:text-[#d6cec2]">{copy}</p>
			{extra ? <p className="relative mt-1 text-sm font-black text-emerald-600 dark:text-emerald-300">{extra}</p> : null}
			<div className="relative mt-5 flex min-h-[40px] items-center justify-center rounded-lg bg-slate-900/10 text-sm font-black text-slate-800 transition group-hover:bg-[#c4a75f]/20 dark:bg-white/10 dark:text-white">{button} <span className="ml-2">→</span></div>
		</article>
	);
}
