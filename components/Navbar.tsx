import Link from "next/link";
import WalletConnect from "./WalletConnect";
import NavButton from "./NavButton";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import ThemeToggle from "./ThemeToggle";
import useThemeMode from "../hooks/useThemeMode";

type NavItem = { to: string; name: string };

type NavDropdownProps = {
	label: string;
	items: NavItem[];
};

const MAIN_ITEMS: NavItem[] = [
	{ to: "/", name: "Home" },
	{ to: "/desk", name: "Desk" },
	{ to: "/mint", name: "Borrow" },
	{ to: "/equity", name: "Invest" },
	{ to: "/mypositions", name: "Portfolio" },
];

const ZCHF_ITEMS: NavItem[] = [
	{ to: "/exchange", name: "Buy or Sell" },
	{ to: "/savings", name: "Earn" },
	{ to: "/bridge", name: "Bridge" },
	{ to: "/transfer", name: "Transfer" },
];

const ADVANCED_ITEMS: NavItem[] = [
	{ to: "/monitoring", name: "Monitoring" },
	{ to: "/governance", name: "Governance" },
	{ to: "/report", name: "Accounting Report" },
	{ to: "/exchange?route=convert", name: "Stablecoin Bridge" },
];

function NavDropdown({ label, items }: NavDropdownProps) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	const router = useRouter();
	const isActive = items.some((item) => router.pathname === item.to || router.pathname.startsWith(`${item.to}/`));

	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	return (
		<div ref={ref} className="relative">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className={`flex items-center gap-1 md:btn md:btn-nav md:py-2 font-medium hover:bg-menu-hover hover:text-menu-text rounded-lg px-3 ${
					isActive ? "text-menu-textactive bg-menu-active font-semibold" : "text-menu-text"
				}`}
			>
				{label}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}>
					<path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
				</svg>
			</button>
			{open && (
				<div className="absolute top-full right-0 mt-1 grid min-w-[180px] gap-1 rounded-lg border border-menu-separator bg-menu-back px-2 py-1 shadow-md z-50">
					{items.map((item) => (
						<div key={item.to} onClick={() => setOpen(false)}>
							<NavButton to={item.to} name={item.name} />
						</div>
					))}
				</div>
			)}
		</div>
	);
}

export function NavItems({ items }: { items: NavItem[] }) {
	return (
		<>
			{items.map((item) => (
				<li key={item.to}>
					<NavButton to={item.to} name={item.name} />
				</li>
			))}
		</>
	);
}

function MobileNavSection({ title, items }: { title?: string; items: NavItem[] }) {
	return (
		<section className="grid gap-2">
			{title ? <p className="px-3 pt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">{title}</p> : null}
			<menu className="grid grid-cols-1 gap-1">
				<NavItems items={items} />
			</menu>
		</section>
	);
}

export default function Navbar() {
	const [isNavBarOpen, setIsNavBarOpen] = useState(false);
	const [isHidden, setIsHidden] = useState(false);
	const lastScrollY = useRef(0);
	const { theme, toggleTheme } = useThemeMode();

	useEffect(() => {
		const handleScroll = () => {
			const currentScrollY = window.scrollY;
			const scrollingDown = currentScrollY > lastScrollY.current;
			const scrollingUp = currentScrollY < lastScrollY.current;
			if (currentScrollY < 12 || isNavBarOpen) setIsHidden(false);
			else if (scrollingDown && currentScrollY > 80) setIsHidden(true);
			else if (scrollingUp) setIsHidden(false);
			lastScrollY.current = currentScrollY;
		};
		lastScrollY.current = window.scrollY;
		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => window.removeEventListener("scroll", handleScroll);
	}, [isNavBarOpen]);

	return (
		<>
			<div className={`fixed top-0 left-0 right-0 z-20 backdrop-blur border-b-2 border-menu-separator/80 bg-menu-back/80 transition-transform duration-300 ${isHidden ? "-translate-y-full" : "translate-y-0"}`}>
				<header className="relative grid grid-cols-[1fr,auto,1fr] items-center md:py-4 py-3 px-4 w-full">
					<div className="relative z-20 flex items-center md:pl-4">
						<Link href="/" data-umami-event="nav_home" className="flex items-center gap-3">
							<picture><img className="h-9 transition" src="/coin/zchf.png" alt="Logo" /></picture>
							<span className="hidden text-xl font-black tracking-tight text-menu-text md:inline">FRANKENCOIN</span>
						</Link>
					</div>

					<div className="relative z-10 flex min-w-0 justify-center">
						<ul className="hidden md:flex flex-wrap justify-center gap-1 lg:gap-2">
							<li><NavButton to="/" name="Home" /></li>
							<li><NavButton to="/desk" name="Desk" /></li>
							<li><NavDropdown label="ZCHF" items={ZCHF_ITEMS} /></li>
							{MAIN_ITEMS.slice(2).map((item) => (
								<li key={item.to}><NavButton to={item.to} name={item.name} /></li>
							))}
							<li><NavDropdown label="Advanced" items={ADVANCED_ITEMS} /></li>
						</ul>
						<div className="md:hidden"><WalletConnect /></div>
					</div>

					<div className="relative z-30 flex justify-end items-center gap-2 pointer-events-auto">
						<div className="hidden md:flex pointer-events-auto"><ThemeToggle theme={theme} onToggle={toggleTheme} /></div>
						<div className="hidden md:flex pointer-events-auto"><WalletConnect /></div>
						<button onClick={() => setIsNavBarOpen(true)} className="md:hidden p-2 cursor-pointer flex items-center">
							<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
						</button>
					</div>
				</header>
			</div>

			<div className={`md:hidden fixed inset-0 z-20 h-screen w-full bg-black/70 backdrop-blur-sm transition-opacity ${isNavBarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`} onClick={() => setIsNavBarOpen(false)} />
			<div className={`md:hidden fixed top-0 right-0 z-30 h-screen w-72 max-w-[86vw] overflow-y-auto transition-transform duration-200 ${isNavBarOpen ? "translate-x-0" : "translate-x-full"}`}>
				<div className="min-h-full w-full bg-menu-back backdrop-blur px-[16px] pt-[20px] pb-6 relative">
					<button className="absolute top-0 right-0 p-6" onClick={() => setIsNavBarOpen(false)}>
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
					</button>
					<div className="mt-12 mb-5"><ThemeToggle theme={theme} onToggle={toggleTheme} /></div>
					<div className="grid gap-5" onClick={() => setIsNavBarOpen(false)}>
						<MobileNavSection items={MAIN_ITEMS.slice(0, 2)} />
						<MobileNavSection title="ZCHF" items={ZCHF_ITEMS} />
						<MobileNavSection title="Protocol" items={MAIN_ITEMS.slice(2)} />
						<MobileNavSection title="Advanced" items={ADVANCED_ITEMS} />
					</div>
				</div>
			</div>
		</>
	);
}
