import { FirebaseApp, getApps, initializeApp } from "firebase/app";

let firebaseConfig;
if (process.env.NODE_ENV === "production") {
  firebaseConfig = {
    apiKey: process.env.FB_APIKEY,
    authDomain: process.env.FB_AUTH,
    projectId: process.env.FB_PROJECT,
    storageBucket: process.env.FB_STORAGE,
    messagingSenderId: process.env.FB_MESSAGING,
    appId: process.env.FB_APPID,
    measurementId: process.env.FB_MEASUREMENT,
  };
}

let firebaseApp: FirebaseApp | undefined;
if (firebaseConfig)
  firebaseApp =
    getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export default firebaseApp;