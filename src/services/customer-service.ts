
'use server';

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, writeBatch, runTransaction, DocumentData, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Customer } from "@/lib/data";

const customersCollectionRef = collection(db, "customers");


function customerFromDoc(doc: DocumentData): Customer {
    const data = doc.data();
    // Helper to safely convert Firestore Timestamp to JS Date
    const toDate = (timestamp: any): Date | undefined => {
        if (timestamp instanceof Timestamp) {
            return timestamp.toDate();
        }
        if (timestamp && typeof timestamp.toDate === 'function') {
           return timestamp.toDate();
        }
        // Handle string dates from AI parser
        if (typeof timestamp === 'string') {
            const parsedDate = new Date(timestamp);
            if (!isNaN(parsedDate.getTime())) {
                return parsedDate;
            }
        }
        return undefined;
    }

    return {
        id: doc.id,
        plazaId: data.plazaId,
        name: data.name,
        address: data.address,
        colonia: data.colonia || "",
        cp: data.cp || "",
        phone: data.phone || "",
        guarantor: data.guarantor || "",
        guarantorPhone: data.guarantorPhone || "",
        direccionAval: data.direccionAval || "",
        coloniaAval: data.coloniaAval || "",
        cpAval: data.cpAval || "",
        loanAmount: data.loanAmount || 0,
        paymentAmount: data.paymentAmount || 0,
        installmentsDue: data.installmentsDue || 0,
        dueAmount: data.dueAmount || 0,
        fechaPrestamo: toDate(data.fechaPrestamo),
        status: data.status || "Pendiente",
        prefix: data.prefix || "",
        loanControlGroupId: data.loanControlGroupId || undefined,
    };
}


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
