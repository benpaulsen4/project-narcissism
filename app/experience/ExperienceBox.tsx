import { ExperienceData } from "../../data/structs";
import styles from "./experience.module.css";
import Image from "next/image";

export default function ExperienceBox({ data }: { data: ExperienceData }) {
  return (
    <div
      className={`${styles.box} ${data.name == "_filler" ? styles.filler : ""}
        ${data.boxHeight / data.boxWidth >= 1 ? styles.tall : styles.wide}`}
      style={{
        gridColumn: data.startx + " / span " + data.boxWidth,
        gridRow: data.starty + " / span " + data.boxHeight,
      }}
    >
      <Image
        style={{ objectFit: "contain" }}
        src={data.imgUrl}
        alt={data.name}
        width="70"
        height="70"
      ></Image>
      <div className={styles.textContainer}>
        {data.name == "_filler" ? (
          <h3 className={styles.title}>Your Org Here?</h3>
        ) : (
          <>
            <h3 className={styles.title}>
              {data.name} <span style={{ color: "#ff0099" }}>/</span>
            </h3>
            <p className={styles.description}>{data.description}</p>
          </>
        )}
      </div>
    </div>
  );
}
