import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
const firebaseConfig = {
  projectId: "compelling-stratum-jzp2g",
  appId: "1:38061818683:web:f619f1119d615c8c0ced1e",
  apiKey: "AIzaSyA-PJnvGXxLOW3W5NPpzd609aJp2kf5KIY",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
createUserWithEmailAndPassword(auth, "test@test.local", "123456").then(console.log).catch(e => console.error(e.code));
