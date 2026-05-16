import type { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => ({
	redirect: {
		destination: "/exchange?route=fiat",
		permanent: false,
	},
});

export default function FiatRedirect() {
	return null;
}
