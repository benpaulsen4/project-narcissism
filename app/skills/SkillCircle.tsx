import {SkillData} from "../../data/structs";
import styles from "./skills.module.css";
import Image from "next/image";

export default function SkillCircle({data}: {data: SkillData}){
    let sizeName = "size" + data.circleSize;
    let imageSize: number;

    switch (data.circleSize){
        case 1: imageSize = 33;
        break;
        case 2: imageSize = 50;
        break;
        default:
        case 3: imageSize = 70;
        break;
    }
    return (
            <div className={`${styles.circle} ${styles[sizeName]}`} style={{top: data.circleTop, left: data.circleLeft}}>
                <br/>
                <Image src={data.imgUrl} alt={data.name} width={imageSize} height={imageSize}></Image>
                <p className={styles.name}>{data.name}</p>
                <br/>
            </div>
    );
}