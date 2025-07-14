
'use server';

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, writeBatch, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { LoanControlCartera, LoanControlGrupo, Customer } from "@/lib/data";
import { parseCustomers, type ParsedCustomer } from "@/ai/flows/customer-parser-flow";
import { addMultipleCustomers, deleteCustomersByGroupId, getCustomersByLoanControlGroup } from "./customer-service";

const carterasCollectionRef = collection(db, "loanControlCarteras");
const gruposCollectionRef = collection(db, "loanControlGrupos");

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
    // This is more complex in a real scenario, would need to handle nested groups and customers
    // For now, simple delete
    const carteraDoc = doc(db, "loanControlCarteras", id);
    await deleteDoc(carteraDoc);
}

export async function getCustomersByCartera(carteraId: string): Promise<Customer[]> {
    const grupos = await getGruposByCartera(carteraId);
    if (grupos.length === 0) {
        return [];
    }
    const customerPromises = grupos.map(g => getCustomersByLoanControlGroup(g.id));
    const customersByGroup = await Promise.all(customerPromises);
    return customersByGroup.flat();
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

export async function importGruposAndCustomersFromPaste(params: ImportParams): Promise<ImportResult> {
    const { carteraId, plazaId, prefix, pasteData, mode } = params;

    // 1. Parse data with AI
    const parsedCustomers = await parseCustomers({ inputText: pasteData });
    if (!parsedCustomers || parsedCustomers.length === 0) {
        throw new Error("La IA no pudo procesar los datos. Verifica el formato.");
    }
    
    let newGroupsCount = 0;

    // Group customers by their detected group name
    const customersByGroup: Record<string, ParsedCustomer[]> = {};
    for (const customer of parsedCustomers) {
        const groupName = customer.groupName || "Sin Grupo Asignado";
        if (!customersByGroup[groupName]) {
            customersByGroup[groupName] = [];
        }
        customersByGroup[groupName].push(customer);
    }
    
    // 2. Process each group
    for (const groupName in customersByGroup) {
        let grupo = await getGrupoByNameAndCartera(groupName, carteraId);

        // 3. Create group if it doesn't exist
        if (!grupo) {
            grupo = await addGrupo({
                name: groupName,
                carteraId,
                plazaId,
                prefix,
            });
            newGroupsCount++;
        }
        
        if (mode === 'replace') {
            await deleteCustomersByGroupId(grupo.id);
        }
        
        // 4. Batch-add customers to the group
        const customersToAdd = customersByGroup[groupName].map(c => ({
            ...c,
            plazaId,
            loanControlGroupId: grupo!.id,
            status: 'Pendiente' as const,
        }));
        
        await addMultipleCustomers(customersToAdd, plazaId, 'add', prefix, grupo.id);
    }

    return {
        newGroups: newGroupsCount,
        totalCustomers: parsedCustomers.length,
    };
}


// --- Plaza Level Import ---
interface PlazaImportParams {
    plazaId: string;
    prefix: string;
    pasteData: string;
}

interface PlazaImportResult {
    newCarteras: number;
    newGroups: number;
    totalCustomers: number;
}

export async function importPlazaStructureFromPaste(params: PlazaImportParams): Promise<PlazaImportResult> {
    const { plazaId, prefix, pasteData } = params;
    
    // 1. AI Parsing
    const parsedCustomers = await parseCustomers({ inputText: pasteData });
    if (!parsedCustomers || parsedCustomers.length === 0) {
        throw new Error("La IA no pudo procesar los datos. Verifica el formato.");
    }
    
    let newCarterasCount = 0;
    let newGroupsCount = 0;
    
    // 2. Group by Cartera, then by Group
    const structure: Record<string, Record<string, ParsedCustomer[]>> = {};
    for (const customer of parsedCustomers) {
        const carteraName = customer.carteraName || "Cartera General";
        const groupName = customer.groupName || "Sin Grupo Asignado";
        
        if (!structure[carteraName]) {
            structure[carteraName] = {};
        }
        if (!structure[carteraName][groupName]) {
            structure[carteraName][groupName] = [];
        }
        structure[carteraName][groupName].push(customer);
    }
    
    // 3. Process structure
    for (const carteraName in structure) {
        // Find or create Cartera
        let cartera = await getCarteraByNameAndPlaza(carteraName, plazaId);
        if (!cartera) {
            const firstCustomerInCartera = structure[carteraName][Object.keys(structure[carteraName])[0]][0];
            const responsable = firstCustomerInCartera.responsable || "No especificado";
            cartera = await addCartera({ name: carteraName, plazaId, prefix, responsable });
            newCarterasCount++;
        }
        
        for (const groupName in structure[carteraName]) {
            // Find or create Grupo
            let grupo = await getGrupoByNameAndCartera(groupName, cartera.id);
            if (!grupo) {
                grupo = await addGrupo({ name: groupName, carteraId: cartera.id, plazaId, prefix });
                newGroupsCount++;
            }
            
            // Add customers to the group
            const customersToAdd = structure[carteraName][groupName].map(c => ({
                ...c,
                plazaId,
                loanControlGroupId: grupo!.id,
                status: 'Pendiente' as const,
            }));
            
            await addMultipleCustomers(customersToAdd, plazaId, 'add', prefix, grupo.id);
        }
    }

    return {
        newCarteras: newCarterasCount,
        newGroups: newGroupsCount,
        totalCustomers: parsedCustomers.length,
    };
}
