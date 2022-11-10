import styles from "./projects.module.css";
import "../../node_modules/bootstrap-icons/font/bootstrap-icons.css";

export default function Project({data}: {data: {name: string,
    date: string, description: string, imgUrl: string,
    links:{name: string, href: string}[], tags: string[]}}) {
        return (
            <div className={styles.entry}>
                <div className={styles.datestamp}>{data.date} <div className={styles.barbit}></div></div>
                <img src={data.imgUrl} />
                <div className={styles.textContent}>
                    <h2 className={styles.title}>{data.name}</h2>
                    <p className={styles.description}>{data.description}</p>
                    <div className="d-flex" style={{marginBottom: "0.25rem"}}>
                        {data.tags.map((t) => <div className={styles.tag} key={t}>{t}</div>)}
                    </div>
                    <div className="d-flex" style={{marginLeft: "-0.5rem"}}>
                        {data.links.map((l) => <a className={styles.link} href={l.href} target="_blank" key={l.name}>
                            <i className="bi bi-link-45deg" style={{fontSize: 25}}></i>
                            {l.name}
                        </a> )}
                    </div>
                </div>
            </div>
        )
}