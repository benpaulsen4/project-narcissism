import './styles.css';
export default function RootLayout({ children }: { children: any }){
    return (
        <html>
            <head></head>
            <body>
                <div className="hero">
                    {children}
                </div>
            </body>
            <footer>
                Built with devotion, drive, and NextJS.
            </footer>
        </html>
    )
}