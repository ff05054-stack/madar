import {initializeApp} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import * as A from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import * as F from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

const app = initializeApp({
  apiKey:"AIzaSyDBpLTfcB3mdyw-7M9Or7IKn9AnGdjNoCU",
  authDomain:"madar-d94c7.firebaseapp.com",
  projectId:"madar-d94c7",
  storageBucket:"madar-d94c7.firebasestorage.app",
  messagingSenderId:"1084532917912",
  appId:"1:1084532917912:web:c3054c50eaaf2fe1f232ed"
});
export const auth = A.getAuth(app);
export const db = F.getFirestore(app);
export {A, F};
