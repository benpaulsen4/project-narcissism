"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { logEvent } from "@firebase/analytics";
import AnalyticsHelper from "../../lib/AnalyticsHelper";
import styles from "./nav.module.css";

export default function NavItem({
  name,
  url,
  firebaseConfig,
  isStaging,
}: {
  name: string;
  url: string;
  firebaseConfig?: any;
  isStaging?: boolean;
}) {
  const path = usePathname();

  useEffect(() => {
    if (firebaseConfig && !isStaging) {
      let helper = new AnalyticsHelper();
      let analytics = helper.initialize(firebaseConfig);
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
