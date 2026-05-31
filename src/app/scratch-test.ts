import * as dotenv from "dotenv";
import { resolve } from "path";
dotenv.config({ path: resolve(process.cwd(), ".env") });
 
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc } from "firebase/firestore";
 
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
 
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
 
async function run() {
  console.log("Firebase config project ID:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
  
  // 1. List Plazas
  const plazasRef = collection(db, "plazas");
  const plazasSnap = await getDocs(plazasRef);
  console.log(`\n--- FOUND ${plazasSnap.size} PLAZAS ---`);
  
  plazasSnap.docs.forEach(docSnap => {
    const data = docSnap.data();
    console.log(`Plaza ID: ${docSnap.id} | Name: ${data.name} | Prefix: ${data.prefix} | ToolContext: ${data.toolContext}`);
  });
 
  // 2. List Carteras
  const carterasRef = collection(db, "loanControlCarteras");
  const carterasSnap = await getDocs(carterasRef);
  console.log(`\n--- FOUND ${carterasSnap.size} CARTERAS ---`);
  carterasSnap.docs.forEach(docSnap => {
    const data = docSnap.data();
    console.log(`Cartera ID: ${docSnap.id} | Name: ${data.name} | PlazaId: ${data.plazaId} | Prefix: ${data.prefix}`);
  });
 
  // 3. List Grupos
  const gruposRef = collection(db, "loanControlGrupos");
  const gruposSnap = await getDocs(gruposRef);
  console.log(`\n--- FOUND ${gruposSnap.size} GRUPOS ---`);
  gruposSnap.docs.forEach(docSnap => {
    const data = docSnap.data();
    console.log(`Grupo ID: ${docSnap.id} | Name: ${data.name} | CarteraId: ${data.carteraId} | PlazaId: ${data.plazaId} | Prefix: ${data.prefix}`);
  });
 
  // 4. List Customers (limit to 10 for overview)
  const customersRef = collection(db, "customers");
  const customersSnap = await getDocs(customersRef);
  console.log(`\n--- FOUND ${customersSnap.size} CUSTOMERS ---`);
  customersSnap.docs.slice(0, 15).forEach(docSnap => {
    const data = docSnap.data();
    console.log(`Customer ID: ${docSnap.id} | Name: ${data.name} | PlazaId: ${data.plazaId} | Prefix: ${data.prefix} | GroupId: ${data.loanControlGroupId} | ToolContext: ${data.toolContext}`);
  });
}
 
run().catch(console.error);
