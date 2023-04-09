import styles from './notifications.module.css'
import {Notification} from "../../data/structs";
import Button from "../Button";

export default function NotificationModal({notification, closeModal}: {notification: Notification, closeModal: () => void}){
  
  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles['modal-header']}>
          <i className="bi bi-info-circle"></i>
          <h3>Announcement: {notification.title}</h3>
        </div>
        <div>{notification.content}</div>
        <div className={styles['modal-footer']}>
          <Button onClick={closeModal} type="secondary">
            Close
          </Button>
          <Button href={notification.action.href} type="primary">
            {notification.action.name}
          </Button>
        </div>
      </div>
    </div>
  )
}