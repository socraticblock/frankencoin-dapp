import type { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => ({
	redirect: {
		destination: "/exchange?route=swap",
		permanent: false,
	},
});

export default function SwapRedirect() {
	return null;
}
