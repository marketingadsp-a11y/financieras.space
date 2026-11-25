
'use server';

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, query, where, writeBatch, type QueryConstraint } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Plaza, Customer } from "@/lib/data";
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

function buildPlazaConstraints({ prefix, fetchAll = false, toolContext }: Pick<GetPlazasOptions, 'prefix' | 'fetchAll' | 'toolContext'>): QueryConstraint[] {
    const constraints: QueryConstraint[] = [];
    if (toolContext) {
        constraints.push(where("toolContext", "==", toolContext));
    }
    if (!fetchAll && prefix) {
        constraints.push(where("prefix", "==", prefix));
    }
    return constraints;
}

function buildCustomerConstraints({ prefix, fetchAll = false, toolContext }: Pick<GetPlazasOptions, 'prefix' | 'fetchAll' | 'toolContext'>): QueryConstraint[] {
    const constraints: QueryConstraint[] = [];
    if (!fetchAll && prefix) {
        constraints.push(where("prefix", "==", prefix));
    }
    if (toolContext) {
        constraints.push(where("toolContext", "==", toolContext));
    }
    return constraints;
}

/**
 * Lightweight plaza list query that only reads the plazas collection without fetching customers.
 * Use this for navigation links, dropdowns, user assignment, and management tables.
 */
export async function getPlazasList({ prefix, fetchAll = false, toolContext }: Pick<GetPlazasOptions, 'prefix' | 'fetchAll' | 'toolContext'> = {}): Promise<Plaza[]> {
    const constraints = buildPlazaConstraints({ prefix, fetchAll, toolContext });
    const plazasSnapshot = await getDocs(query(plazasCollectionRef, ...constraints));

    const plazas = plazasSnapshot.docs.map((docSnap) => {
        const plazaData = docSnap.data() as Omit<Plaza, 'id'>;
        return {
            id: docSnap.id,
            name: plazaData.name,
            pendingDebt: plazaData.pendingDebt || 0,
            recoveryRate: plazaData.recoveryRate || 0,
            prefix: plazaData.prefix,
            toolContext: plazaData.toolContext,
            totalLoanAmount: plazaData.totalLoanAmount || 0,
        };
    });

    return plazas.sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

function computePlazasWithStats(
    plazasSnapshotDocs: any[],
    allCustomers: Customer[],
    startDate?: Date,
    endDate?: Date
): Plaza[] {
    const endOfDayTime = endDate ? (() => {
        const d = new Date(endDate);
        d.setHours(23, 59, 59, 999);
        return d.getTime();
    })() : null;
    const startTime = startDate ? new Date(startDate).getTime() : null;

    // Group customers by plazaId in O(C) instead of scanning all customers per plaza in O(P * C)
    const customersByPlaza = new Map<string, Customer[]>();
    for (const customer of allCustomers) {
        if (startTime !== null || endOfDayTime !== null) {
            if (!customer.fechaPrestamo) continue;
            const customerTime = new Date(customer.fechaPrestamo).getTime();
            if (startTime !== null && customerTime < startTime) continue;
            if (endOfDayTime !== null && customerTime > endOfDayTime) continue;
        }
        const list = customersByPlaza.get(customer.plazaId);
        if (list) {
            list.push(customer);
        } else {
            customersByPlaza.set(customer.plazaId, [customer]);
        }
    }

    const plazasWithCalculations = plazasSnapshotDocs.map((docSnap) => {
        const plazaData = docSnap.data() as Omit<Plaza, 'id' | 'totalLoanAmount'>;
        const plazaId = docSnap.id;
        const filteredCustomers = customersByPlaza.get(plazaId) || [];

        let pendingDebt = 0;
        let totalLoanAmount = 0;
        let recoveredClients = 0;

        for (const customer of filteredCustomers) {
            const due = customer.dueAmount || 0;
            pendingDebt += due;
            totalLoanAmount += customer.loanAmount || 0;
            if (due <= 0) recoveredClients++;
        }

        const totalClients = filteredCustomers.length;
        const recoveryRate = totalClients > 0 ? (recoveredClients / totalClients) * 100 : 0;

        return {
            id: plazaId,
            name: plazaData.name,
            pendingDebt,
            recoveryRate,
            prefix: plazaData.prefix,
            toolContext: plazaData.toolContext,
            totalLoanAmount,
        };
    });

    return plazasWithCalculations.sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export async function getPlazas({ prefix, fetchAll = false, startDate, endDate, toolContext }: GetPlazasOptions = {}): Promise<Plaza[]> {
    const plazaConstraints = buildPlazaConstraints({ prefix, fetchAll, toolContext });
    const customerConstraints = buildCustomerConstraints({ prefix, fetchAll, toolContext });

    const [plazasSnapshot, customersSnapshot] = await Promise.all([
        getDocs(query(plazasCollectionRef, ...plazaConstraints)),
        getDocs(query(customersCollectionRef, ...customerConstraints)),
    ]);

    const allCustomers = customersSnapshot.docs.map(customerFromDoc);
    return computePlazasWithStats(plazasSnapshot.docs, allCustomers, startDate, endDate);
}

/**
 * Fetches plazas and global customer summary in a single round-trip without duplicating customer reads.
 */
export async function getOverduePortfolioDashboardData({
    prefix,
    fetchAll = false,
}: {
    prefix?: string;
    fetchAll?: boolean;
}): Promise<{
    plazas: Plaza[];
    summary: { totalDebt: number; totalClients: number; recoveredClients: number; recoveryRate: number; totalLoanAmount: number };
}> {
    const toolContext = 'overdue-portfolio' as const;
    const plazaConstraints = buildPlazaConstraints({ prefix, fetchAll, toolContext });
    const customerConstraints = buildCustomerConstraints({ prefix, fetchAll, toolContext });

    const [plazasSnapshot, customersSnapshot] = await Promise.all([
        getDocs(query(plazasCollectionRef, ...plazaConstraints)),
        getDocs(query(customersCollectionRef, ...customerConstraints)),
    ]);

    const allCustomers = customersSnapshot.docs.map(customerFromDoc);
    const plazas = computePlazasWithStats(plazasSnapshot.docs, allCustomers);

    let totalDebt = 0;
    let totalLoanAmount = 0;
    let recoveredClients = 0;
    for (const c of allCustomers) {
        const due = c.dueAmount || 0;
        totalDebt += due;
        totalLoanAmount += c.loanAmount || 0;
        if (due <= 0) recoveredClients++;
    }
    const totalClients = allCustomers.length;
    const recoveryRate = totalClients > 0 ? (recoveredClients / totalClients) * 100 : 0;

    return {
        plazas,
        summary: {
            totalDebt,
            totalClients,
            recoveredClients,
            recoveryRate,
            totalLoanAmount,
        },
    };
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
    const [plazasSnapshot, customersSnapshot] = await Promise.all([
        getDocs(query(plazasCollectionRef, where("prefix", "==", prefix), where("toolContext", "==", toolContext))),
        getDocs(query(customersCollectionRef, where("prefix", "==", prefix), where("toolContext", "==", toolContext))),
    ]);

    const refsToDelete = [
        ...customersSnapshot.docs.map(d => d.ref),
        ...plazasSnapshot.docs.map(d => d.ref),
    ];

    let batch = writeBatch(db);
    let count = 0;
    for (const ref of refsToDelete) {
        batch.delete(ref);
        count++;
        if (count >= 400) {
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
        }
    }
    if (count > 0) {
        await batch.commit();
    }
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
