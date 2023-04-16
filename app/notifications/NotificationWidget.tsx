import { Notification } from "../../data/structs";
import styles from "./notifications.module.css";

export default function NotificationWidget({
  onClick,
  notification,
}: {
  onClick: () => void;
  notification: Notification;
}) {
  const maxChars = 70;
  let text: string;

  if (notification.content.length > maxChars) {
    text = notification.content.slice(0, maxChars) + "...";
  } else {
    text = notification.content;
  }

  return (
    <div className={styles.widget} onClick={onClick}>
      <i className={`bi bi-info-circle ${styles.icon}`}></i>
      <div className={styles.contentContainer}>
        <h4 className={styles.title}>{notification.title}</h4>
        <p className={styles.content}>
          <span>{text}</span> Click for more
        </p>
      </div>
    </div>
  );
}
