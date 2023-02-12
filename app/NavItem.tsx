"use client";

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect} from "react";
import {logEvent} from "@firebase/analytics";
import AnalyticsHelper from "../lib/AnalyticsHelper";

export default function NavItem({name, url, firebaseConfig}: { name: string, url: string, firebaseConfig?: any }) {
    const path = usePathname();

    useEffect(() => {
        if (firebaseConfig) {
            let helper = new AnalyticsHelper();
            let analytics = helper.initialize(firebaseConfig);
            new AnalyticsHelper().getEnvironment().then((value) => {
                logEvent(analytics!, "page_view", {
                    date: new Date().toISOString(),
                    page: path,
                    environment: value
                });
            });
        }
    }, [path]);

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