import styles from "./experience.module.css";
import dataset from "../../data/experiences.json";
import { ExperienceData } from "../../data/structs";
import ExperienceBox from "./ExperienceBox";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Experience - Ben Paulsen",
  description:
    "My name is Ben, and I am a full-stack developer and digital solutions consultant working from Brisbane, Australia. \
    Here is the experienced I have garnered through my university degree and various jobs in the industry.",
};

export default function Experience() {
  const experiences = dataset.data as ExperienceData[];

  return (
    <div className="experience animate">
      <div className="d-flex">
        <h1>My Experience</h1>
        <h1 className="slash">/</h1>
      </div>
      <div className={styles.experiences}>
        {experiences.map((e) => (
          <ExperienceBox data={e} key={e.name} />
        ))}
      </div>
    </div>
  );
}
