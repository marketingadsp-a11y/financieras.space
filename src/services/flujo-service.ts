
'use server';

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDoc,
  Timestamp,
  orderBy,
  runTransaction,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { FlujoSucursal, FlujoCentralAccount, FlujoEntry } from "@/lib/data";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const sucursalesCollectionRef = collection(db, "flujo_sucursales");
const centralAccountsCollectionRef = collection(db, "flujo_central_accounts");
const entriesCollectionRef = collection(db, "flujo_entries");

// --- Sucursal Functions ---
export async function getFlujoSucursales(prefix: string): Promise<FlujoSucursal[]> {
  const q = query(sucursalesCollectionRef, where("prefix", "==", prefix));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as FlujoSucursal[];
}

export async function getFlujoSucursalById(id: string): Promise<FlujoSucursal | null> {
    const docRef = doc(db, "flujo_sucursales", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { ...docSnap.data(), id: docSnap.id } as FlujoSucursal;
    }
    return null;
}

export async function addFlujoSucursal(sucursalData: Omit<FlujoSucursal, 'id' | 'currentBalance'>): Promise<FlujoSucursal> {
  const data: Omit<FlujoSucursal, 'id'> = { ...sucursalData, prefix: sucursalData.prefix, currentBalance: 0 };
  const docRef = await addDoc(sucursalesCollectionRef, data);
  return { ...data, id: docRef.id };
}

export async function updateFlujoSucursal(id: string, sucursal: Partial<Omit<FlujoSucursal, 'id'>>) {
  const sucursalDoc = doc(db, "flujo_sucursales", id);
  await updateDoc(sucursalDoc, sucursal);
}

export async function deleteFlujoSucursal(id: string) {
  const sucursalDocRef = doc(db, "flujo_sucursales", id);
  const sucursalDoc = await getDoc(sucursalDocRef);

  if (sucursalDoc.exists() && sucursalDoc.data().currentBalance > 0) {
    throw new Error("No se puede eliminar una sucursal con fondos. Retire los fondos primero.");
  }
  await deleteDoc(sucursalDocRef);
}


// --- Dashboard & Central Account Functions ---
export async function getFlujoSummary(prefix: string) {
  const centralAccountDocRef = doc(db, "flujo_central_accounts", prefix);
  const sucursales = await getFlujoSucursales(prefix);

  const accountSnap = await getDoc(centralAccountDocRef);

  let centralAccount: FlujoCentralAccount;
  if (accountSnap.exists()) {
    centralAccount = { id: accountSnap.id, ...accountSnap.data() } as FlujoCentralAccount;
  } else {
    // Default structure if it doesn't exist
    centralAccount = {
      id: prefix,
      prefix: prefix,
      totalEfectivo: 0,
      cajaChica: 0,
    };
  }

  return { centralAccount, sucursales };
}

// --- Flujo Entry Functions ---
export async function addFlujoEntry(entryData: Omit<FlujoEntry, 'id'>) {
    await runTransaction(db, async (transaction) => {
        const sucursalRef = doc(db, 'flujo_sucursales', entryData.sucursalId);
        const sucursalDoc = await transaction.get(sucursalRef);

        if (!sucursalDoc.exists()) {
            throw new Error('La sucursal no existe.');
        }

        const sucursalData = sucursalDoc.data() as FlujoSucursal;
        
        // Calculate new balance
        let newBalance = sucursalData.currentBalance;
        newBalance += entryData.fondo;
        newBalance -= entryData.debeEntregar;
        newBalance += entryData.recuperado;
        newBalance -= entryData.salientes;
        newBalance += entryData.entrantes;

        // Set the new entry
        const entryRef = doc(entriesCollectionRef);
        const dataWithTimestamp = {
            ...entryData,
            date: Timestamp.fromDate(entryData.date),
        };
        transaction.set(entryRef, dataWithTimestamp);

        // Update sucursal balance
        transaction.update(sucursalRef, { currentBalance: newBalance });
    });
}

export async function getFlujoEntriesForWeek(sucursalId: string): Promise<{ entries: FlujoEntry[], dateRange: string }> {
    const today = new Date();
    const dayOfWeek = today.getDay(); // Sunday = 0, Saturday = 6

    // Calculate the date of the most recent Saturday
    const lastSaturday = new Date(today);
    lastSaturday.setDate(today.getDate() - (dayOfWeek === 6 ? 0 : dayOfWeek + 1));
    lastSaturday.setHours(0, 0, 0, 0); // Start of the day

    // Calculate the date of the coming Friday
    const nextFriday = new Date(lastSaturday);
    nextFriday.setDate(lastSaturday.getDate() + 6);
    nextFriday.setHours(23, 59, 59, 999); // End of the day

    const startTimestamp = Timestamp.fromDate(lastSaturday);
    const endTimestamp = Timestamp.fromDate(nextFriday);

    const q = query(
        entriesCollectionRef,
        where("sucursalId", "==", sucursalId),
        where("date", ">=", startTimestamp),
        where("date", "<=", endTimestamp),
        orderBy("date", "asc")
    );
    
    const snapshot = await getDocs(q);

    const entries = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            id: doc.id,
            date: (data.date as Timestamp).toDate()
        }
    }) as FlujoEntry[];

    const dateRange = `Semana del ${format(lastSaturday, "dd 'de' LLLL", { locale: es })} al ${format(nextFriday, "dd 'de' LLLL", { locale: es })}`;

    return { entries, dateRange };
}
