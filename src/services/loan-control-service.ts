
'use server';

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, writeBatch, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { LoanControlCartera, LoanControlGrupo } from "@/lib/data";
import { parseCustomers, type ParsedCustomer } from "@/ai/flows/customer-parser-flow";
import { addMultipleCustomers, deleteCustomersByGroupId } from "./customer-service";

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
    responsable: string;
    pasteData: string;
    mode: 'add' | 'replace';
}

interface ImportResult {
    newGroups: number;
    totalCustomers: number;
}

export async function importGruposAndCustomersFromPaste(params: ImportParams): Promise<ImportResult> {
    const { carteraId, plazaId, prefix, responsable, pasteData, mode } = params;

    // 1. Parse data with AI
    const parsedCustomers = await parseCustomers({ inputText: pasteData });
    if (!parsedCustomers || parsedCustomers.length === 0) {
        throw new Error("La IA no pudo procesar los datos. Verifica el formato.");
    }
    
    let newGroupsCount = 0;
    const groupsCache: Record<string, LoanControlGrupo> = {};

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
