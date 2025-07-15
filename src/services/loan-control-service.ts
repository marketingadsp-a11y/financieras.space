
'use server';

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, writeBatch, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { LoanControlCartera, LoanControlGrupo, Customer, StructuredCustomerData } from "@/lib/data";
import { getCustomersByLoanControlGroup } from "./customer-service";

const carterasCollectionRef = collection(db, "loanControlCarteras");
const gruposCollectionRef = collection(db, "loanControlGrupos");
const customersCollectionRef = collection(db, "customers");

// --- Cartera Functions ---

export async function getCarterasByPlaza(plazaId: string): Promise<LoanControlCartera[]> {
    const q = query(carterasCollectionRef, where("plazaId", "==", plazaId));
    const data = await getDocs(q);
    return data.docs.map(doc => ({ ...doc.data(), id: doc.id })) as LoanControlCartera[];
}

export async function getCarteraById(id: string): Promise<LoanControlCartera | null> {
    const carteraDoc = doc(db, "loanControlCarteras", id);
    const docSnap = await getDoc(carteraDoc);

    if (docSnap.exists()) {
        return { ...docSnap.data(), id: docSnap.id } as LoanControlCartera;
    }
    return null;
}

async function getCarteraByNameAndPlaza(name: string, plazaId: string): Promise<LoanControlCartera | null> {
    const q = query(carterasCollectionRef, where("name", "==", name), where("plazaId", "==", plazaId));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return null;
    }
    const carteraDoc = querySnapshot.docs[0];
    return { id: carteraDoc.id, ...carteraDoc.data() } as LoanControlCartera;
}

export async function addCartera(cartera: Omit<LoanControlCartera, 'id'>): Promise<LoanControlCartera> {
    const docRef = await addDoc(carterasCollectionRef, cartera);
    return { ...cartera, id: docRef.id };
}

export async function updateCartera(id: string, cartera: Partial<Omit<LoanControlCartera, 'id'>>) {
    const carteraDoc = doc(db, "loanControlCarteras", id);
    await updateDoc(carteraDoc, cartera);
}

export async function deleteCartera(id: string) {
    const carteraDoc = doc(db, "loanControlCarteras", id);
    await deleteDoc(carteraDoc);
}

export async function getGroupsAndCustomersByCartera(carteraId: string): Promise<{ groups: LoanControlGrupo[], customers: Customer[] }> {
    const grupos = await getGruposByCartera(carteraId);
    if (grupos.length === 0) {
        return { groups: [], customers: [] };
    }
    const customerPromises = grupos.map(g => getCustomersByLoanControlGroup(g.id));
    const customersByGroup = await Promise.all(customerPromises);
    const allCustomers = customersByGroup.flat();
    return { groups: grupos, customers: allCustomers };
}


// --- Grupo Functions ---

export async function getGruposByCartera(carteraId: string): Promise<LoanControlGrupo[]> {
    const q = query(gruposCollectionRef, where("carteraId", "==", carteraId));
    const data = await getDocs(q);
    return data.docs.map(doc => ({ ...doc.data(), id: doc.id })) as LoanControlGrupo[];
}

export async function getGrupoById(id: string): Promise<LoanControlGrupo | null> {
    const grupoDoc = doc(db, "loanControlGrupos", id);
    const docSnap = await getDoc(grupoDoc);

    if (docSnap.exists()) {
        return { ...docSnap.data(), id: docSnap.id } as LoanControlGrupo;
    }
    return null;
}

async function getGrupoByNameAndCartera(name: string, carteraId: string): Promise<LoanControlGrupo | null> {
    const q = query(gruposCollectionRef, where("name", "==", name), where("carteraId", "==", carteraId));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return null;
    }
    const grupoDoc = querySnapshot.docs[0];
    return { id: grupoDoc.id, ...grupoDoc.data() } as LoanControlGrupo;
}


export async function addGrupo(grupo: Omit<LoanControlGrupo, 'id'>): Promise<LoanControlGrupo> {
    const docRef = await addDoc(gruposCollectionRef, grupo);
    return { ...grupo, id: docRef.id };
}

export async function updateGrupo(id: string, grupo: Partial<Omit<LoanControlGrupo, 'id'>>) {
    const grupoDoc = doc(db, "loanControlGrupos", id);
    await updateDoc(grupoDoc, grupo);
}

export async function deleteGrupo(id: string) {
    const grupoDoc = doc(db, "loanControlGrupos", id);
    await deleteDoc(grupoDoc);
}


// --- Complex Import Function ---
interface ImportParams {
    carteraId: string;
    plazaId: string;
    prefix: string;
    pasteData: string;
    mode: 'add' | 'replace';
}

interface ImportResult {
    newGroups: number;
    totalCustomers: number;
}

