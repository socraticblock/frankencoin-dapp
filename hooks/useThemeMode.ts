import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark";

const STORAGE_KEY = "zchf-theme-mode";

function getInitialTheme(): ThemeMode {
	if (typeof window === "undefined") return "light";
	const saved = window.localStorage.getItem(STORAGE_KEY);
	if (saved === "light" || saved === "dark") return saved;
	return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function useThemeMode() {
	const [theme, setTheme] = useState<ThemeMode>("light");

	useEffect(() => {
		const initial = getInitialTheme();
		setTheme(initial);
	}, []);

	useEffect(() => {
		if (typeof document === "undefined") return;
		document.documentElement.classList.toggle("dark", theme === "dark");
		window.localStorage.setItem(STORAGE_KEY, theme);
	}, [theme]);

	return {
		theme,
		toggleTheme: () => setTheme((prev) => (prev === "light" ? "dark" : "light")),
		setTheme,
	};
}
