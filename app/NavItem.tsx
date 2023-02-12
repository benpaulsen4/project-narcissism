"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {useEffect} from "react";
import AnalyticsService, {DbConfig} from "./AnalyticsService";

export default function NavItem({name, url, dbconfig}: {name: string, url: string, dbconfig?: DbConfig}){
    const path = usePathname();
    let analyticsService: AnalyticsService;

    useEffect(() => {
        const analyze = async () => {
            if (dbconfig) {
                if (!analyticsService.initialized) {
                    await analyticsService.initialize(dbconfig);
                }
                await analyticsService.collect(path);
            }
        };

        analyze()
        .catch(console.error);
    }, [dbconfig, path]);

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