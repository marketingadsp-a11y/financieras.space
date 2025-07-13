
'use server';

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, writeBatch, runTransaction, Timestamp, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Customer, Payment } from "@/lib/data";

const customersCollectionRef = collection(db, "customers");
const paymentsCollectionRef = collection(db, "payments");


function customerFromDoc(doc: DocumentData): Customer {
    const data = doc.data();
    return {
        id: doc.id,
        plazaId: data.plazaId,
        name: data.name,
        address: data.address,
        phone: data.phone || "",
        guarantor: data.guarantor || "",
        guarantorPhone: data.guarantorPhone || "",
        loanAmount: data.loanAmount || 0,
        paymentAmount: data.paymentAmount || 0,
        installmentsDue: data.installmentsDue || 0,
        dueAmount: data.dueAmount || 0,
        status: data.status || "Pendiente",
    };
}


export async function getCustomersByPlaza(plazaId: string): Promise<Customer[]> {
    const q = query(customersCollectionRef, where("plazaId", "==", plazaId));
    const data = await getDocs(q);
    return data.docs.map(customerFromDoc);
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

    customers.forEach(customerData => {
        const newDocRef = doc(customersCollectionRef);
        // Ensure all fields are present, even if empty, to match the Customer type
        const completeCustomerData = {
            plazaId: plazaId,
            status: 'Pendiente' as const,
            name: customerData.name || '',
            address: customerData.address || '',
            phone: customerData.phone || '',
            guarantor: customerData.guarantor || '',
            guarantorPhone: customerData.guarantorPhone || '',
            loanAmount: customerData.loanAmount || 0,
            paymentAmount: customerData.paymentAmount || 0,
            installmentsDue: customerData.installmentsDue || 0,
            dueAmount: customerData.dueAmount || customerData.loanAmount || 0,
        };
        batch.set(newDocRef, completeCustomerData);
    });

    await batch.commit();
}

export async function addPayment(customerId: string, paymentAmount: number): Promise<void> {
    const customerRef = doc(db, "customers", customerId);
    
    await runTransaction(db, async (transaction) => {
        const customerDoc = await transaction.get(customerRef);
        if (!customerDoc.exists()) {
            throw new Error("El cliente no existe.");
        }

        const customerData = customerFromDoc(customerDoc);
        const previousDueAmount = customerData.dueAmount;
        const newDueAmount = previousDueAmount - paymentAmount;

        // 1. Create payment record
        const paymentRef = doc(paymentsCollectionRef);
        transaction.set(paymentRef, {
            customerId: customerId,
            amount: paymentAmount,
            date: Timestamp.now(), // Store as Firestore Timestamp
            previousDueAmount: previousDueAmount,
            newDueAmount: newDueAmount,
        });

        // 2. Update customer's due amount and status
        const updatedCustomerData: Partial<Pick<Customer, 'dueAmount' | 'status'>> = {
            dueAmount: newDueAmount,
        };

        if (newDueAmount <= 0) {
            updatedCustomerData.status = 'Pagado';
            updatedCustomerData.dueAmount = 0; // Ensure it doesn't go negative
        }

        transaction.update(customerRef, updatedCustomerData);
    });
}
