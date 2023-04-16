"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { logEvent } from "@firebase/analytics";
import AnalyticsHelper from "../lib/AnalyticsHelper";
import styles from "./nav.module.css";
import firebaseApp from "../lib/FirebaseConfig";

export default function NavItem({
  name,
  url,
  isStaging
}: {
  name: string;
  url: string;
  isStaging?: boolean;
}) {
  const path = usePathname();

  useEffect(() => {
    if (firebaseApp && !isStaging) {
      let helper = new AnalyticsHelper();
      let analytics = helper.initialize();
      helper.getEnvironment().then((value) => {
        logEvent(analytics!, "page_engagement", {
          date: new Date().toISOString(),
          page: path,
          ua: value.userAgent,
          ip: value.ip,
        });
      });
    }
  }, [path]);

  return (
    <Link
      className={styles.navitem + (path == url ? " " + styles.navactive : "")}
      href={url}
    >
      {name}
    </Link>
  );
}
