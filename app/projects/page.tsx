import styles from "./projects.module.css";
import Project from "./Project";
import dataset from "../../data/projects.json";
import {ProjectData} from "../../data/structs";

export default function Projects(){
    const projects = dataset.data as ProjectData[];

    return (
        <div>
            <div className="d-flex">
                <h1>My Projects</h1>
                <h1 className="slash">/</h1>
            </div>
            <div className={styles.projects}>
                <div className={styles.bar}></div>
                <div className={styles.entries}>
                    {projects.map((p) => <Project data={p} key={p.name} /> )}
                </div>
            </div>
        </div>
    )
}