

'use server';

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, getDoc, setDoc, Timestamp, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ConcentradoOficina, ConcentradoSemanal, ConcentradoWeeklyClosure, ConcentradoCierre } from "@/lib/data";
import { format } from "date-fns";

const oficinasCollectionRef = collection(db, "concentrado_oficinas");
const registrosSemanalCollectionRef = collection(db, "concentrado_registros_semanal");
const weeklyClosuresCollectionRef = collection(db, "concentrado_weekly_closures");
const cierresCollectionRef = collection(db, "concentrado_cierres_mensuales");


export async function getConcentradoOficinas(prefix: string): Promise<ConcentradoOficina[]> {
    const q = query(oficinasCollectionRef, where("prefix", "==", prefix));
    const snapshot = await getDocs(q);
    const oficinas = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as ConcentradoOficina[];
    return oficinas.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getConcentradoOficinaById(id: string): Promise<ConcentradoOficina | null> {
    const docRef = doc(db, "concentrado_oficinas", id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as ConcentradoOficina : null;
}

export async function addConcentradoOficina(oficina: Omit<ConcentradoOficina, 'id'>): Promise<ConcentradoOficina> {
    const docRef = await addDoc(oficinasCollectionRef, oficina);
    return { ...oficina, id: docRef.id };
}

export async function updateConcentradoOficina(id: string, oficina: Partial<Omit<ConcentradoOficina, 'id'>>) {
    const oficinaDoc = doc(db, "concentrado_oficinas", id);
    await updateDoc(oficinaDoc, oficina);
}

export async function deleteConcentradoOficina(id: string) {
    const oficinaDoc = doc(db, "concentrado_oficinas", id);
    await deleteDoc(oficinaDoc);
}


// --- Weekly Registrations ---

export async function getRegistrosByOficina(oficinaId: string): Promise<ConcentradoSemanal[]> {
    const q = query(registrosSemanalCollectionRef, where("oficinaId", "==", oficinaId));

    const snapshot = await getDocs(q);
    
    const registros = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        const toDateSafe = (timestamp: any): Date => {
             if (!timestamp) return new Date(0);
             if (timestamp instanceof Timestamp) return timestamp.toDate();
             if (timestamp && typeof (timestamp as any).toDate === 'function') return (timestamp as any).toDate();
             if (typeof timestamp === 'string' || typeof timestamp === 'number') {
                const d = new Date(timestamp);
                if (!isNaN(d.getTime())) return d;
             }
             return new Date(0);
        };
        
        return {
            ...data,
            id: docSnap.id,
            weekStartDate: toDateSafe(data.weekStartDate),
            updatedAt: toDateSafe(data.updatedAt),
        } as ConcentradoSemanal;
    });

    return registros;
}

export async function getAllConcentradoRegistros(prefix: string): Promise<ConcentradoSemanal[]> {
    const q = query(registrosSemanalCollectionRef, where("prefix", "==", prefix));
    const snapshot = await getDocs(q);
    
    const registros = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        const toDateSafe = (timestamp: any): Date => {
             if (!timestamp) return new Date(0);
             if (timestamp instanceof Timestamp) return timestamp.toDate();
             if (timestamp && typeof (timestamp as any).toDate === 'function') return (timestamp as any).toDate();
             if (typeof timestamp === 'string' || typeof timestamp === 'number') {
                const d = new Date(timestamp);
                if (!isNaN(d.getTime())) return d;
             }
             return new Date(0);
        };
        
        return {
            ...data,
            id: docSnap.id,
            weekStartDate: toDateSafe(data.weekStartDate),
            updatedAt: toDateSafe(data.updatedAt),
        } as ConcentradoSemanal;
    });

    return registros;
}

export async function addOrUpdateRegistroSemanal(registro: Omit<ConcentradoSemanal, 'id'>) {
    const startDate = registro.weekStartDate;
    
    // Use UTC date parts for a timezone-agnostic ID
    const dateString = `${startDate.getUTCFullYear()}-${String(startDate.getUTCMonth() + 1).padStart(2, '0')}-${String(startDate.getUTCDate()).padStart(2, '0')}`;
    const docId = `${registro.oficinaId}_${dateString}`;
    
    const docRef = doc(db, "concentrado_registros_semanal", docId);
    
    const dataWithTimestamps = {
        ...registro,
        weekStartDate: Timestamp.fromDate(startDate),
        updatedAt: Timestamp.now(),
    };

    await setDoc(docRef, dataWithTimestamps, { merge: true });
}

