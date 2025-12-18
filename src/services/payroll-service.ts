
'use server';

import { collection, addDoc, getDocs, query, where, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { PayrollHistory } from "@/lib/data";

const payrollHistoryCollectionRef = collection(db, "payrollHistory");

export async function savePayroll(data: Omit<PayrollHistory, 'id' | 'date'>): Promise<PayrollHistory> {
    const dataToSave = {
        ...data,
        date: Timestamp.now()
    };
    const docRef = await addDoc(payrollHistoryCollectionRef, dataToSave);
    return { ...dataToSave, id: docRef.id, date: dataToSave.date.toDate() };
}

export async function getPayrollHistory(prefix: string): Promise<PayrollHistory[]> {
    const q = query(
        payrollHistoryCollectionRef, 
        where("prefix", "==", prefix),
        orderBy("date", "desc")
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            id: doc.id,
            date: (data.date as Timestamp).toDate(),
        } as PayrollHistory;
    });
}
