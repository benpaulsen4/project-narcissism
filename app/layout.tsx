import {IBM_Plex_Sans} from '@next/font/google';
import NavItem from './NavItem';
import './styles.css';

const IPS = IBM_Plex_Sans({weight: "400", subsets: ["latin"]});

export default function RootLayout({children}: { children: React.ReactNode }) {
    const firebaseConfig = {
        apiKey: process.env.FB_APIKEY,
        authDomain: process.env.FB_AUTH,
        projectId: process.env.FB_PROJECT,
        storageBucket: process.env.FB_STORAGE,
        messagingSenderId: process.env.FB_MESSAGING,
        appId: process.env.FB_APPID,
        measurementId: process.env.FB_MEASUREMENT,
    };

    return (
        <html className={IPS.className}>
            <head>
                <title>About Me - Ben Paulsen</title>
            </head>
            <body>
            <div className="hero">
                <aside>
                    <NavItem name='About Me' url='/' firebaseConfig={firebaseConfig}/>
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