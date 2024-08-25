"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./nav.module.css";

export default function NavItem({
  name,
  url,
}: {
  name: string;
  url: string;
  firebaseConfig?: any;
  isStaging?: boolean;
}) {
  const path = usePathname();

  return (
    <Link
      className={styles.navitem + (path == url ? " " + styles.navactive : "")}
      href={url}
    >
      {name}
    </Link>
  );
}
