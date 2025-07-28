
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

export async function getFlujoEntriesForWeek(sucursalId: string, currentDate: Date): Promise<{ entries: FlujoEntry[], dateRange: string }> {
    const today = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate()));
    
    // Day of week: 0 for Sunday, 6 for Saturday. We want to treat Saturday as the start (day 6).
    const dayOfWeek = today.getUTCDay(); 
    
    // Days to subtract to get to the last Saturday
    // If today is Saturday (6), subtract 0. If Sunday (0), subtract 1. If Monday (1), subtract 2...
    const daysSinceSaturday = (dayOfWeek + 1) % 7;

    const startOfWeek = new Date(today);
    startOfWeek.setUTCDate(today.getUTCDate() - daysSinceSaturday);
    startOfWeek.setUTCHours(0, 0, 0, 0);

    // End of the week is 6 days after the start (Friday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6);
    endOfWeek.setUTCHours(23, 59, 59, 999);
    
    // Get ALL entries for the sucursal and filter in code
    const allEntriesQuery = query(entriesCollectionRef, where("sucursalId", "==", sucursalId));
    const snapshot = await getDocs(allEntriesQuery);

    const allEntries = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            id: doc.id,
            date: (data.date as Timestamp).toDate()
        }
    }) as FlujoEntry[];

    const entries = allEntries
        .filter(entry => {
            const entryDate = entry.date;
            return entryDate >= startOfWeek && entryDate <= endOfWeek;
        })
        .sort((a, b) => a.date.getTime() - b.date.getTime());


    const dateRange = `Semana del Sábado ${format(startOfWeek, 'dd MMM', { locale: es })} al Viernes ${format(endOfWeek, 'dd MMM', { locale: es })}`;

    return { entries, dateRange };
}
