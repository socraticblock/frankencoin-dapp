import Head from "next/head";
import { ReactNode } from "react";
import { useRouter } from "next/router";
import Navbar from "./Navbar";
import Footer from "./Footer";

type LayoutProps = {
	children: NonNullable<ReactNode>;
};

const Layout: React.FC<LayoutProps> = ({ children }) => {
	const router = useRouter();
	const isLanding = router.pathname === "/";
	const isLearn = router.pathname === "/learn";
	const isFullBleed = isLanding || isLearn;

	return (
		<div>
			<Head>
				<title>ZCHF Desk</title>
			</Head>

			<Navbar />

			<div className={`h-main pt-20 ${isLearn ? "bg-[#f4efe6]" : "bg-layout-primary"}`}>
				<main
					className={`block mx-auto min-h-content text-text-primary ${
						isFullBleed ? "max-w-none px-0 mb-0" : "max-w-6xl space-y-8 px-4 md:px-8 2xl:max-w-7xl mb-24"
					}`}
				>
					{children}
				</main>
				{isFullBleed ? null : <Footer />}
			</div>
		</div>
	);
};

export default Layout;
