

'use server';

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, writeBatch, runTransaction, DocumentData, Timestamp, Query, collectionGroup, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Customer, HistoryLog } from "@/lib/data";
import { customerFromDoc } from "./customer-service-helper";

const customersCollectionRef = collection(db, "customers");
const historyCollectionRef = collection(db, "historyLogs");

export async function getCustomersByPlaza(plazaId: string): Promise<Customer[]> {
    const q = query(customersCollectionRef, where("plazaId", "==", plazaId));
    const data = await getDocs(q);
    return data.docs.map(customerFromDoc);
}

export async function getAllCustomersByPrefix(prefix: string): Promise<Customer[]> {
    const q = query(customersCollectionRef, where("prefix", "==", prefix));
    const data = await getDocs(q);
    return data.docs.map(customerFromDoc);
}

export async function getAllCustomersByPrefixAndTool(prefix: string, toolContext: 'overdue-portfolio' | 'loan-control'): Promise<Customer[]> {
    const q = query(
        customersCollectionRef, 
        where("prefix", "==", prefix), 
        where("toolContext", "==", toolContext)
    );
    const data = await getDocs(q);
    return data.docs.map(customerFromDoc);
}


export async function addCustomer(customer: Omit<Customer, 'id'>, userName: string) : Promise<Customer> {
     const customerDataWithTimestamp = {
        ...customer,
        fechaPrestamo: customer.fechaPrestamo ? Timestamp.fromDate(new Date(customer.fechaPrestamo)) : Timestamp.now()
    };
    const docRef = await addDoc(customersCollectionRef, customerDataWithTimestamp);
    
    // Add to history log
    const historyLog: Omit<HistoryLog, 'id'> = {
        prefix: customer.prefix || 'N/A',
        toolContext: customer.toolContext || 'overdue-portfolio',
        type: 'create',
        timestamp: new Date(),
        userName: userName, 
        details: `Se registró al cliente: ${customer.name}.`,
        customerName: customer.name,
    };
    await addDoc(historyCollectionRef, historyLog);

    return { ...customer, id: docRef.id };
}

export async function updateCustomer(id: string, customerUpdates: Partial<Omit<Customer, 'id'>>, userName: string) {
    const customerDocRef = doc(db, "customers", id);
    
    await runTransaction(db, async (transaction) => {
        const customerDoc = await transaction.get(customerDocRef);
        if (!customerDoc.exists()) {
            throw new Error("Cliente no encontrado.");
        }
        
        const oldData = customerFromDoc(customerDoc);
        const dataToUpdate: Partial<any> = {...customerUpdates};

        if (customerUpdates.fechaPrestamo) {
            dataToUpdate.fechaPrestamo = Timestamp.fromDate(new Date(customerUpdates.fechaPrestamo));
        }

        if (typeof customerUpdates.dueAmount === 'number') {
            dataToUpdate.status = customerUpdates.dueAmount <= 0 ? 'Pagado' : 'Pendiente';
        }

        transaction.update(customerDocRef, dataToUpdate);

        // Generate detailed history log
        const changes: string[] = [];
        for (const key in customerUpdates) {
            const typedKey = key as keyof typeof customerUpdates;
            if (oldData[typedKey] !== customerUpdates[typedKey] && key !== 'fechaPrestamo') {
                changes.push(`${key}: "${oldData[typedKey]}" -> "${customerUpdates[typedKey]}"`);
            }
        }
        if (customerUpdates.fechaPrestamo && new Date(oldData.fechaPrestamo || 0).getTime() !== new Date(customerUpdates.fechaPrestamo).getTime()) {
            changes.push(`fechaPrestamo: "${oldData.fechaPrestamo?.toLocaleDateString()}" -> "${customerUpdates.fechaPrestamo.toLocaleDateString()}"`)
        }
        
        const details = changes.length > 0
            ? `Cambios: ${changes.join(', ')}`
            : 'Se guardó sin cambios en los datos.';

        const historyLog: Omit<HistoryLog, 'id'> = {
            prefix: oldData.prefix || 'N/A',
            toolContext: oldData.toolContext || 'overdue-portfolio',
            type: 'update',
            timestamp: new Date(),
            userName: userName,
            details,
            customerName: oldData.name,
        };
        const historyDocRef = doc(historyCollectionRef);
        transaction.set(historyDocRef, historyLog);
    });
}


