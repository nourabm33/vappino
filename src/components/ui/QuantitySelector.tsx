"use client";

import { MinusIcon, PlusIcon } from "./Icons";
import styles from "./QuantitySelector.module.css";

interface QuantitySelectorProps {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  min?: number;
  max?: number;
  label: string;
  size?: "md" | "sm";
  /** Allows decrementing below `min` (e.g. to remove a cart line). */
  allowBelowMin?: boolean;
}

export function QuantitySelector({
  value,
  onDecrement,
  onIncrement,
  min = 1,
  max = 99,
  label,
  size = "md",
  allowBelowMin,
}: QuantitySelectorProps) {
  return (
    <div className={`${styles.root} ${size === "sm" ? styles.small : ""}`} role="group" aria-label={label}>
      <button
        type="button"
        className={styles.btn}
        onClick={onDecrement}
        disabled={!allowBelowMin && value <= min}
        aria-label="Diminuer la quantité"
      >
        <MinusIcon size={18} />
      </button>
      <span className={styles.value} aria-live="polite" aria-atomic="true">
        <span className="visually-hidden">Quantité : </span>
        {value}
      </span>
      <button
        type="button"
        className={styles.btn}
        onClick={onIncrement}
        disabled={value >= max}
        aria-label="Augmenter la quantité"
      >
        <PlusIcon size={18} />
      </button>
    </div>
  );
}