// This function is now deprecated in favor of structured import, but kept for reference
export async function importGruposAndCustomersFromPaste(params: ImportParams): Promise<ImportResult> {
    throw new Error("This AI-based import function is deprecated.");
}


// --- Plaza Level Structured Import ---
interface StructuredImportParams {
    plazaId: string;
    prefix: string;
    customers: StructuredCustomerData[];
}

interface StructuredImportResult {
    newCarteras: number;
    newGroups: number;
    totalCustomers: number;
}

export async function importStructuredData(params: StructuredImportParams): Promise<StructuredImportResult> {
    const { plazaId, prefix, customers } = params;

    let newCarterasCount = 0;
    let newGroupsCount = 0;

    // --- Step 1: Group data and identify all unique carteras and groups ---
    const carterasToCreate = new Map<string, string>(); // name -> responsable
    const groupsToCreate = new Map<string, { carteraName: string }>(); // name -> { carteraName }
    const customerDataByCarteraAndGroup: Record<string, Record<string, StructuredCustomerData[]>> = {};

    for (const customer of customers) {
        const carteraName = customer.carteraName?.trim() || "Cartera General";
        const groupName = customer.groupName?.trim() || "Sin Grupo Asignado";

        if (!carterasToCreate.has(carteraName)) {
            carterasToCreate.set(carteraName, customer.responsable || "No especificado");
        }
        if (!groupsToCreate.has(groupName)) {
            groupsToCreate.set(groupName, { carteraName });
        }
        
        if (!customerDataByCarteraAndGroup[carteraName]) {
            customerDataByCarteraAndGroup[carteraName] = {};
        }
        if (!customerDataByCarteraAndGroup[carteraName][groupName]) {
            customerDataByCarteraAndGroup[carteraName][groupName] = [];
        }
        customerDataByCarteraAndGroup[carteraName][groupName].push(customer);
    }
    
    // --- Step 2: Fetch existing carteras and groups to avoid duplicates ---
    const existingCarterasDocs = await getDocs(query(carterasCollectionRef, where("plazaId", "==", plazaId)));
    const existingCarteras = new Map(existingCarterasDocs.docs.map(d => [d.data().name, d.id]));

    const existingGruposDocs = await getDocs(query(gruposCollectionRef, where("plazaId", "==", plazaId)));
    const existingGrupos = new Map(existingGruposDocs.docs.map(d => [`${d.data().carteraId}_${d.data().name}`, d.id]));

    // --- Step 3: Create any missing carteras ---
    for (const [name, responsable] of carterasToCreate.entries()) {
        if (!existingCarteras.has(name)) {
            const newCartera = await addCartera({ name, plazaId, prefix, responsable });
            existingCarteras.set(name, newCartera.id);
            newCarterasCount++;
        }
    }

    // --- Step 4: Create any missing groups ---
    for (const [name, { carteraName }] of groupsToCreate.entries()) {
        const carteraId = existingCarteras.get(carteraName);
        if (carteraId && !existingGrupos.has(`${carteraId}_${name}`)) {
            const newGrupo = await addGrupo({ name, carteraId, plazaId, prefix });
            existingGrupos.set(`${carteraId}_${name}`, newGrupo.id);
            newGroupsCount++;
        }
    }

    // --- Step 5: Write all customers in batches ---
    const BATCH_LIMIT = 500;
    let writeBatcher = writeBatch(db);
    let operationCount = 0;

    for (const carteraName of Object.keys(customerDataByCarteraAndGroup)) {
        for (const groupName of Object.keys(customerDataByCarteraAndGroup[carteraName])) {
            const carteraId = existingCarteras.get(carteraName)!;
            const grupoId = existingGrupos.get(`${carteraId}_${groupName}`)!;

            for (const customer of customerDataByCarteraAndGroup[carteraName][groupName]) {
                const newCustomerRef = doc(customersCollectionRef);
                const { carteraName: cn, groupName: gn, responsable: r, ...rest } = customer;
                const completeCustomerData = {
                    ...rest,
                    plazaId,
                    prefix,
                    loanControlGroupId: grupoId,
                    status: 'Pendiente' as const,
                    fechaPrestamo: customer.fechaPrestamo ? new Date(customer.fechaPrestamo) : new Date(),
                };
                writeBatcher.set(newCustomerRef, completeCustomerData);
                operationCount++;

                if (operationCount >= BATCH_LIMIT) {
                    await writeBatcher.commit();
                    writeBatcher = writeBatch(db);
                    operationCount = 0;
                }
            }
        }
    }

    // Commit any remaining operations
    if (operationCount > 0) {
        await writeBatcher.commit();
    }
    
    return {
        newCarteras: newCarterasCount,
        newGroups: newGroupsCount,
        totalCustomers: customers.length,
    };
}