export async function deleteCustomer(id: string, userName: string, plazaName?: string) {
    const customerDocRef = doc(db, "customers", id);
    const customerDoc = await getDoc(customerDocRef);
    if (!customerDoc.exists()) return;

    const customerData = customerFromDoc(customerDoc);

    await deleteDoc(customerDocRef);

     // Add to history log
    const historyLog: Omit<HistoryLog, 'id'> = {
        prefix: customerData.prefix || 'N/A',
        toolContext: customerData.toolContext || 'overdue-portfolio',
        type: 'delete',
        timestamp: new Date(),
        userName: userName, 
        details: `Se eliminó al cliente: ${customerData.name} de la plaza ${plazaName || 'desconocida'}.`,
        customerName: customerData.name,
    };
    await addDoc(historyCollectionRef, historyLog);
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

export async function deleteCustomersByPromoter(plazaId: string, promoterName: string): Promise<void> {
    const batch = writeBatch(db);
    const q = query(
        customersCollectionRef, 
        where("plazaId", "==", plazaId), 
        where("promoter", "==", promoterName)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        throw new Error("No se encontraron clientes para este promotor en la plaza especificada.");
    }

    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
}


export async function deleteAllCustomersByPrefix(prefix: string, toolContext: 'overdue-portfolio'): Promise<void> {
    const batch = writeBatch(db);
    const q = query(customersCollectionRef, where("prefix", "==", prefix), where("toolContext", "==", toolContext));
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
    const toolContext = grupoId ? 'loan-control' : 'overdue-portfolio';

    if (mode === 'replace') {
        let constraints: any[] = [where("prefix", "==", prefix), where("toolContext", "==", toolContext)];
        
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
            toolContext: toolContext,
            name: customerData.name || '',
            address: customerData.address || '',
            phone: customerData.phone || '',
            guarantor: customerData.guarantor || '',
            guarantorPhone: customerData.guarantorPhone || '',
            loanAmount: customerData.loanAmount || 0,
            paymentAmount: customerData.paymentAmount || 0,
            installmentsDue: customerData.installmentsDue || 0,
            dueAmount: customerData.dueAmount || customerData.loanAmount || 0,
            fechaPrestamo: customerData.fechaPrestamo ? Timestamp.fromDate(new Date(customerData.fechaPrestamo)) : Timestamp.now(),
            promoter: customerData.promoter || "",
            groupName: customerData.groupName || "",
        };
        batch.set(newDocRef, completeCustomerData);
    });

    await batch.commit();
}


export async function addPayment(customerId: string, paymentAmount: number, userName: string): Promise<void> {
    const customerRef = doc(db, "customers", customerId);
    
    await runTransaction(db, async (transaction) => {
        const customerDoc = await transaction.get(customerRef);
        if (!customerDoc.exists()) {
            throw new Error("El cliente no existe.");
        }

        const customerData = customerFromDoc(customerDoc);
        const plazaRef = doc(db, "plazas", customerData.plazaId);
        const plazaDoc = await transaction.get(plazaRef); // Use transaction.get
        const plazaName = plazaDoc.exists() ? plazaDoc.data().name : "Desconocida";

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

        // Add to history log
        const historyLog: Omit<HistoryLog, 'id'> = {
            prefix: customerData.prefix || 'N/A',
            toolContext: 'overdue-portfolio',
            type: 'payment',
            timestamp: new Date(),
            userName: userName,
            details: `Abono de $${paymentAmount} a ${customerData.name}. Saldo anterior: $${previousDueAmount}. Saldo nuevo: $${newDueAmount > 0 ? newDueAmount : 0}.`,
            customerName: customerData.name,
            amount: paymentAmount,
            promoter: customerData.promoter,
            group: customerData.groupName,
            plazaName: plazaName,
        };
        const historyDocRef = doc(historyCollectionRef);
        transaction.set(historyDocRef, historyLog);
    });
}
