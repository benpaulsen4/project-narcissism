import styles from "./notifications.module.css";
import { Notification } from "../../data/structs";
import Button from "../Button";
import { motion } from "framer-motion";

export default function NotificationModal({
  notification,
  closeModal,
}: {
  notification: Notification;
  closeModal: () => void;
}) {
  return (
    <motion.div initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity:0}} transition={{duration: 0.25}} className={styles.backdrop}>
      <motion.div key="modal" initial={{y: -300, opacity: 0}} animate={{y:0, opacity: 1}} exit={{y:300, opacity:0}} transition={{ type: "spring",  duration: 0.75 }} className={styles.modal}>
        <div className={styles["modal-header"]}>
          <i className="bi bi-info-circle"></i>
          <h3>Announcement: {notification.title}</h3>
        </div>
        <div>{notification.content}</div>
        <div className={styles["modal-footer"]}>
          <Button onClick={closeModal} type="secondary">
            Close
          </Button>
          <Button href={notification.action.href} type="primary">
            {notification.action.name}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
