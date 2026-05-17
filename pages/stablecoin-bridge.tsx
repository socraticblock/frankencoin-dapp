import type { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => ({
	redirect: {
		destination: "/exchange?route=convert",
		permanent: false,
	},
});

export default function StablecoinBridgeRedirect() {
	return null;
}
