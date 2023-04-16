import { FirebaseApp, initializeApp } from "firebase/app";
declare global {
  let appFirebaseInstance: FirebaseApp | undefined;
}
export default class FirebaseConfigHelper {
  constructor(config: any) {
    // @ts-ignore
    if (!globalThis.appFirebaseInstance) {
      // @ts-ignore
      globalThis.appFirebaseInstance = initializeApp(config);
    }
  }

  get firebaseApp() {
    // @ts-ignore
    return globalThis.appFirebaseInstance;
  }
}
