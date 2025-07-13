
'use server';

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, writeBatch, runTransaction, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Customer } from "@/lib/data";

const customersCollectionRef = collection(db, "customers");
const paymentsCollectionRef = collection(db, "payments");


export async function getCustomersByPlaza(plazaId: string): Promise<Customer[]> {
    const q = query(customersCollectionRef, where("plazaId", "==", plazaId));
    const data = await getDocs(q);
    return data.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Customer[];
}

export async function addCustomer(customer: Omit<Customer, 'id'>) : Promise<Customer> {
    const docRef = await addDoc(customersCollectionRef, customer);
    return { ...customer, id: docRef.id };
}

export async function updateCustomer(id: string, customer: Partial<Omit<Customer, 'id'>>) {
    const customerDoc = doc(db, "customers", id);
    await updateDoc(customerDoc, customer);
}

export async function deleteCustomer(id: string) {
    const customerDoc = doc(db, "customers", id);
    await deleteDoc(customerDoc);
}

export async function deleteCustomersByPlaza(plazaId: string): Promise<void> {
    const batch = writeBatch(db);
    const q = query(customersCollectionRef, where("plazaId", "==", plazaId));
    const snapshot = await getDocs(q);

    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
}


export async function addMultipleCustomers(customers: Omit<Customer, 'id'>[], plazaId: string, mode: 'add' | 'replace'): Promise<void> {
    const batch = writeBatch(db);

    if (mode === 'replace') {
        const q = query(customersCollectionRef, where("plazaId", "==", plazaId));
        const snapshot = await getDocs(q);
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
    }

    customers.forEach(customer => {
        const newDocRef = doc(customersCollectionRef);
        batch.set(newDocRef, customer);
    });

    await batch.commit();
}

export async function addPayment(customerId: string, plazaId: string, paymentAmount: number): Promise<void> {
    const customerRef = doc(db, "customers", customerId);
    
    await runTransaction(db, async (transaction) => {
        const customerDoc = await transaction.get(customerRef);
        if (!customerDoc.exists()) {
            throw new Error("El cliente no existe.");
        }

        const customerData = customerDoc.data() as Customer;
        const previousDueAmount = customerData.dueAmount;
        const newDueAmount = previousDueAmount - paymentAmount;

        const newPaymentRef = doc(paymentsCollectionRef);
        
        transaction.set(newPaymentRef, {
            customerId,
            plazaId,
            amount: paymentAmount,
            date: Timestamp.now().toMillis(),
            previousDueAmount,
            newDueAmount,
        });

        const updatedCustomerData: Partial<Customer> = {
            dueAmount: newDueAmount,
        };

        if (newDueAmount <= 0) {
            updatedCustomerData.status = 'Pagado';
        }

        transaction.update(customerRef, updatedCustomerData);
    });
}
