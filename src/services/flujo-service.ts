

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
  arrayRemove
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { FlujoSucursal, FlujoCentralAccount, FlujoEntry, FlujoWeeklySummary, FlujoGasto, FlujoVenta } from "@/lib/data";
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
const getWeekBoundaries = (date: Date): { start: Date; end: Date; weekId: string } => {
    // Clone the date to avoid modifying the original
    const d = new Date(date.getTime());
    d.setUTCHours(0, 0, 0, 0);

    // In this logic, Saturday (6) is the start of the week.
    const dayOfWeek = d.getUTCDay(); // Sunday = 0, Saturday = 6

    // Calculate the difference to get to the last Saturday
    const diffToSaturday = (dayOfWeek + 1) % 7;
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

type SucursalSummary = FlujoSucursal & { summary: FlujoWeeklySummary | null };

export async function getFlujoSummariesForWeek(prefix: string, date: Date) {
    const { start, end, weekId } = getWeekBoundaries(date);

    // Get all sucursales for the prefix
    const sucursales = await getFlujoSucursales(prefix);
    const sucursalIds = sucursales.map(s => s.id);

    // Get all weekly summaries for these sucursales for the given week
    const summaryPromises = sucursalIds.map(id => {
        const summaryId = `${id}_${weekId}`;
        return getDoc(doc(db, 'flujo_weekly_summaries', summaryId));
    });
    const summarySnapshots = await Promise.all(summaryPromises);

    const summariesMap = new Map<string, FlujoWeeklySummary>();
    summarySnapshots.forEach(snap => {
        if (snap.exists()) {
            const data = snap.data();
            const summary = {
                ...data,
                id: snap.id,
                weekStartDate: (data.weekStartDate as Timestamp).toDate(),
                weekEndDate: (data.weekEndDate as Timestamp).toDate(),
                gastos: (data.gastos || []).map((g: any) => ({...g, date: (g.date as Timestamp).toDate()})),
                ventas: (data.ventas || []).map((v: any) => ({...v, date: (v.date as Timestamp).toDate()})),
            } as FlujoWeeklySummary;
            summariesMap.set(summary.sucursalId, summary);
        }
    });

    const sucursalSummaries: SucursalSummary[] = sucursales.map(s => ({
        ...s,
        summary: summariesMap.get(s.id) || null
    }));

    // Get central account info
    const centralAccountDocRef = doc(db, "flujo_central_accounts", prefix);
    const accountSnap = await getDoc(centralAccountDocRef);
    let centralAccount: FlujoCentralAccount;
    if (accountSnap.exists()) {
        centralAccount = { id: accountSnap.id, ...accountSnap.data() } as FlujoCentralAccount;
    } else {
        centralAccount = { id: prefix, prefix: prefix, totalEfectivo: 0, cajaChica: 0 };
    }
    
    const dateRange = `Semana del ${format(start, "dd 'de' LLLL", { locale: es })} al ${format(end, "dd 'de' LLLL", { locale: es })}`;

    return { centralAccount, sucursalSummaries, dateRange };
}


// --- Flujo Entry & Weekly Summary Functions ---

export async function addFlujoEntry(entryData: Omit<FlujoEntry, 'id'>) {
    const entryDate = entryData.date;
    
    const { start: weekStartDate, end: weekEndDate, weekId } = getWeekBoundaries(entryDate);
    
    await runTransaction(db, async (transaction) => {
        const summaryId = `${entryData.sucursalId}_${weekId}`;
        const summaryRef = doc(db, 'flujo_weekly_summaries', summaryId);
        const sucursalRef = doc(db, 'flujo_sucursales', entryData.sucursalId);
        const entryRef = doc(collection(db, "flujo_entries"));
        
        const sucursalDoc = await transaction.get(sucursalRef);
        const summaryDoc = await transaction.get(summaryRef);

        if (!sucursalDoc.exists()) throw new Error('La sucursal no existe.');
        
        const sucursalData = sucursalDoc.data() as FlujoSucursal;
        let newBalance = sucursalData.currentBalance + entryData.totalCobrado;
        const dataWithTimestamp = { ...entryData, date: Timestamp.fromDate(entryDate), id: entryRef.id };

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
                ventas: [],
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
            transaction.update(summaryRef, { 
                totalCobradoSemanal: newSummaryTotal,
            });
        }
        transaction.delete(entryRef);
    });
}

