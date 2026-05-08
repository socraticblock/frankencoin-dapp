interface Props {
	theme: "light" | "dark";
	onToggle: () => void;
}

export default function ThemeToggle({ theme, onToggle }: Props) {
	return (
		<button
			onClick={onToggle}
			type="button"
			className="btn btn-small border border-menu-separator bg-card-body-primary text-text-primary"
			aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
		>
			{theme === "light" ? "Dark mode" : "Light mode"}
		</button>
	);
}