function getMonthCycleBoundaries(monthDate: Date): { start: Date; end: Date } {
    const year = monthDate.getUTCFullYear();
    const month = monthDate.getUTCMonth();
    
    let firstFridayDate = new Date(Date.UTC(year, month, 1, 12, 0, 0));
    while (firstFridayDate.getUTCDay() !== 5) {
        firstFridayDate.setUTCDate(firstFridayDate.getUTCDate() + 1);
    }
    const firstWeekStart = new Date(firstFridayDate);
    firstWeekStart.setUTCDate(firstFridayDate.getUTCDate() - 6);

    let lastFridayDate = new Date(Date.UTC(year, month + 1, 0, 12, 0, 0)); // Last day of the current month
    while (lastFridayDate.getUTCDay() !== 5) {
        lastFridayDate.setUTCDate(lastFridayDate.getUTCDate() - 1);
    }
    const lastWeekEnd = new Date(lastFridayDate);
    lastWeekEnd.setUTCHours(23, 59, 59, 999);

    return { start: firstWeekStart, end: lastWeekEnd };
}

export async function deleteRegistrosByMonth(oficinaId: string, month: Date): Promise<void> {
    const { start, end } = getMonthCycleBoundaries(month);

    const q = query(
        registrosSemanalCollectionRef,
        where("oficinaId", "==", oficinaId),
        where("weekStartDate", ">=", Timestamp.fromDate(start)),
        where("weekStartDate", "<=", Timestamp.fromDate(end))
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        return; // Nothing to delete
    }

    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
}


export async function deleteRegistrosPorSemanas(
  oficinaIds: string[],
  weekStartDates: Date[]
): Promise<void> {
  if (oficinaIds.length === 0 || weekStartDates.length === 0) {
    return;
  }

  let batch = writeBatch(db);
  let operationCount = 0;

  for (const oficinaId of oficinaIds) {
    for (const startDate of weekStartDates) {
      const dateString = `${startDate.getUTCFullYear()}-${String(startDate.getUTCMonth() + 1).padStart(2, '0')}-${String(startDate.getUTCDate()).padStart(2, '0')}`;
      const docId = `${oficinaId}_${dateString}`;
      const docRef = doc(db, "concentrado_registros_semanal", docId);
      
      batch.delete(docRef);
      operationCount++;

      // Firebase batch writes have a limit of 500 operations.
      if (operationCount >= 499) {
          await batch.commit();
          batch = writeBatch(db); // Start a new batch
          operationCount = 0;
      }
    }
  }

  if (operationCount > 0) {
    await batch.commit();
  }
}

// --- Weekly Closure Functions ---
export async function getWeeklyClosures(prefix: string): Promise<ConcentradoWeeklyClosure[]> {
    const q = query(weeklyClosuresCollectionRef, where("prefix", "==", prefix));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
            ...data,
            id: docSnap.id,
            weekStartDate: (data.weekStartDate as Timestamp).toDate(),
        } as ConcentradoWeeklyClosure;
    });
}

export async function setWeeklyClosure(prefix: string, weekStartDate: Date, isClosed: boolean): Promise<void> {
    const dateString = `${weekStartDate.getUTCFullYear()}-${String(weekStartDate.getUTCMonth() + 1).padStart(2, '0')}-${String(weekStartDate.getUTCDate()).padStart(2, '0')}`;
    const docId = `${prefix}_${dateString}`;
    const docRef = doc(db, "concentrado_weekly_closures", docId);
    
    await setDoc(docRef, {
        prefix,
        weekStartDate: Timestamp.fromDate(weekStartDate),
        isClosed,
    }, { merge: true });
}

// --- Monthly Cierre Functions ---

export async function getCierreMensual(prefix: string, month: Date): Promise<ConcentradoCierre | null> {
    const monthId = `${format(month, "yyyy-MM")}`;
    const docId = `${prefix}_${monthId}`;
    const docRef = doc(db, cierresCollectionRef, docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        return { 
            id: docSnap.id,
            prefix: data.prefix,
            financieras: data.financieras || 0,
            multas: data.multas || 0,
            interesMesPasado: data.interesMesPasado || 0,
            prestamistasMes: data.prestamistasMes || 0,
            rentas: data.rentas || [],
         } as ConcentradoCierre;
    }
    
    // If it doesn't exist, return a default structure
    return {
        id: docId,
        prefix,
        financieras: 0,
        multas: 0,
        interesMesPasado: 0,
        prestamistasMes: 0,
        rentas: [],
    };
}

export async function saveCierreMensual(cierre: Omit<ConcentradoCierre, 'id'>, month: Date): Promise<void> {
    const monthId = `${format(month, "yyyy-MM")}`;
    const docId = `${cierre.prefix}_${monthId}`;
    const docRef = doc(db, cierresCollectionRef, docId);
    await setDoc(docRef, cierre, { merge: true });
}
