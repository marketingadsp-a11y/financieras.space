
'use server';

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, query, where, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Plaza, Customer } from "@/lib/data";
import { getCustomersByPlaza } from "./customer-service";
import { customerFromDoc } from "./customer-service-helper";

const plazasCollectionRef = collection(db, "plazas");
const customersCollectionRef = collection(db, "customers");

type GetPlazasOptions = {
    prefix?: string;
    fetchAll?: boolean;
    startDate?: Date;
    endDate?: Date;
    toolContext?: 'overdue-portfolio' | 'loan-control';
}

export async function getPlazas({ prefix, fetchAll = false, startDate, endDate, toolContext }: GetPlazasOptions = {}): Promise<Plaza[]> {
    let constraints = [];
    
    // If a tool context is provided, always filter by it.
    if (toolContext) {
        constraints.push(where("toolContext", "==", toolContext));
    }

    if (!fetchAll && prefix) {
        constraints.push(where("prefix", "==", prefix));
    }
    
    const q = query(plazasCollectionRef, ...constraints);
    const plazasSnapshot = await getDocs(q);
    
    // Fetch all customers for prefix and toolContext in a single query to avoid N+1 waterfall queries
    let allCustomers: Customer[] = [];
    if (prefix) {
        let customerConstraints = [where("prefix", "==", prefix)];
        if (toolContext) {
            customerConstraints.push(where("toolContext", "==", toolContext));
        }
        const customersSnapshot = await getDocs(query(customersCollectionRef, ...customerConstraints));
        allCustomers = customersSnapshot.docs.map(customerFromDoc);
    } else {
        // Fallback for fetchAll (SuperAdmin or cases without prefix)
        let customerConstraints = [];
        if (toolContext) {
            customerConstraints.push(where("toolContext", "==", toolContext));
        }
        const customersSnapshot = await getDocs(query(customersCollectionRef, ...customerConstraints));
        allCustomers = customersSnapshot.docs.map(customerFromDoc);
    }
    
    const plazasWithCalculations = plazasSnapshot.docs.map((doc) => {
        const plazaData = doc.data() as Omit<Plaza, 'id' | 'totalLoanAmount'>;
        const plazaId = doc.id;
        
        // Filter in memory instead of executing separate Firestore queries for each plaza
        const allCustomersInPlaza = allCustomers.filter(c => c.plazaId === plazaId);
        
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
        
        const totalClients = filteredCustomers.length;
        const recoveredClients = filteredCustomers.filter(c => c.dueAmount <= 0).length;
        const recoveryRate = totalClients > 0 ? (recoveredClients / totalClients) * 100 : 0;

        return {
            id: plazaId,
            name: plazaData.name,
            pendingDebt,
            recoveryRate,
            prefix: plazaData.prefix,
            toolContext: plazaData.toolContext,
            totalLoanAmount: totalLoanAmount,
        };
    });

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
        toolContext: plaza.toolContext
    };
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

export async function deleteAllPlazasByPrefix(prefix: string, toolContext: 'overdue-portfolio') {
    const batch = writeBatch(db);
    
    // 1. Find all plazas with the given prefix and tool context
    const plazasQuery = query(plazasCollectionRef, where("prefix", "==", prefix), where("toolContext", "==", toolContext));
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

export async function getPlazaDetailData(plazaId: string, prefix?: string): Promise<{
    plaza: Plaza | null;
    companyProfile: any | null;
    customers: Customer[];
}> {
    const plazaDocRef = doc(db, "plazas", plazaId);
    const profileCollectionRef = collection(db, "companyProfiles");
    const customersCollectionRef = collection(db, "customers");
    
    const promises: [Promise<any>, Promise<any>, Promise<any>] = [
        getDoc(plazaDocRef),
        prefix ? getDoc(doc(db, "companyProfiles", prefix)) : Promise.resolve(null),
        getDocs(query(customersCollectionRef, where("plazaId", "==", plazaId)))
    ];
    
    const [plazaSnap, profileSnap, customersSnap] = await Promise.all(promises);
    
    let plaza: Plaza | null = null;
    if (plazaSnap.exists()) {
        const plazaData = plazaSnap.data();
        plaza = {
            id: plazaSnap.id,
            ...plazaData,
            pendingDebt: plazaData.pendingDebt || 0,
            recoveryRate: plazaData.recoveryRate || 0,
            totalLoanAmount: plazaData.totalLoanAmount || 0,
        } as Plaza;
    }
    
    const companyProfile = (profileSnap && profileSnap.exists()) 
        ? { id: profileSnap.id, ...profileSnap.data() } 
        : null;
        
    const customers = customersSnap.docs.map(customerFromDoc);
    
    return {
        plaza,
        companyProfile,
        customers
    };
}
