import NavItem from './NavItem';
import './styles.css';

export default function RootLayout({ children }: { children: React.ReactNode }){
    return (
        <html>
            <head>

            </head>
            <body>
                <div className="hero">
                    <aside>
                        <NavItem name='About Me' url='/' />
                        <NavItem name='My Projects' url='/projects' />
                        <NavItem name='My Skills' url='/skills' />
                        <NavItem name='My Experience' url='/experience' />
                    </aside>
                    <main>
                        {children}
                    </main>
                </div>
                <footer>
                Built with devotion, care, and NextJS.
            </footer>
            </body>
        </html>
    )
}