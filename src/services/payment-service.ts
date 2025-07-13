
'use server';

import { collection, getDocs, query, where, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Payment } from "@/lib/data";

const paymentsCollectionRef = collection(db, "payments");

export async function getPaymentsByCustomer(customerId: string): Promise<Payment[]> {
    const q = query(
        paymentsCollectionRef, 
        where("customerId", "==", customerId),
        orderBy("date", "desc")
    );
    const data = await getDocs(q);
    
    return data.docs.map(doc => {
        const docData = doc.data();
        const date = docData.date as Timestamp;
        
        return {
            id: doc.id,
            customerId: docData.customerId,
            amount: docData.amount,
            date: date.toMillis(), // Convert Timestamp to number (milliseconds)
            previousDueAmount: docData.previousDueAmount,
            newDueAmount: docData.newDueAmount,
        } as Payment;
    });
}
