import {IBM_Plex_Sans} from '@next/font/google';
import NavItem from './NavItem';
import './styles.css';
import {DbConfig} from "./AnalyticsService";

const IPS = IBM_Plex_Sans({weight: "400"});

export default function RootLayout({children}: { children: React.ReactNode }) {
    const dbConfig = new DbConfig(process.env.DB_NAME, process.env.COLLECTION_NAME);

    return (
        <html className={IPS.className}>
            <head>
                <title>About Me - Ben Paulsen</title>
            </head>
            <body>
            <div className="hero">
                <aside>
                    <NavItem name='About Me' url='/' dbconfig={dbConfig}/>
                    <NavItem name='My Projects' url='/projects'/>
                    <NavItem name='My Skills' url='/skills'/>
                    <NavItem name='My Experience' url='/experience'/>
                </aside>
                <main>
                    {children}
                </main>
            </div>
            <footer>
                This is a <b>beta version</b> of the site - Built with love and NextJS 13.
            </footer>
            </body>
        </html>
    )
}