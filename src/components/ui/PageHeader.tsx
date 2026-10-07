import type { ReactNode } from "react";
import styles from "./PageHeader.module.css";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
}

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <header className={styles.root}>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1 className={styles.title}>{title}</h1>
      {description && <p className={styles.text}>{description}</p>}
    </header>
  );
}
