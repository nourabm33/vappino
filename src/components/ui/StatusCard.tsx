import type { ReactNode } from "react";
import styles from "./StatusCard.module.css";

interface StatusCardProps {
  tone: "success" | "error" | "neutral";
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  logo?: ReactNode;
}

export function StatusCard({ tone, icon, title, description, children, actions, logo }: StatusCardProps) {
  return (
    <section className={`${styles.root} ${styles[tone]}`} aria-labelledby="status-title">
      {logo}
      <span className={styles.icon} aria-hidden="true">
        {icon}
      </span>
      <h1 id="status-title" className={styles.title}>
        {title}
      </h1>
      {description && <p className={styles.text}>{description}</p>}
      {children && <div className={styles.body}>{children}</div>}
      {actions && <div className={styles.actions}>{actions}</div>}
    </section>
  );
}
