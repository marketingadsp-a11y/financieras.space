
'use server';

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, query, where, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Plaza, Customer } from "@/lib/data";
import { getCustomersByPlaza } from "./customer-service";

const plazasCollectionRef = collection(db, "plazas");
const customersCollectionRef = collection(db, "customers");

type GetPlazasOptions = {
    prefix?: string;
    fetchAll?: boolean;
    startDate?: Date;
    endDate?: Date;
}

export async function getPlazas({ prefix, fetchAll = false, startDate, endDate }: GetPlazasOptions = {}): Promise<Plaza[]> {
    let q;
    if (fetchAll) {
        // SuperAdmins or ToolAdmins can see everything
        q = query(plazasCollectionRef);
    } else if (prefix) {
        // Global Admins see only their prefixed plazas
        q = query(plazasCollectionRef, where("prefix", "==", prefix));
    } else {
        // No prefix and not fetching all, return empty to avoid showing all data by mistake
        return [];
    }
    
    const plazasSnapshot = await getDocs(q);
    
    const plazasWithCalculations = await Promise.all(plazasSnapshot.docs.map(async (doc) => {
        const plazaData = doc.data() as Omit<Plaza, 'id' | 'totalLoanAmount'>;
        const plazaId = doc.id;
        
        const allCustomersInPlaza = await getCustomersByPlaza(plazaId);
        
        // Filter customers by date range in the application code
        const filteredCustomers = allCustomersInPlaza.filter(customer => {
            if (!startDate && !endDate) return true;
            if (!customer.fechaPrestamo) return false;
            
            const customerDate = new Date(customer.fechaPrestamo);

            if (startDate && customerDate < startDate) return false;
            if (endDate) {
                 const endOfDay = new Date(endDate);
                 endOfDay.setHours(23, 59, 59, 999);
                 if (customerDate > endOfDay) return false;
            }
            return true;
        });

        const pendingDebt = filteredCustomers.reduce((acc, customer) => acc + (customer.dueAmount || 0), 0);
        const totalLoanAmount = filteredCustomers.reduce((acc, customer) => acc + (customer.loanAmount || 0), 0);
        const totalPaidAmount = totalLoanAmount - pendingDebt;
        const recoveryRate = totalLoanAmount > 0 ? (totalPaidAmount / totalLoanAmount) * 100 : 0;

        return {
            id: plazaId,
            name: plazaData.name,
            pendingDebt,
            recoveryRate,
            prefix: plazaData.prefix,
            totalLoanAmount: totalLoanAmount,
        };
    }));

    return plazasWithCalculations;
}

export async function getPlazaById(id: string): Promise<Plaza | null> {
    const plazaDocRef = doc(db, "plazas", id);
    const plazaDoc = await getDoc(plazaDocRef);

    if (plazaDoc.exists()) {
        const plazaData = plazaDoc.data() as Omit<Plaza, 'id'>;
        return { 
            id: plazaDoc.id, 
            ...plazaData,
            pendingDebt: plazaData.pendingDebt || 0,
            recoveryRate: plazaData.recoveryRate || 0,
            totalLoanAmount: plazaData.totalLoanAmount || 0,
        };
    } else {
        return null;
    }
}


export async function addPlaza(plaza: Omit<Plaza, 'id' | 'pendingDebt' | 'recoveryRate' | 'totalLoanAmount'>) : Promise<Plaza> {
    const dataToSave = {
        name: plaza.name,
        prefix: plaza.prefix || "",
    }
    const docRef = await addDoc(plazasCollectionRef, dataToSave);
    return { ...dataToSave, id: docRef.id, pendingDebt: 0, recoveryRate: 0, totalLoanAmount: 0 };
}

export async function updatePlaza(id: string, plaza: Partial<Omit<Plaza, 'id'>>) {
    const plazaDoc = doc(db, "plazas", id);
    await updateDoc(plazaDoc, plaza);
}

export async function deletePlaza(id: string) {
    const plazaDoc = doc(db, "plazas", id);
    const q = query(customersCollectionRef, where("plazaId", "==", id));
    
    const customerDocs = await getDocs(q);
    const batch = writeBatch(db);
    
    customerDocs.forEach(doc => {
        batch.delete(doc.ref);
    });
    
    batch.delete(plazaDoc);

    await batch.commit();
}

export async function deleteAllPlazasByPrefix(prefix: string) {
    const batch = writeBatch(db);
    
    // 1. Find all plazas with the given prefix
    const plazasQuery = query(plazasCollectionRef, where("prefix", "==", prefix));
    const plazasSnapshot = await getDocs(plazasQuery);
    
    // 2. For each plaza, find and delete its customers
    for (const plazaDoc of plazasSnapshot.docs) {
        const customersQuery = query(customersCollectionRef, where("plazaId", "==", plazaDoc.id));
        const customersSnapshot = await getDocs(customersQuery);
        customersSnapshot.forEach(customerDoc => {
            batch.delete(customerDoc.ref);
        });
        
        // 3. Delete the plaza itself
        batch.delete(plazaDoc.ref);
    }
    
    // 4. Commit all deletions at once
    await batch.commit();
}
