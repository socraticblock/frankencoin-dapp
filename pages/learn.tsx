import Head from "next/head";
import JourneyPage from "@components/learn/JourneyPage";

export default function LearnPage() {
	return (
		<>
			<Head>
				<title>How ZCHF Works | Frankencoin Desk</title>
				<meta
					name="description"
					content="Follow the journey of one ZCHF — from research and collateral to savings, challenges, FPS equity, and your role in the Frankencoin system."
				/>
			</Head>
			<JourneyPage />
		</>
	);
}
