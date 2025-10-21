
'use server';

import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { HistoryLog } from "@/lib/data";

const historyCollectionRef = collection(db, "historyLogs");

export async function getHistoryLogs(prefix: string, toolContext: 'overdue-portfolio' | 'loan-control'): Promise<HistoryLog[]> {
    const q = query(
        historyCollectionRef, 
        where("prefix", "==", prefix),
        where("toolContext", "==", toolContext)
    );
    const data = await getDocs(q);
    const logs = data.docs.map(doc => {
        const logData = doc.data();
        return { 
            ...logData,
            id: doc.id,
            timestamp: (logData.timestamp as Timestamp).toDate(),
        } as HistoryLog;
    });

    // Sort in application code to avoid complex composite index
    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}
