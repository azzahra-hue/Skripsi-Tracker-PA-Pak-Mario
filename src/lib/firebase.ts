import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  projectId: "compelling-stratum-jzp2g",
  appId: "1:38061818683:web:f619f1119d615c8c0ced1e",
  apiKey: "AIzaSyA-PJnvGXxLOW3W5NPpzd609aJp2kf5KIY",
  authDomain: "compelling-stratum-jzp2g.firebaseapp.com",
  storageBucket: "compelling-stratum-jzp2g.firebasestorage.app",
  messagingSenderId: "38061818683"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "ai-studio-ce0d3179-d1bc-43ad-8204-3285d7819efa");
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
