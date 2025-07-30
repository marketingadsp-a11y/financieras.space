

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
  setDoc,
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

const getWeekBoundaries = (date: Date): { start: Date; end: Date; weekId: string } => {
    // Clone the date to avoid modifying the original
    const d = new Date(date.getTime());
    d.setUTCHours(0, 0, 0, 0);

    // In this logic, Saturday (6) is the start of the week.
    const dayOfWeek = d.getUTCDay(); // Sunday = 0, Saturday = 6

    // Calculate the difference to get to the last Saturday
    const diffToSaturday = (dayOfWeek < 6) ? (dayOfWeek + 1) : 0;
    const startDate = new Date(d.getTime());
    startDate.setUTCDate(d.getUTCDate() - diffToSaturday);

    // Friday is 6 days after Saturday
    const endDate = new Date(startDate.getTime());
    endDate.setUTCDate(startDate.getUTCDate() + 6);
    endDate.setUTCHours(23, 59, 59, 999);
    
    const year = getYear(startDate);
    const weekNumber = getISOWeek(startDate);
    const weekId = `${year}-W${weekNumber}`;
    
    return { start: startDate, end: endDate, weekId };
};

export async function addFlujoEntry(entryData: Omit<FlujoEntry, 'id'>) {
    const entryDate = new Date(); // Use current date for the entry
    
    const { start: weekStartDate, end: weekEndDate, weekId } = getWeekBoundaries(entryDate);
    
    await runTransaction(db, async (transaction) => {
        // --- 1. ALL READS FIRST ---
        const summaryId = `${entryData.sucursalId}_${weekId}`;
        const summaryRef = doc(db, 'flujo_weekly_summaries', summaryId);
        const sucursalRef = doc(db, 'flujo_sucursales', entryData.sucursalId);
        const entryRef = doc(collection(db, "flujo_entries"));
        
        const sucursalDoc = await transaction.get(sucursalRef);
        const summaryDoc = await transaction.get(summaryRef);

        if (!sucursalDoc.exists()) throw new Error('La sucursal no existe.');
        
        // --- 2. PREPARE DATA & CALCULATIONS ---
        const sucursalData = sucursalDoc.data() as FlujoSucursal;
        let newBalance = sucursalData.currentBalance + entryData.totalCobrado;
        const dataWithTimestamp = { ...entryData, date: Timestamp.fromDate(entryDate), id: entryRef.id };

        // --- 3. ALL WRITES LAST ---
        transaction.set(entryRef, dataWithTimestamp);
        transaction.update(sucursalRef, { currentBalance: newBalance });

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

export async function deleteFlujoEntry(entryId: string) {
    const entryRef = doc(db, 'flujo_entries', entryId);

    await runTransaction(db, async (transaction) => {
        const entryDoc = await transaction.get(entryRef);
        if (!entryDoc.exists()) throw new Error("El registro a eliminar no existe.");
        
        const entryData = entryDoc.data() as FlujoEntry;
        const sucursalRef = doc(db, 'flujo_sucursales', entryData.sucursalId);
        
        const entryDate = (entryData.date as any).toDate(); 
        const { weekId } = getWeekBoundaries(entryDate);
        const summaryId = `${entryData.sucursalId}_${weekId}`;
        const summaryRef = doc(db, 'flujo_weekly_summaries', summaryId);
        
        const [sucursalDoc, summaryDoc] = await Promise.all([
            transaction.get(sucursalRef),
            transaction.get(summaryRef)
        ]);
        
        if (sucursalDoc.exists()) {
            let newSucursalBalance = sucursalDoc.data().currentBalance - entryData.totalCobrado;
            transaction.update(sucursalRef, { currentBalance: newSucursalBalance });
        }
        if (summaryDoc.exists()) {
             let newSummaryTotal = summaryDoc.data().totalCobradoSemanal - entryData.totalCobrado;
            transaction.update(summaryRef, { totalCobradoSemanal: newSummaryTotal });
        }
        transaction.delete(entryRef);
    });
}

export async function getFlujoWeeklySummary(sucursalId: string): Promise<{ summary: FlujoWeeklySummary | null, dateRange: string, entries: FlujoEntry[] }> {
    const today = new Date();
    const { start, end, weekId } = getWeekBoundaries(today);
    
    const q = query(entriesCollectionRef, where("sucursalId", "==", sucursalId));
    const allEntriesSnapshot = await getDocs(q);

    const allEntries = allEntriesSnapshot.docs.map(docSnap => ({
        ...docSnap.data(),
        id: docSnap.id,
        date: (docSnap.data().date as Timestamp).toDate()
    })) as FlujoEntry[];

    const weeklyEntries = allEntries.filter(entry => {
        const entryDate = entry.date;
        return entryDate >= start && entryDate <= end;
    });

    const summaryId = `${sucursalId}_${weekId}`;
    const summaryRef = doc(db, 'flujo_weekly_summaries', summaryId);
    
    const summarySnap = await getDoc(summaryRef);
    let summary: FlujoWeeklySummary | null = null;
    
    const calculatedTotalCobrado = weeklyEntries.reduce((acc, e) => acc + e.totalCobrado, 0);

    if (summarySnap.exists()) {
        const data = summarySnap.data();
        summary = {
            ...data,
            id: summarySnap.id,
            weekStartDate: (data.weekStartDate as Timestamp).toDate(),
            weekEndDate: (data.weekEndDate as Timestamp).toDate(),
            gastos: (data.gastos || []).map((g: any) => ({...g, date: (g.date as Timestamp).toDate()})),
            totalCobradoSemanal: calculatedTotalCobrado,
        } as FlujoWeeklySummary;
    } else if (weeklyEntries.length > 0) {
        summary = {
            id: summaryId,
            sucursalId,
            weekStartDate: start,
            weekEndDate: end,
            totalCobradoSemanal: calculatedTotalCobrado,
            comisiones: 0,
            gastos: [],
        };
    }

    const dateRange = `Semana del ${format(start, "dd 'de' LLLL", { locale: es })} al ${format(end, "dd 'de' LLLL", { locale: es })}`;

    weeklyEntries.sort((a,b) => a.date.getTime() - b.date.getTime());
    return { summary, dateRange, entries: weeklyEntries };
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

export async function resetWeeklySummary(summaryId: string) {
    const summaryRef = doc(db, 'flujo_weekly_summaries', summaryId);
    await runTransaction(db, async (transaction) => {
        const summaryDoc = await transaction.get(summaryRef);
        if (summaryDoc.exists()) {
            transaction.update(summaryRef, {
                gastos: [],
                comisiones: 0,
            });
        }
    });
}
