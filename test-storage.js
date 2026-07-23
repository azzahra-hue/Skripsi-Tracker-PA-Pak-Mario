import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadString } from "firebase/storage";

const firebaseConfig = {
  projectId: "compelling-stratum-jzp2g",
  appId: "1:38061818683:web:f619f1119d615c8c0ced1e",
  apiKey: "AIzaSyA-PJnvGXxLOW3W5NPpzd609aJp2kf5KIY",
  authDomain: "compelling-stratum-jzp2g.firebaseapp.com",
  storageBucket: "compelling-stratum-jzp2g.firebasestorage.app",
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const storageRef = ref(storage, 'test.txt');

uploadString(storageRef, 'Hello, world!').then((snapshot) => {
  console.log('Uploaded a raw string!');
  process.exit(0);
}).catch((error) => {
  console.error('Upload failed:', error);
  process.exit(1);
});
