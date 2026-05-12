import * as React from "react";
import { formatUnits, parseUnits } from "@ethersproject/units";
import { BigNumber } from "@ethersproject/bignumber";

export type BigNumberInputProps = {
	inputRefChild?: React.RefObject<HTMLInputElement>;
	decimals?: number;
	value: string;
	onChange?: (value: string) => void;
	autoFocus?: boolean;
	placeholder?: string;
	max?: string;
	min?: string;
	className?: string;
	disabled?: boolean;
	maxDisplayDecimals?: number;
};

function formatDisplayUnits(value: string, decimals: number, maxDisplayDecimals?: number) {
	const formatted = formatUnits(value, decimals);
	if (maxDisplayDecimals === undefined) return formatted;
	const [whole, fraction = ""] = formatted.split(".");
	if (fraction.length <= maxDisplayDecimals) return formatted;
	const trimmedFraction = fraction.slice(0, maxDisplayDecimals).replace(/0+$/, "");
	return trimmedFraction.length > 0 ? `${whole}.${trimmedFraction}` : whole;
}

export function BigNumberInput({
	inputRefChild,
	decimals = 18,
	value,
	onChange,
	autoFocus,
	placeholder = "0.00",
	max,
	min,
	className,
	disabled,
	maxDisplayDecimals,
}: BigNumberInputProps) {
	const inputRefFallback = React.useRef<HTMLInputElement>(null);
	const inputRef = inputRefChild || inputRefFallback;

	const [inputValue, setInputvalue] = React.useState("0");

	// update current value
	React.useEffect(() => {
		if (value.length == 0) {
			setInputvalue("0");
		} else {
			let parseInputValue;

			try {
				parseInputValue = parseUnits(inputValue || "0", decimals);
			} catch (e) {
				console.log(e);
				// do nothing
			}

			if (!parseInputValue || !parseInputValue.eq(value)) {
				setInputvalue(formatDisplayUnits(value, decimals, maxDisplayDecimals));
			}
		}
	}, [value, decimals, inputValue, maxDisplayDecimals]);

	React.useEffect(() => {
		if (autoFocus && inputRef) {
			const node = inputRef.current as HTMLInputElement;
			node.focus();
		}
	}, [autoFocus, inputRef]);

	const updateValue = (event: React.ChangeEvent<HTMLInputElement>) => {
		// @dev: often copying and pasting values will include a tail space
		const value = event.currentTarget.value.split(" ").join("");

		if (value === "") {
			onChange?.(value);
			setInputvalue(value);
			return;
		}

		let newValue: BigNumber;
		try {
			newValue = parseUnits(value, decimals);
		} catch (e) {
			console.log(e);
			// don't update the input on invalid values
			return;
		}

		const invalidValue = (min && newValue.lt(min)) || (max && newValue.gt(max));
		if (invalidValue) {
			return;
		}

		setInputvalue(value);
		onChange?.(newValue.toString());
	};

	const handleFocus = () => {
		if (inputValue === "0") {
			setInputvalue("");
		}
	};

	const handleBlur = () => {
		if (inputValue === "") {
			setInputvalue("0");
			onChange?.("0");
		}
	};

	const inputProps = {
		placeholder,
		onChange: updateValue,
		onFocus: handleFocus,
		onBlur: handleBlur,
		type: "text",
		value: inputValue,
		className: "truncate bg-transparent " + className,
		autoFocus,
		disabled,
	};

	return (
		<div className="">
			<input {...inputProps} ref={inputRef} />
		</div>
	);
}
