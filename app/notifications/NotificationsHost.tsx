"use client";

import {useState} from "react";
import {Notification} from "../../data/structs";
import NotificationModal from "./NotificationModal";
import NotificationWidget from "./NotificationWidget";

export default function NotificationsHost() {
  //const [notification, setNotification] = useState<Notification>();
  const [modalOpen, setModal] = useState(false);
  
  const notification = new Notification("Thank you and welcome!", "Thank you for checking out my brand new portfolio website! I'm super excited to show you all what I've done here and how my career has progressed so far. Stay tuned for updates, theres always more in the pipeline! 😀", 0, {name: "Google it", href: "https://google.com"})

  return (
    <>
     {modalOpen &&
     <NotificationModal closeModal={() => setModal(false)} notification={notification} />
     }
    
    {notification &&
    <NotificationWidget onClick={() => setModal(true)} notification={notification} />
    }
    </>
  )
}