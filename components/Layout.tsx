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

	return (
		<div>
			<Head>
				<title>ZCHF Desk</title>
			</Head>

			<Navbar />

			<div className="h-main pt-20 bg-layout-primary">
				<main className={`block mb-24 mx-auto min-h-content text-text-primary ${isLanding ? "max-w-none px-0" : "max-w-6xl space-y-8 px-4 md:px-8 2xl:max-w-7xl"}`}>{children}</main>
				{isLanding ? null : <Footer />}
			</div>
		</div>
	);
};

export default Layout;
