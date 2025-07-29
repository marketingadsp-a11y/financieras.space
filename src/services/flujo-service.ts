
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
  DocumentSnapshot,
  arrayUnion,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { FlujoSucursal, FlujoCentralAccount, FlujoEntry, FlujoWeeklySummary, FlujoGasto } from "@/lib/data";
import { format, getYear, getISOWeek, startOfWeek, endOfWeek, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { v4 as uuidv4 } from "uuid";

const sucursalesCollectionRef = collection(db, "flujo_sucursales");
const centralAccountsCollectionRef = collection(db, "flujo_central_accounts");
const entriesCollectionRef = collection(db, "flujo_entries");
const weeklySummariesCollectionRef = collection(db, "flujo_weekly_summaries");


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

// --- Flujo Entry & Weekly Summary Functions ---

// Helper function to get week boundaries from Saturday to Friday
const getWeekBoundaries = (date: Date): { start: Date; end: Date; weekId: string } => {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    const day = d.getUTCDay(); // Sunday = 0, Saturday = 6

    const diff = day < 6 ? day + 1 : 0;
    const start = new Date(d);
    start.setUTCDate(d.getUTCDate() - diff);

    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    end.setUTCHours(23, 59, 59, 999);
    
    const year = getYear(start);
    const weekNumber = getISOWeek(start);
    const weekId = `${year}-W${weekNumber}`;

    return { start, end, weekId };
};

export async function addFlujoEntry(entryData: Omit<FlujoEntry, 'id'>) {
    const entryDate = new Date();
    const utcDate = new Date(Date.UTC(entryDate.getUTCFullYear(), entryDate.getUTCMonth(), entryDate.getUTCDate(), 12, 0, 0));
    
    const { start: weekStartDate, end: weekEndDate, weekId } = getWeekBoundaries(utcDate);
    
    await runTransaction(db, async (transaction) => {
        const summaryId = `${entryData.sucursalId}_${weekId}`;
        const summaryRef = doc(db, 'flujo_weekly_summaries', summaryId);
        
        const sucursalRef = doc(db, 'flujo_sucursales', entryData.sucursalId);
        const sucursalDoc = await transaction.get(sucursalRef);

        if (!sucursalDoc.exists()) throw new Error('La sucursal no existe.');
        const sucursalData = sucursalDoc.data() as FlujoSucursal;
        
        let newBalance = sucursalData.currentBalance + entryData.totalCobrado;
        transaction.update(sucursalRef, { currentBalance: newBalance });
        
        const entryRef = doc(collection(db, "flujo_entries"));
        const dataWithTimestamp = { ...entryData, date: Timestamp.fromDate(utcDate), id: entryRef.id };
        transaction.set(entryRef, dataWithTimestamp);

        const summaryDoc = await transaction.get(summaryRef);
        if (!summaryDoc.exists()) {
            const newSummary: FlujoWeeklySummary = {
                id: summaryId,
                sucursalId: entryData.sucursalId,
                weekStartDate: weekStartDate,
                weekEndDate: weekEndDate,
                totalCobradoSemanal: entryData.totalCobrado,
                comisiones: 0,
                gastos: [],
            };
            transaction.set(summaryRef, newSummary);
        } else {
            const currentSummary = summaryDoc.data() as FlujoWeeklySummary;
            transaction.update(summaryRef, {
                totalCobradoSemanal: currentSummary.totalCobradoSemanal + entryData.totalCobrado,
            });
        }
    });
}

export async function getFlujoWeeklySummary(sucursalId: string): Promise<{ summary: FlujoWeeklySummary | null, dateRange: string, entries: FlujoEntry[] }> {
    const today = new Date();
    const { start, end, weekId } = getWeekBoundaries(today);
    
    // Step 1: Query all entries for the sucursal (no date filter here to avoid index error)
    const q = query(
        entriesCollectionRef,
        where("sucursalId", "==", sucursalId),
        orderBy("date", "desc")
    );
    const allEntriesSnapshot = await getDocs(q);
    
    const allEntries = allEntriesSnapshot.docs.map(docSnap => ({
        ...docSnap.data(),
        id: docSnap.id,
        date: (docSnap.data().date as Timestamp).toDate()
    })) as FlujoEntry[];

    // Step 2: Filter entries for the current week in the code
    const weeklyEntries = allEntries.filter(entry => {
        const entryDate = entry.date;
        return entryDate >= start && entryDate <= end;
    });

    const summaryId = `${sucursalId}_${weekId}`;
    const summaryRef = doc(db, 'flujo_weekly_summaries', summaryId);
    
    const summarySnap = await getDoc(summaryRef);
    let summary: FlujoWeeklySummary | null = null;
    if (summarySnap.exists()) {
        const data = summarySnap.data();
        summary = {
            ...data,
            id: summarySnap.id,
            weekStartDate: (data.weekStartDate as Timestamp).toDate(),
            weekEndDate: (data.weekEndDate as Timestamp).toDate(),
            gastos: (data.gastos || []).map((g: any) => ({...g, date: (g.date as Timestamp).toDate()})),
        } as FlujoWeeklySummary;
    } else {
        // If no summary doc exists, create a temporary one for display
        summary = {
            id: summaryId,
            sucursalId,
            weekStartDate: start,
            weekEndDate: end,
            totalCobradoSemanal: weeklyEntries.reduce((acc, e) => acc + e.totalCobrado, 0),
            comisiones: 0,
            gastos: [],
        };
    }

    const dateRange = `Semana del ${format(start, "dd 'de' LLLL", { locale: es })} al ${format(end, "dd 'de' LLLL", { locale: es })}`;

    return { summary, dateRange, entries: weeklyEntries.sort((a,b) => a.date.getTime() - b.date.getTime()) };
}

export async function addGastoToSummary(summaryId: string, gasto: { amount: number, description: string }) {
    const summaryRef = doc(db, 'flujo_weekly_summaries', summaryId);
    const newGasto: FlujoGasto = { ...gasto, id: uuidv4(), date: new Date() };
    await updateDoc(summaryRef, {
        gastos: arrayUnion(newGasto)
    });
}

export async function updateComisionesInSummary(summaryId: string, comisiones: number) {
    const summaryRef = doc(db, 'flujo_weekly_summaries', summaryId);
    await updateDoc(summaryRef, { comisiones });
}
