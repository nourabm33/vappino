import styles from "./SpecBadge.module.css";

export function SpecBadge({ value, large }: { value: string | null; large?: boolean }) {
  if (!value) return null;
  return (
    <span className={`${styles.badge} ${large ? styles.large : ""}`}>
      <span className="visually-hidden">Spécification : </span>
      {value}
    </span>
  );
}
