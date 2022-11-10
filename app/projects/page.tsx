import styles from "./projects.module.css";
import Project from "./Project";

function getData(){
    return [{
            name: "This Website",
            date: "2022, November",
            description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin in eros eu magna malesuada fringilla. Nullam sed purus sit amet ipsum posuere porttitor dictum pellentesque elit. ",
            imgUrl: "https://www.chicken.ca/wp-content/uploads/2013/05/Moist-Chicken-Burgers-1180x580.jpg",
            links: [{name: "GitHub", href:"https://google.com"}, {name: "Other", href: "https://sussy.amogus"}],
            tags: ["TS", "NextJS", "MongoDB"],
        },
        {
            name: "Tanda Job Hub",
            date: "2022, August",
            description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin in eros eu magna malesuada fringilla. Nullam sed purus sit amet ipsum posuere porttitor dictum pellentesque elit. ",
            imgUrl: "https://media.tenor.com/KlR2A_kgIFoAAAAd/aster-arcadia-aster.gif",
            links: [{name: "Deployed Version (by request)", href: "https://sussy.amogus"}],
            tags: ["C#", "ASP.Net", "MongoDB", "Docker"],
        },
            ]
}

export default function Projects(){

    const projects = getData();

    return (
        <div>
            <div className="d-flex">
                <h1>My Projects</h1>
                <h1 className="slash">/</h1>
            </div>
            <div className={styles.projects}>
                <div className={styles.bar}></div>
                <div className={styles.entries}>
                    {projects.map((p) => <Project data={p} /> )}
                </div>
            </div>
        </div>
    )
}