/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./pages/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./node_modules/flowbite-react/lib/**/*.js"],
	safelist: [
		{
			pattern: /grid-cols-/,
			variants: ["sm", "md", "lg", "xl", "2xl"],
		},
	],
	theme: {
		fontFamily: {
			default: ["Avenir", "Helvetica", "sans-serif"],
		},
		extend: {
			height: {
				main: "calc(100vh)",
			},
			minHeight: {
				content: "calc(100vh - 230px)",
			},
			transitionProperty: {
				height: "height",
			},
			colors: {
				layout: {
					primary: "#F7F3EA",
					secondary: "#FFFDF8",
					footer: "#151C28",
				},
				menu: {
					text: "#111827",
					textactive: "#0B1F3A",
					active: "#EFEAE0",
					hover: "#F0ECE4",
					back: "#FFFDF8",
					separator: "#E4DED2",
				},
				card: {
					input: {
						label: "#5D647B",
						disabled: "#F5F6F9",
						empty: "#ADB2C2",
						focus: "#3E96F4",
						error: "#E02523",
						border: "#F0F1F5",
						hover: "#0F80F0",
						min: "#065DC1",
						max: "#065DC1",
						reset: "#065DC1", // alt: #fee2e2
					},
					body: {
						primary: "#FFFFFF",
						secondary: "#092f62",
						seperator: "#1e293b",
					},
					content: {
						primary: "#F5F6F9",
						secondary: "#FFFFFF",
						highlight: "#ff293b",
					},
				},
				text: {
					header: "#111827",
					subheader: "#4B5563",
					active: "#0B1F3A",
					primary: "#101827",
					secondary: "#4B5563",
					warning: "#B42318",
					success: "#0E7A4F",
				},
				table: {
					header: {
						primary: "#FFFFFF",
						secondary: "#F0F1F5",
					},
					row: {
						primary: "#FFFFFF",
						secondary: "#F0F1F5",
						hover: "#F5F6F9",
					},
				},
				button: {
					default: "#092F62",
					hover: "#0F80F0",
					disabled: "#EAEBF0",
					textdisabled: "#ADB2C2",
				},
			},
		},
	},
	darkMode: "class",
	plugins: [require("flowbite/plugin")({ charts: true })],
};