export async function getFlujoWeeklySummary(sucursalId: string, date: Date): Promise<{ summary: FlujoWeeklySummary | null, dateRange: string, entries: FlujoEntry[] }> {
    const { start, end, weekId } = getWeekBoundaries(date);
    
    const q = query(
        entriesCollectionRef, 
        where("sucursalId", "==", sucursalId), 
        where("date", ">=", start), 
        where("date", "<=", end),
        orderBy("date", "asc")
    );
    const weeklyEntriesSnapshot = await getDocs(q);

    const weeklyEntries = weeklyEntriesSnapshot.docs.map(docSnap => ({
            ...docSnap.data(),
            id: docSnap.id,
            date: (docSnap.data().date as Timestamp).toDate()
    }) as FlujoEntry);

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
            ventas: (data.ventas || []).map((v: any) => ({...v, date: (v.date as Timestamp).toDate()})),
            totalCobradoSemanal: calculatedTotalCobrado,
        } as FlujoWeeklySummary;
    } else {
        // Always create a summary object, even if it's empty, to ensure the UI works for new weeks/sucursales.
        summary = {
            id: summaryId,
            sucursalId,
            weekStartDate: start,
            weekEndDate: end,
            totalCobradoSemanal: calculatedTotalCobrado,
            comisiones: 0,
            gastos: [],
            ventas: [],
        };
    }

    const dateRange = `Semana del ${format(start, "dd 'de' LLLL", { locale: es })} al ${format(end, "dd 'de' LLLL", { locale: es })}`;

    weeklyEntries.sort((a,b) => a.date.getTime() - b.date.getTime());
    return { summary, dateRange, entries: weeklyEntries };
}


export async function addGastoToSummary(summaryId: string, gasto: { amount: number, description: string }, sucursalId: string) {
    const summaryRef = doc(db, 'flujo_weekly_summaries', summaryId);
    const sucursalRef = doc(db, 'flujo_sucursales', sucursalId);
    const newGasto: FlujoGasto = { ...gasto, id: uuidv4(), date: new Date() };

    await runTransaction(db, async(transaction) => {
        const sucursalDoc = await transaction.get(sucursalRef);
        if (!sucursalDoc.exists()) throw new Error("Sucursal no encontrada.");
        
        const newBalance = sucursalDoc.data().currentBalance - gasto.amount;
        
        transaction.update(summaryRef, { gastos: arrayUnion(newGasto) });
        transaction.update(sucursalRef, { currentBalance: newBalance });
    });
}

export async function deleteGastoFromSummary(summaryId: string, gastoId: string) {
    const summaryRef = doc(db, 'flujo_weekly_summaries', summaryId);
     await runTransaction(db, async (transaction) => {
        const summaryDoc = await transaction.get(summaryRef);
        if (!summaryDoc.exists()) throw new Error("Resumen no encontrado.");

        const currentSummary = summaryDoc.data() as FlujoWeeklySummary;
        const gastoToDelete = currentSummary.gastos.find(g => g.id === gastoId);
        
        if (gastoToDelete) {
            const sucursalRef = doc(db, 'flujo_sucursales', currentSummary.sucursalId);
            const sucursalDoc = await transaction.get(sucursalRef);
            if (sucursalDoc.exists()) {
                const newBalance = sucursalDoc.data().currentBalance + gastoToDelete.amount;
                transaction.update(sucursalRef, { currentBalance: newBalance });
            }
            transaction.update(summaryRef, { gastos: arrayRemove(gastoToDelete) });
        }
    });
}

