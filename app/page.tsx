import Ticker from "./Ticker";

export default function Home(){
    return (
        <div className="home">
            <h1>Ben Paulsen</h1>
            <Ticker />
            <p>MAKE SURE TO CHANGE THIS I am a passionate person; I take great pride in my work and always seek to inspire my peers to perform at their best. I have loved anything technology-related since I was a kid, and I am always excited to take on and manage new challenges in my life and career. </p>

            <p>In my years of experience at Woolworths, I have seen first-hand how poorly architected and deployed digital solutions can affect all stakeholders - from front-line employees to customers. It is my personal mission to use my natural talent for digital systems design and implementation, in combination with my business and interpersonal knowledge, to develop systems that put people first. I can't achieve such an ambitious goal alone, however, and I am ever eager to be part of a team of talented individuals with the same aspirations.</p>
            <div className="d-flex">
                <h2>Connect With Me</h2>
                <h2 className="slash">/</h2>
            </div>
        </div>
    )
}