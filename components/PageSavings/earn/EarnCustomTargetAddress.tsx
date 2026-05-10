import AppToggle from "@components/AppToggle";
import AddressInput from "@components/Input/AddressInput";

export type EarnCustomTargetAddressProps = {
	enabled: boolean;
	address: string;
	error: string;
	onEnabledChange: (enabled: boolean) => void;
	onAddressChange: (value: string) => void;
};

export default function EarnCustomTargetAddress({
	enabled,
	address,
	error,
	onEnabledChange,
	onAddressChange,
}: EarnCustomTargetAddressProps) {
	return (
		<>
			{enabled ? (
				<AddressInput label="To address" placeholder="0x1a2b3c..." error={error} value={address} onChange={onAddressChange} />
			) : null}
			<AppToggle disabled={false} label="Custom target address" enabled={enabled} onChange={onEnabledChange} />
		</>
	);
}
