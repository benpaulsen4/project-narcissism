import styles from "./projects.module.css";
import "../../node_modules/bootstrap-icons/font/bootstrap-icons.css";
import {ProjectData} from "../../data/structs";
import Image from "next/image";

export default function Project({data}: {data: ProjectData}) {
        return (
            <div className={styles.entry}>
                <div className={styles.datestamp}>{data.date} <div className={styles.barbit}></div></div>
                <Image src={data.imgUrl} alt={data.name} />
                <div className={styles.textContent}>
                    <h2 className={styles.title}>{data.name}</h2>
                    <p className={styles.description}>{data.description}</p>
                    <div className="d-flex" style={{marginBottom: "0.25rem"}}>
                        {data.tags.map((t) => <div className={styles.tag} key={t}>{t}</div>)}
                    </div>
                    <div className="d-flex" style={{marginLeft: "-0.5rem"}}>
                        {data.links.map((l) => <a className={styles.link} href={l.href} target="_blank" key={l.name} rel="noreferrer">
                            <i className="bi bi-link-45deg" style={{fontSize: 25}}></i>
                            {l.name}
                        </a> )}
                    </div>
                </div>
            </div>
        )
}