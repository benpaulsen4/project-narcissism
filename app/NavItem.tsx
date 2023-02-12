"use client";

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect} from "react";
import {Analytics, logEvent} from "@firebase/analytics";
import AnalyticsHelper, {EnvironmentInfo} from "../lib/AnalyticsHelper";

export default function NavItem({name, url, firebaseConfig}: { name: string, url: string, firebaseConfig?: any }) {
    const path = usePathname();
    let environment: EnvironmentInfo;
    let envSet = false;
    let analytics: Analytics | undefined;

    if (firebaseConfig) {
        let helper = new AnalyticsHelper();
        analytics = helper.initialize(firebaseConfig);
        new AnalyticsHelper().getEnvironment().then((value) => {
            environment = value;
            envSet = true;
        });
    }

    useEffect(() => {
        if (firebaseConfig && envSet && analytics) {
            logEvent(analytics, "page_view", {
                date: new Date().toISOString(),
                page: path,
                environment
            });
        }
    }, [path, envSet, analytics]);

    return (
        <>
            <Link className={"navitem" + (path == url ? " navactive" : "")} href={url}>
                {name}
            </Link>

            {/*Styles inlined because of use client*/}
            <style>{`
            .navitem {
                height: 2rem;
                background: rgba(215, 215, 215, 0.15);
                border-radius: 10px;
                margin: 5px 20px;
                display: flex;
                align-items: center;
                justify-content: flex-start;
                padding-left: 8px;
                text-decoration: none;
                color: white;
              }
              
              .navitem:hover {
                background: rgba(215, 215, 215, 0.3);
              }
              
              .navactive {
                background: linear-gradient(90deg, #8E0ADE 0%, rgba(230, 11, 103, 0.5) 111.9%) !important;
              }
            `}</style>
        </>
    )
}