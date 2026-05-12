import { useEffect, useState } from "react";

interface Props {
	currency: string;
	size?: number;
	chain?: string;
}

export default function TokenLogo({ currency, size = 8, chain }: Props) {
	const [imgExist, setImgExist] = useState(true);
	const [chainImgExist, setChainImgExist] = useState(true);
	const [src, setSrc] = useState(`/coin/${currency?.toLowerCase()}.svg`);
	const onImageError = (e: any) => {
		const src = e.target.src;
		if (src.includes(".svg")) {
			setSrc(src.replace(".svg", ".png"));
		} else if (src.includes(".png")) {
			setSrc(src.replace(".png", ".jpeg"));
		} else {
			setImgExist(false);
		}
	};

	useEffect(() => {
		setSrc(`/coin/${currency?.toLowerCase()}.svg`);
		setImgExist(true);
		setChainImgExist(true);
	}, [currency]);

	const fallbackLabel = (currency || "?").replace(/[^a-z0-9]/gi, "").slice(0, 5).toUpperCase() || "?";
	const sizeRem = `${size * 0.25}rem`;

	return imgExist ? (
		<picture className=" relative">
			<img src={src} className={`w-${size} h-${size} rounded-full`} alt="token-logo" onError={onImageError} />
			{chain && chainImgExist && (
				<picture className="absolute -bottom-1 -right-1 p-[1px] rounded-full bg-card-input-border">
					<img
						src={`/chain/${chain.toLowerCase()}.svg`}
						className={`w-3 h-3 rounded-full`}
						alt="token-logo"
						onError={() => setChainImgExist(false)}
					/>
				</picture>
			)}
		</picture>
	) : (
		<span
			className="inline-flex shrink-0 items-center justify-center rounded-full border border-menu-separator bg-card-content-secondary text-[10px] font-semibold text-text-secondary"
			style={{ width: sizeRem, height: sizeRem }}
			title={currency}
		>
			{fallbackLabel}
		</span>
	);
}
