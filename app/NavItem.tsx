"use client";

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect} from "react";
import {analytics} from "../lib/firebase";
import {logEvent} from "@firebase/analytics";
import AnalyticsHelper, {EnvironmentInfo} from "../lib/AnalyticsHelper";

export default function NavItem({name, url}: { name: string, url: string }) {
    const path = usePathname();
    let environment: EnvironmentInfo;
    let envSet = false;

    if (process.env.NODE_ENV === 'production') {
        new AnalyticsHelper().getEnvironment().then((value) => {
            environment = value;
            envSet = true;
        });
    }

    useEffect(() => {
        if (process.env.NODE_ENV === 'production' && envSet) {
            logEvent(analytics, "page_view", {
                date: new Date().toISOString(),
                page: path,
                environment
            });
        }
    }, [path, envSet]);

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