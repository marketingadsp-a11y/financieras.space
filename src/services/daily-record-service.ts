
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
    getDocs,
    writeBatch,
    DocumentSnapshot,
    DocumentData
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

    // Normalize date to UTC midday to avoid timezone shifts changing the date
    const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
    const entryDate = new Date(Date.UTC(localDate.getFullYear(), localDate.getMonth(), localDate.getDate(), 12, 0, 0));


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

export async function addMultipleDailyRecords(
    plazaId: string,
    prefix: string,
    entries: Omit<DailyRecordEntry, 'id'>[],
    mode: 'add' | 'replace'
): Promise<void> {
    // Group entries by date
    const groupedByDate: { [key: string]: Omit<DailyRecordEntry, 'id'>[] } = {};
    for (const entry of entries) {
        // Normalize to local date string to group correctly
        const localDate = new Date(entry.date.getFullYear(), entry.date.getMonth(), entry.date.getDate());
        const dateString = localDate.toISOString().split('T')[0];
        if (!groupedByDate[dateString]) {
            groupedByDate[dateString] = [];
        }
        groupedByDate[dateString].push(entry);
    }
    
    await runTransaction(db, async (transaction) => {
        const dateStrings = Object.keys(groupedByDate);
        const recordDocRefs = dateStrings.map(dateString => {
            const date = new Date(dateString);
            const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0));
            return getDailyRecordDocRef(plazaId, utcDate);
        });

        // 1. Perform all reads first
        const recordDocs = await Promise.all(recordDocRefs.map(ref => transaction.get(ref)));
        const existingDocsMap = new Map<string, DocumentSnapshot<DocumentData>>();
        recordDocs.forEach(doc => {
            if (doc.exists()) {
                existingDocsMap.set(doc.id, doc);
            }
        });

        // 2. Perform all writes second
        for (const dateString of dateStrings) {
            const date = new Date(dateString);
            const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0));
            
            const entriesForDate = groupedByDate[dateString];
            const recordDocRef = getDailyRecordDocRef(plazaId, utcDate);
            const recordDoc = existingDocsMap.get(recordDocRef.id);

            const newEntriesWithIds = entriesForDate.map(e => {
                const entryUtcDate = new Date(Date.UTC(e.date.getFullYear(), e.date.getMonth(), e.date.getDate(), 12, 0, 0));
                return {
                    ...e, 
                    id: uuidv4(), 
                    date: Timestamp.fromDate(entryUtcDate)
                }
            });
            
            const newTotals = {
                collected: newEntriesWithIds.filter(e => e.type === 'collected').reduce((sum, e) => sum + e.amount, 0),
                loaned: newEntriesWithIds.filter(e => e.type === 'loaned').reduce((sum, e) => sum + e.amount, 0),
                spent: newEntriesWithIds.filter(e => e.type === 'spent').reduce((sum, e) => sum + e.amount, 0),
            };

            if (!recordDoc || mode === 'replace') {
                const newRecord: DailyRecord = {
                    id: recordDocRef.id,
                    plazaId,
                    prefix,
                    date: Timestamp.fromDate(utcDate),
                    collected: newTotals.collected,
                    loaned: newTotals.loaned,
                    spent: newTotals.spent,
                    entries: newEntriesWithIds as any,
                };
                transaction.set(recordDocRef, newRecord);
            } else { // mode === 'add' and record exists
                const currentData = recordDoc.data() as DailyRecord;
                const updateData: any = {
                    entries: arrayUnion(...(newEntriesWithIds as any)),
                    collected: currentData.collected + newTotals.collected,
                    loaned: currentData.loaned + newTotals.loaned,
                    spent: currentData.spent + newTotals.spent,
                };
                transaction.update(recordDocRef, updateData);
            }
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

export async function deleteDailyRecordsByPlaza(plazaId: string): Promise<void> {
    const recordsRef = collection(db, "daily_records");
    const q = query(recordsRef, where("plazaId", "==", plazaId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
        return; // No records to delete
    }

    const batch = writeBatch(db);
    querySnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
}
