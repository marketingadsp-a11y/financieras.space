
'use server';

import { 
    doc, 
    getDoc, 
    setDoc, 
    Timestamp, 
    runTransaction,
    arrayUnion,
    collection,
    query,
    where,
    getDocs
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { DailyRecord, DailyRecordEntry } from "@/lib/data";
import { v4 as uuidv4 } from 'uuid';

function getDailyRecordDocRef(plazaId: string, date: Date) {
    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const docId = `${plazaId}_${dateString}`;
    return doc(db, "daily_records", docId);
}

export async function getDailyRecord(plazaId: string, date: Date): Promise<DailyRecord | null> {
    const recordDocRef = getDailyRecordDocRef(plazaId, date);
    const docSnap = await getDoc(recordDocRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        return {
            ...data,
            id: docSnap.id,
            date: (data.date as Timestamp).toDate(),
            // Ensure entries have Date objects
            entries: (data.entries || []).map((e: any) => ({...e, date: e.date.toDate()})),
        } as DailyRecord;
    }

    return null;
}

export async function addDailyRecordEntry(
    plazaId: string,
    prefix: string,
    date: Date,
    entryData: Omit<DailyRecordEntry, 'id' | 'date'>
): Promise<void> {

    const entryDate = new Date(date);
    entryDate.setHours(12,0,0,0); // Normalize time to avoid timezone issues

    const recordDocRef = getDailyRecordDocRef(plazaId, entryDate);
    const newEntry: DailyRecordEntry = {
        ...entryData,
        id: uuidv4(),
        date: entryDate
    };

    await runTransaction(db, async (transaction) => {
        const recordDoc = await transaction.get(recordDocRef);

        const entryWithTimestamp = {
            ...newEntry,
            date: Timestamp.fromDate(newEntry.date)
        };


        if (!recordDoc.exists()) {
            const newRecord: DailyRecord = {
                id: recordDocRef.id,
                plazaId,
                prefix,
                date: Timestamp.fromDate(entryDate),
                collected: 0,
                loaned: 0,
                spent: 0,
                entries: []
            };
            
            // Set initial totals based on the first entry
            newRecord[entryData.type] = entryData.amount;
            (newRecord.entries as any).push(entryWithTimestamp);
            
            transaction.set(recordDocRef, newRecord);

        } else {
            const currentData = recordDoc.data() as DailyRecord;
            const updateData: any = {
                entries: arrayUnion(entryWithTimestamp)
            };
            
            const newTotal = currentData[entryData.type] + entryData.amount;
            updateData[entryData.type] = newTotal;

            transaction.update(recordDocRef, updateData);
        }
    });
}

export async function getAllDailyRecordsByPlaza(plazaId: string): Promise<DailyRecordEntry[]> {
    const recordsRef = collection(db, "daily_records");
    const q = query(recordsRef, where("plazaId", "==", plazaId));

    const querySnapshot = await getDocs(q);
    
    let allEntries: DailyRecordEntry[] = [];

    querySnapshot.forEach(doc => {
        const record = doc.data() as DailyRecord;
        const entriesFromRecord = (record.entries || []).map((e: any) => ({
            ...e,
            date: e.date.toDate() // Convert Timestamp to Date
        }));
        allEntries = allEntries.concat(entriesFromRecord);
    });

    return allEntries;
}
