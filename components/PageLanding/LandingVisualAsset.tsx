import Image from "next/image";
import type { LandingVisualKey } from "./landingContent";

type Props = {
	visual: LandingVisualKey;
	size?: "hero" | "card" | "icon" | "watermark";
	className?: string;
};

const VISUAL_LABEL: Record<LandingVisualKey, string> = {
	desk: "Desk",
	zchf: "ZCHF",
	earn: "SAVE",
	move: "MOVE",
	borrow: "DEBT",
	fps: "FPS",
};

const VISUAL_TONE: Record<LandingVisualKey, string> = {
	desk: "from-[#f2d69a] via-[#8ca4c4] to-[#07111f]",
	zchf: "from-[#f1d18f] via-[#d8e6f2] to-[#16345a]",
	earn: "from-[#54d99a] via-[#b8e8d3] to-[#102d31]",
	move: "from-[#8ab7ff] via-[#8a6be8] to-[#10172a]",
	borrow: "from-[#d6b06b] via-[#6f7d8e] to-[#111827]",
	fps: "from-[#f0d28f] via-[#a18448] to-[#172033]",
};

const SIZE_CLASS = {
	hero: "h-44 w-44 sm:h-56 sm:w-56",
	card: "h-20 w-20",
	icon: "h-11 w-11",
	watermark: "h-52 w-52",
};

const SURFACE_CLASS = {
	hero: "shadow-[inset_0_0_28px_rgba(255,255,255,0.32),0_22px_50px_rgba(3,10,24,0.26)]",
	card: "shadow-[inset_0_0_22px_rgba(255,255,255,0.28),0_10px_24px_rgba(3,10,24,0.16)]",
	icon: "shadow-[inset_0_0_14px_rgba(255,255,255,0.22)]",
	watermark: "shadow-[inset_0_0_20px_rgba(255,255,255,0.18)]",
};

const TEXT_CLASS = {
	hero: "text-lg",
	card: "text-[10px]",
	icon: "text-[9px]",
	watermark: "text-lg",
};

const IMAGE_DIMENSION = {
	hero: 224,
	card: 80,
	icon: 44,
	watermark: 208,
};

const IMAGE_SIZES = {
	hero: "(min-width: 640px) 224px, 176px",
	card: "80px",
	icon: "44px",
	watermark: "208px",
};

export default function LandingVisualAsset({ visual, size = "icon", className = "" }: Props) {
	if (visual === "zchf" && size === "watermark") return null;

	if (visual === "zchf") {
		const imageShadow =
			size === "icon"
				? "drop-shadow-[0_6px_12px_rgba(15,23,42,0.12)] dark:drop-shadow-[0_8px_14px_rgba(0,0,0,0.3)]"
				: "drop-shadow-[0_14px_26px_rgba(15,23,42,0.16)] dark:drop-shadow-[0_14px_28px_rgba(0,0,0,0.36)]";
		return (
			<div aria-hidden="true" className={`relative shrink-0 ${SIZE_CLASS[size]} ${className}`}>
				<div className="absolute inset-0 rounded-full bg-[#d6bd7c]/24 blur-xl dark:bg-[#d6bd7c]/16" />
				<Image
					src="/visuals/frankencoin/zchf-medallion.webp"
					alt=""
					width={IMAGE_DIMENSION[size]}
					height={IMAGE_DIMENSION[size]}
					sizes={IMAGE_SIZES[size]}
					className={`relative h-full w-full object-contain ${imageShadow}`}
				/>
			</div>
		);
	}

	return (
		<div
			aria-hidden="true"
			className={`relative shrink-0 ${SIZE_CLASS[size]} ${className}`}
		>
			<div className={`absolute inset-0 rounded-full bg-gradient-to-br ${VISUAL_TONE[visual]} opacity-90 blur-[1px]`} />
			<div className={`absolute inset-[10%] rounded-full border border-white/40 bg-[#fffaf0]/45 ${SURFACE_CLASS[size]} dark:border-[#e6c985]/35 dark:bg-[#101a2a]/70`} />
			<div className="absolute inset-[23%] rounded-[32%] border border-[#d6bd7c]/70 bg-[#07111f]/80 shadow-[inset_0_0_22px_rgba(230,201,133,0.18)]" />
			<div className="absolute left-[22%] right-[22%] top-[18%] h-px bg-white/35" />
			<div className="absolute bottom-[18%] left-[20%] right-[20%] h-px bg-[#d6bd7c]/40" />
			<div className="absolute inset-0 flex items-center justify-center">
				<span className={`${TEXT_CLASS[size]} font-black tracking-[0.18em] text-[#fff7df] drop-shadow`}>
					{VISUAL_LABEL[visual]}
				</span>
			</div>
			{visual === "move" ? <div className="absolute left-[12%] right-[12%] top-1/2 h-[2px] -translate-y-1/2 bg-[#9cc7ff]/70" /> : null}
			{visual === "earn" ? <div className="absolute bottom-[28%] left-[30%] h-[28%] w-[40%] rounded-t-full border-t-2 border-[#5ff0ad]/80" /> : null}
		</div>
	);
}
