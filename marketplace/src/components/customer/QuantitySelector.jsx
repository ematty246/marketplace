import { Minus, Plus } from "lucide-react";

export default function QuantitySelector({ value, min = 1, max, onChange, label, disabled }) {
  const clamp = (n) => Math.min(Math.max(min, n), max);
  return (
    <div className="shop-qty" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(clamp(value - 1))} disabled={disabled || value <= min} aria-label="Decrease quantity">
        <Minus size={16} />
      </button>
      <input
        inputMode="numeric"
        aria-label={`${label} quantity`}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
          onChange(Number.isNaN(n) ? min : clamp(n));
        }}
      />
      <button type="button" onClick={() => onChange(clamp(value + 1))} disabled={disabled || value >= max} aria-label="Increase quantity">
        <Plus size={16} />
      </button>
    </div>
  );
}
