import { IBM_Plex_Sans } from "next/font/google";
import NavItem from "./NavItem";
import "./styles.css";
import { Metadata } from "next";
import NotificationsHost from "./notifications/NotificationsHost";

const IPS = IBM_Plex_Sans({ weight: "400", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "About Me - Ben Paulsen",
  description:
    "My name is Ben, and I am a full-stack developer and digital solutions consultant working from Brisbane, Australia. \
    Check out my portfolio site to see my wide range of experience in a variety of fields and technologies.",
  keywords: [
    "developer",
    "full-stack",
    "web developer",
    ".NET developer",
    "react developer",
    "angular developer",
    "digital solutions",
    "digital consultant",
    "software consulting",
    "brisbane developer",
    "azure developer",
  ],
  colorScheme: "dark",
  viewport: { width: "device-width", initialScale: 1 },
  creator: "Ben Paulsen",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let firebaseConfig;
  if (process.env.NODE_ENV === "production") {
    firebaseConfig = {
      apiKey: process.env.FB_APIKEY,
      authDomain: process.env.FB_AUTH,
      projectId: process.env.FB_PROJECT,
      storageBucket: process.env.FB_STORAGE,
      messagingSenderId: process.env.FB_MESSAGING,
      appId: process.env.FB_APPID,
      measurementId: process.env.FB_MEASUREMENT,
    };
  }

  return (
    <html className={IPS.className}>
      <body>
        <div className="hero">
          <aside>
            <NavItem
              name="About Me"
              url="/"
              firebaseConfig={firebaseConfig}
              isStaging={!!process.env.STAGING}
            />
            <NavItem name="My Projects" url="/projects" />
            <NavItem name="My Skills" url="/skills" />
            <NavItem name="My Experience" url="/experience" />
          </aside>
          <main>{children}</main>
        </div>
        <NotificationsHost firebaseConfig={firebaseConfig}></NotificationsHost>
        <footer>
          This is a <b>beta version</b> of the site - Built with love and NextJS
          13.
        </footer>
      </body>
    </html>
  );
}
