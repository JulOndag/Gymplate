import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { firebaseConfig } from '../environments/firebase.config';
export { firebaseConfig };
export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const firestore = initializeFirestore(firebaseApp, { ignoreUndefinedProperties: true });
