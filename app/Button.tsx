import { ReactNode } from "react";
import styles from "./button.module.css";

export default function Button({
  onClick,
  type,
  children,
  href,
}: {
  onClick?: () => void;
  type: "primary" | "secondary";
  children: ReactNode;
  href?: string;
}) {
  return (
    <a
      className={`${styles.button} ${styles[type]}`}
      onClick={onClick}
      href={href}
    >
      <span className={styles.text}>{children}</span>
    </a>
  );
}
