import dataset from "../../data/skills.json";
import SkillCircle from "./SkillCircle";
import { SkillData } from "../../data/structs";
import { Metadata } from "next";
import styles from "./skills.module.css";

export const metadata: Metadata = {
  title: "My Skills - Ben Paulsen",
  description:
    "My name is Ben, and I am a full-stack developer and digital solutions consultant working from Brisbane, Australia. \
    These are my skills that I have accrued over years of study and real-world practice.",
};

export default function Skills() {
  const skills = dataset.data as SkillData[];

  return (
    <div className="skills animate">
      <div className="d-flex">
        <h1>My Skills</h1>
        <h1 className="slash">/</h1>
      </div>
      <div className={styles.circleContainer}>
        {skills.map((s) => (
          <SkillCircle data={s} key={s.name} />
        ))}
      </div>
    </div>
  );
}
