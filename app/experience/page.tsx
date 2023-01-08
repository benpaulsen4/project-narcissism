import styles from "./experience.module.css";
import dataset from "../../data/experiences.json";
import {ExperienceData} from "../../data/structs";
import ExperienceBox from "./ExperienceBox";

export default function Experience() {
    const experiences = dataset.data as ExperienceData[];

    return (
        <div className="experience">
            <div className="d-flex">
                <h1>My Experience</h1>
                <h1 className="slash">/</h1>
            </div>
            <div className={styles.experiences}>
                {experiences.map((e) => <ExperienceBox data={e} key={e.name}></ExperienceBox>)}

            </div>
        </div>
    )
}