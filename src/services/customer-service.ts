
'use server';

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, writeBatch, runTransaction, DocumentData, Timestamp, Query, collectionGroup } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Customer } from "@/lib/data";
import { customerFromDoc } from "./customer-service-helper";

const customersCollectionRef = collection(db, "customers");

export async function getCustomersByPlaza(plazaId: string): Promise<Customer[]> {
    const q = query(customersCollectionRef, where("plazaId", "==", plazaId));
    const data = await getDocs(q);
    return data.docs.map(customerFromDoc);
}


export async function addCustomer(customer: Omit<Customer, 'id'>) : Promise<Customer> {
     const customerDataWithTimestamp = {
        ...customer,
        fechaPrestamo: customer.fechaPrestamo ? Timestamp.fromDate(new Date(customer.fechaPrestamo)) : Timestamp.now()
    };
    const docRef = await addDoc(customersCollectionRef, customerDataWithTimestamp);
    return { ...customer, id: docRef.id };
}

export async function updateCustomer(id: string, customer: Partial<Omit<Customer, 'id'>>) {
    const customerDoc = doc(db, "customers", id);
    const dataToUpdate: Partial<any> = {...customer};
    if (customer.fechaPrestamo) {
        dataToUpdate.fechaPrestamo = Timestamp.fromDate(new Date(customer.fechaPrestamo));
    }
    await updateDoc(customerDoc, dataToUpdate);
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

export async function deleteAllCustomersByPrefix(prefix: string): Promise<void> {
    const batch = writeBatch(db);
    const q = query(customersCollectionRef, where("prefix", "==", prefix));
    const snapshot = await getDocs(q);

    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
}


// Overloaded function signature
export async function addMultipleCustomers(customers: Omit<Customer, 'id' | 'status'>[], mode: 'add' | 'replace', prefix: string): Promise<void>;
export async function addMultipleCustomers(customers: Omit<Customer, 'id' | 'status'>[], mode: 'add' | 'replace', prefix: string, plazaId?: string, grupoId?: string): Promise<void>;

export async function addMultipleCustomers(customers: Omit<Customer, 'id' | 'status'>[], mode: 'add' | 'replace', prefix: string, plazaId?: string, grupoId?: string): Promise<void> {
    const batch = writeBatch(db);

    if (mode === 'replace') {
        let constraints: any[] = [where("prefix", "==", prefix)];
        
        if (plazaId && grupoId) { // From loan control group import
            constraints.push(where("plazaId", "==", plazaId));
            constraints.push(where("loanControlGroupId", "==", grupoId));
        } else if (plazaId) { // From plaza-specific import (legacy)
            constraints.push(where("plazaId", "==", plazaId));
        }
        // If only prefix is provided, it will replace all customers for that prefix (cartera vencida import)

        const q = query(customersCollectionRef, ...constraints);
        const snapshot = await getDocs(q);
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
    }

    customers.forEach(customerData => {
        const newDocRef = doc(customersCollectionRef);
        // Ensure all fields are present, even if empty, to match the Customer type
        const completeCustomerData: any = {
            ...customerData,
            status: (customerData.dueAmount || 0) <= 0 ? 'Pagado' : 'Pendiente',
            prefix: prefix,
            name: customerData.name || '',
            address: customerData.address || '',
            phone: customerData.phone || '',
            guarantor: customerData.guarantor || '',
            guarantorPhone: customerData.guarantorPhone || '',
            loanAmount: customerData.loanAmount || 0,
            paymentAmount: customerData.paymentAmount || 0,
            installmentsDue: customerData.installmentsDue || 0,
            dueAmount: customerData.dueAmount || customerData.loanAmount || 0,
            colonia: customerData.colonia || '',
            cp: customerData.cp || '',
            direccionAval: customerData.direccionAval || '',
            coloniaAval: customerData.coloniaAval || '',
            cpAval: customerData.cpAval || '',
            fechaPrestamo: customerData.fechaPrestamo ? Timestamp.fromDate(new Date(customerData.fechaPrestamo)) : Timestamp.now(),
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
        const previousDueAmount = customerData.dueAmount || 0;
        const newDueAmount = previousDueAmount - paymentAmount;
        
        const updatedCustomerData: Partial<Pick<Customer, 'dueAmount' | 'status'>> = {
            dueAmount: newDueAmount,
        };

        if (newDueAmount <= 0) {
            updatedCustomerData.status = 'Pagado';
            updatedCustomerData.dueAmount = 0;
        }

        transaction.update(customerRef, updatedCustomerData);
    });
}
