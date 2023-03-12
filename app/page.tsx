import Ticker from "./Ticker";
import "bootstrap-icons/font/bootstrap-icons.css";

export default function Home() {
  return (
    <div className="home">
      <h1>Ben Paulsen</h1>
      <Ticker />
      <div className="profile-image"></div>
      <p>
        Hi! My name is Ben and I am an experienced software developer in
        Brisbane, Australia. I take great pride in my work and I always seek to
        inspire my peers to perform at their best. I have loved anything
        technology-related since I was a kid, and I am always excited to take on
        and manage new challenges in my life and career.
      </p>

      <p>
        I am currently working at Gruntify, a small GIS startup that focuses on
        delivering a high-quality work management product for companies dealing
        with geospatial work. In my role, I work with our .NET API and
        Angular-based web front end regularly - all as part of an Azure-deployed
        solution. As well as standard development work, I assist in tailoring
        personalized solutions to our entierprise clients thanks to my combined
        Computer Science/Business Management backgrounds.
      </p>

      <p>
        On the side, I often dabble in side projects both to keep me entertained
        as well as provide some valueable learning opportunities. I beleive this
        has greatly contributed to my abilities as a developer, and best allowed
        my to apply my formal teachings from university before entering the
        professional space. Please check out the Projects page as well as the
        Experience page if you have the chance, as together they form a
        well-rounded depiction of how I have applied my various skills.
      </p>

      <div className="d-flex">
        <h2>Connect With Me</h2>
        <h2 className="slash">/</h2>
      </div>
      <div className="d-flex bigger flex-center contact-links">
        <a
          href="https://www.linkedin.com/in/ben-paulsen-26979b237/"
          className="d-flex flex-center"
          target="_blank"
          rel="noreferrer"
        >
          <i className="bi bi-linkedin"></i>
          LinkedIn
        </a>

        <a
          href="https://github.com/benpaulsen4"
          className="d-flex flex-center"
          target="_blank"
          rel="noreferrer"
        >
          <i className="bi bi-github"></i>
          GitHub
        </a>

        <a href="mailto:ben.paulsen4@gmail.com" className="d-flex flex-center">
          <i className="bi bi-envelope-fill"></i>
          Email
        </a>
      </div>
    </div>
  );
}
