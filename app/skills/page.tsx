import dataset from "../../data/skills.json";
import SkillCircle from "./SkillCircle";
import {SkillData} from "../../data/structs";

export default function Skills(){
    const skills = dataset.data as SkillData[];

    return (
        <div className="skills">
            <div className="d-flex">
                <h1>My Skills</h1>
                <h1 className="slash">/</h1>
            </div>
            <div className="p-relative">
                {skills.map((s) => <SkillCircle data={s} key={s.name} />)}
            </div>
        </div>
    )
}