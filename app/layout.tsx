export default function RootLayout({ children }: { children: any }){
    return (
        <html>
            <head></head>
            <body>
                <h1>Layout</h1>
                {children}
            </body>
        </html>
    )
}