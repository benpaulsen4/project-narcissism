import {FirebaseApp, initializeApp} from "firebase/app";
import 'firebase/analytics';
import {Analytics, getAnalytics} from "@firebase/analytics";

const firebaseConfig = {
    apiKey: process.env.FB_APIKEY,
    authDomain: process.env.FB_AUTH,
    projectId: process.env.FB_PROJECT,
    storageBucket: process.env.FB_STORAGE,
    messagingSenderId: process.env.FB_MESSAGING,
    appId: process.env.FB_APPID,
    measurementId: process.env.FB_MEASUREMENT,
};
let app: FirebaseApp;
let analytics: Analytics;

if (process.env.NODE_ENV === 'production'){
    app = initializeApp(firebaseConfig)
    analytics = getAnalytics(app)
}

export { app, analytics };