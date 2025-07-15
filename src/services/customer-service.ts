
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


export async function getCustomersByLoanControlGroup(groupId: string): Promise<Customer[]> {
    const q = query(customersCollectionRef, where("loanControlGroupId", "==", groupId));
    const data = await getDocs(q);
    return data.docs.map(customerFromDoc);
}

export async function addCustomer(customer: Omit<Customer, 'id'>) : Promise<Customer> {
     const customerDataWithTimestamp = {
        ...customer,
        fechaPrestamo: customer.fechaPrestamo ? Timestamp.fromDate(customer.fechaPrestamo) : Timestamp.now()
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

export async function deleteCustomersByGroupId(groupId: string): Promise<void> {
    const batch = writeBatch(db);
    const q = query(customersCollectionRef, where("loanControlGroupId", "==", groupId));
    const snapshot = await getDocs(q);

    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
}


export async function addMultipleCustomers(customers: Omit<Customer, 'id'>[], plazaId: string, mode: 'add' | 'replace', prefix: string, loanControlGroupId?: string): Promise<void> {
    const batch = writeBatch(db);

    if (mode === 'replace') {
        const constraints = [where("plazaId", "==", plazaId)];
        if (loanControlGroupId) {
            constraints.push(where("loanControlGroupId", "==", loanControlGroupId));
        }
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
            plazaId: plazaId,
            status: 'Pendiente' as const,
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
            loanControlGroupId: loanControlGroupId || null,
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
