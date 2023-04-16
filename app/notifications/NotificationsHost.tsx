"use client";

import { useEffect, useState } from "react";
import { Notification } from "../../data/structs";
import NotificationModal from "./NotificationModal";
import NotificationWidget from "./NotificationWidget";
import {
  doc,
  getDoc,
  getFirestore,
  DocumentSnapshot,
} from "@firebase/firestore";
import FirebaseConfigHelper from "../../lib/FirebaseConfig";

export default function NotificationsHost({
  firebaseConfig,
}: {
  firebaseConfig?: any;
}) {
  const [notification, setNotification] = useState<Notification>();
  const [modalOpen, setModal] = useState(false);

  useEffect(() => {
    if (firebaseConfig) {
      const app = new FirebaseConfigHelper(firebaseConfig).firebaseApp;
      const db = getFirestore(app);
      let document: DocumentSnapshot;
      getDoc(doc(db, "siteData", "ANNOUNCEMENT"))
        .then((result) => (document = result))
        .then(() => {
          if (document.exists()) {
            const data = document.data();
            setNotification({
              title: data["title"],
              content: data["content"],
              action: data["action"],
            });
          }
        });
    }
  }, []);

  //  const notification = new Notification(
  //    "Thank you and welcome!",
  //    "Thank you for checking out my brand new portfolio website! I'm super excited to show you all what I've done here and how my career has progressed so far. Stay tuned for updates, theres always more in the pipeline! 😀",
  //    { name: "Google it", href: "https://google.com" }
  //  );

  return (
    <>
      {modalOpen && notification && (
        <NotificationModal
          closeModal={() => setModal(false)}
          notification={notification}
        />
      )}

      {notification && (
        <NotificationWidget
          onClick={() => setModal(true)}
          notification={notification}
        />
      )}
    </>
  );
}
