
'use server';

import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Payment, FirebasePayment } from "@/lib/data";

const paymentsCollectionRef = collection(db, "payments");

export async function getPaymentsByCustomer(customerId: string): Promise<Payment[]> {
    const q = query(
        paymentsCollectionRef, 
        where("customerId", "==", customerId),
        orderBy("date", "desc")
    );
    const data = await getDocs(q);
    
    return data.docs.map(doc => {
        const paymentData = doc.data() as FirebasePayment;
        return {
            ...paymentData,
            id: doc.id,
            date: paymentData.date.toMillis() // Convert Timestamp to number for client
        } as Payment;
    });
}