export async function addVentaToSummary(summaryId: string, venta: { amount: number, description: string }, sucursalId: string) {
    const summaryRef = doc(db, 'flujo_weekly_summaries', summaryId);
    const sucursalRef = doc(db, 'flujo_sucursales', sucursalId);
    const newVenta: FlujoVenta = { ...venta, id: uuidv4(), date: new Date() };

    await runTransaction(db, async(transaction) => {
        const sucursalDoc = await transaction.get(sucursalRef);
        if (!sucursalDoc.exists()) throw new Error("Sucursal no encontrada.");
        
        const newBalance = sucursalDoc.data().currentBalance - venta.amount;
        
        transaction.update(summaryRef, { ventas: arrayUnion(newVenta) });
        transaction.update(sucursalRef, { currentBalance: newBalance });
    });
}

export async function deleteVentaFromSummary(summaryId: string, ventaId: string) {
    const summaryRef = doc(db, 'flujo_weekly_summaries', summaryId);
     await runTransaction(db, async (transaction) => {
        const summaryDoc = await transaction.get(summaryRef);
        if (!summaryDoc.exists()) throw new Error("Resumen no encontrado.");

        const currentSummary = summaryDoc.data() as FlujoWeeklySummary;
        const ventaToDelete = currentSummary.ventas.find(v => v.id === ventaId);
        
        if (ventaToDelete) {
            const sucursalRef = doc(db, 'flujo_sucursales', currentSummary.sucursalId);
            const sucursalDoc = await transaction.get(sucursalRef);
            if (sucursalDoc.exists()) {
                const newBalance = sucursalDoc.data().currentBalance + ventaToDelete.amount;
                transaction.update(sucursalRef, { currentBalance: newBalance });
            }
            transaction.update(summaryRef, { ventas: arrayRemove(ventaToDelete) });
        }
    });
}


export async function updateComisionesInSummary(summaryId: string, comisiones: number, sucursalId: string) {
    const summaryRef = doc(db, 'flujo_weekly_summaries', summaryId);
    const sucursalRef = doc(db, 'flujo_sucursales', sucursalId);

    await runTransaction(db, async (transaction) => {
        const summaryDoc = await transaction.get(summaryRef);
        const sucursalDoc = await transaction.get(sucursalRef);

        if (!summaryDoc.exists() || !sucursalDoc.exists()) {
            throw new Error("No se encontró el resumen o la sucursal.");
        }
        
        const oldComisiones = summaryDoc.data().comisiones || 0;
        const newBalance = sucursalDoc.data().currentBalance + oldComisiones - comisiones;

        transaction.update(sucursalRef, { currentBalance: newBalance });
        transaction.update(summaryRef, { comisiones });
    });
}

export async function resetWeeklySummary(summaryId: string) {
    const summaryRef = doc(db, 'flujo_weekly_summaries', summaryId);
    await runTransaction(db, async (transaction) => {
        const summaryDoc = await transaction.get(summaryRef);
        if (summaryDoc.exists()) {
            const currentSummary = summaryDoc.data() as FlujoWeeklySummary;
            const sucursalRef = doc(db, 'flujo_sucursales', currentSummary.sucursalId);
            const sucursalDoc = await transaction.get(sucursalRef);
            
            if (sucursalDoc.exists()) {
                const totalDeductionsToRevert = (currentSummary.gastos.reduce((sum, g) => sum + g.amount, 0)) + (currentSummary.ventas.reduce((sum, v) => sum + v.amount, 0)) + currentSummary.comisiones;
                const newBalance = sucursalDoc.data().currentBalance + totalDeductionsToRevert;
                transaction.update(sucursalRef, { currentBalance: newBalance });
            }

            transaction.update(summaryRef, {
                gastos: [],
                ventas: [],
                comisiones: 0,
            });
        }
    });
}

