
'use server';

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, writeBatch, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { LoanControlCartera, LoanControlGrupo, Customer, StructuredCustomerData } from "@/lib/data";
import { getCustomersByPlaza, deleteCustomersByPlaza } from "./customer-service";
import { customerFromDoc } from "./customer-service-helper";
import { deletePlaza } from "./plaza-service";

const carterasCollectionRef = collection(db, "loanControlCarteras");
const gruposCollectionRef = collection(db, "loanControlGrupos");
const customersCollectionRef = collection(db, "customers");
const plazasCollectionRef = collection(db, "plazas");


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

export async function getPlazaStructure(plazaId: string): Promise<{ carteras: LoanControlCartera[], grupos: LoanControlGrupo[], customers: Customer[] }> {
    const carterasQuery = query(carterasCollectionRef, where("plazaId", "==", plazaId));
    const gruposQuery = query(gruposCollectionRef, where("plazaId", "==", plazaId));
    
    const [carterasSnapshot, gruposSnapshot, customers] = await Promise.all([
        getDocs(carterasQuery),
        getDocs(gruposQuery),
        getCustomersByPlaza(plazaId)
    ]);

    const carteras = carterasSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as LoanControlCartera[];
    const grupos = gruposSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as LoanControlGrupo[];
    
    return { carteras, grupos, customers };
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
    throw new Error("This AI-based import function is deprecated.");
}


// --- Plaza Level Structured Import ---
interface StructuredImportParams {
    plazaId: string;
    prefix: string;
    customers: StructuredCustomerData[];
    mode: 'add' | 'replace';
}

interface StructuredImportResult {
    newCarteras: number;
    newGroups: number;
    totalCustomers: number;
}

export async function importStructuredData(params: StructuredImportParams): Promise<StructuredImportResult> {
    const { plazaId, prefix, customers, mode } = params;

    if (mode === 'replace') {
        await deleteCustomersByPlaza(plazaId);
    }

    let newCarterasCount = 0;
    let newGroupsCount = 0;

    const carterasToCreate = new Map<string, string>(); 
    const groupsToCreate = new Map<string, { carteraName: string }>(); 
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
    
    const existingCarterasDocs = await getDocs(query(carterasCollectionRef, where("plazaId", "==", plazaId)));
    const existingCarteras = new Map(existingCarterasDocs.docs.map(d => [d.data().name, d.id]));

    const existingGruposDocs = await getDocs(query(gruposCollectionRef, where("plazaId", "==", plazaId)));
    const existingGrupos = new Map(existingGruposDocs.docs.map(d => [`${d.data().carteraId}_${d.data().name}`, d.id]));

    for (const [name, responsable] of carterasToCreate.entries()) {
        if (!existingCarteras.has(name)) {
            const newCartera = await addCartera({ name, plazaId, prefix, responsable });
            existingCarteras.set(name, newCartera.id);
            newCarterasCount++;
        }
    }

    for (const [name, { carteraName }] of groupsToCreate.entries()) {
        const carteraId = existingCarteras.get(carteraName);
        if (carteraId && !existingGrupos.has(`${carteraId}_${name}`)) {
            const newGrupo = await addGrupo({ name, carteraId, plazaId, prefix });
            existingGrupos.set(`${carteraId}_${name}`, newGrupo.id);
            newGroupsCount++;
        }
    }

    const BATCH_LIMIT = 500;
    let writeBatcher = writeBatch(db);
    let operationCount = 0;

    for (const carteraName of Object.keys(customerDataByCarteraAndGroup)) {
        for (const groupName of Object.keys(customerDataByCarteraAndGroup[carteraName])) {
            const carteraId = existingCarteras.get(carteraName)!;
            const grupoId = existingGrupos.get(`${carteraId}_${groupName}`) || null;

            for (const customer of customerDataByCarteraAndGroup[carteraName][groupName]) {
                const newCustomerRef = doc(customersCollectionRef);
                const { carteraName: cn, groupName: gn, responsable: r, ...rest } = customer as any;
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

    if (operationCount > 0) {
        await writeBatcher.commit();
    }
    
    return {
        newCarteras: newCarterasCount,
        newGroups: newGroupsCount,
        totalCustomers: customers.length,
    };
}


// --- Full Structure Global Import ---
interface FullStructureImportParams {
    prefix: string;
    customers: StructuredCustomerData[];
    mode: 'add' | 'replace';
}

interface FullStructureImportResult {
    newPlazas: number;
    newCarteras: number;
    newGroups: number;
    totalCustomers: number;
}

async function deleteAllDataForPrefix(prefix: string): Promise<void> {
    const batch = writeBatch(db);
    const collectionsToWipe = [plazasCollectionRef, carterasCollectionRef, gruposCollectionRef, customersCollectionRef];

    for(const coll of collectionsToWipe) {
        const q = query(coll, where("prefix", "==", prefix));
        const snapshot = await getDocs(q);
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
    }
    
    await batch.commit();
}

export async function importFullStructureFromData(params: FullStructureImportParams): Promise<FullStructureImportResult> {
    const { prefix, customers, mode } = params;

    if (mode === 'replace') {
        await deleteAllDataForPrefix(prefix);
    }
    
    let newPlazasCount = 0;
    let newCarterasCount = 0;
    let newGroupsCount = 0;

    const existingPlazas = new Map((await getDocs(query(plazasCollectionRef, where("prefix", "==", prefix)))).docs.map(d => [d.data().name, d.id]));
    const existingCarteras = new Map((await getDocs(query(carterasCollectionRef, where("prefix", "==", prefix)))).docs.map(d => [`${d.data().plazaId}_${d.data().name}`, d.id]));
    const existingGrupos = new Map((await getDocs(query(gruposCollectionRef, where("prefix", "==", prefix)))).docs.map(d => [`${d.data().carteraId}_${d.data().name}`, d.id]));

    // Group all data by plaza -> cartera -> group
    const dataByPlaza: Record<string, Record<string, Record<string, StructuredCustomerData[]>>> = {};
    const plazasToCreate = new Set<string>();
    const carterasToCreate = new Map<string, { plazaName: string, responsable: string }>();
    const groupsToCreate = new Map<string, { plazaName: string, carteraName: string }>();

    for(const customer of customers) {
        const plazaName = customer.plazaName?.trim() || "Plaza General";
        const carteraName = customer.carteraName?.trim() || "Cartera General";
        const groupName = customer.groupName?.trim() || "Sin Grupo Asignado";

        plazasToCreate.add(plazaName);
        carterasToCreate.set(`${plazaName}_${carteraName}`, { plazaName, responsable: customer.responsable || "No especificado" });
        groupsToCreate.set(`${plazaName}_${carteraName}_${groupName}`, { plazaName, carteraName });

        if (!dataByPlaza[plazaName]) dataByPlaza[plazaName] = {};
        if (!dataByPlaza[plazaName][carteraName]) dataByPlaza[plazaName][carteraName] = {};
        if (!dataByPlaza[plazaName][carteraName][groupName]) dataByPlaza[plazaName][carteraName][groupName] = [];
        dataByPlaza[plazaName][carteraName][groupName].push(customer);
    }

    // Create Plazas
    for (const name of plazasToCreate) {
        if (!existingPlazas.has(name)) {
            const newPlazaRef = doc(plazasCollectionRef);
            await setDoc(newPlazaRef, { name, prefix });
            existingPlazas.set(name, newPlazaRef.id);
            newPlazasCount++;
        }
    }

    // Create Carteras
    for (const [key, { plazaName, responsable }] of carterasToCreate.entries()) {
        const carteraName = key.split('_').slice(1).join('_');
        const plazaId = existingPlazas.get(plazaName);
        if (plazaId && !existingCarteras.has(`${plazaId}_${carteraName}`)) {
            const newCarteraRef = doc(carterasCollectionRef);
            await setDoc(newCarteraRef, { name: carteraName, plazaId, prefix, responsable });
            existingCarteras.set(`${plazaId}_${carteraName}`, newCarteraRef.id);
            newCarterasCount++;
        }
    }
    
    // Create Grupos
    for (const [key, { plazaName, carteraName }] of groupsToCreate.entries()) {
        const groupName = key.split('_').slice(2).join('_');
        const plazaId = existingPlazas.get(plazaName);
        const carteraId = existingCarteras.get(`${plazaId}_${carteraName}`);
        if (carteraId && !existingGrupos.has(`${carteraId}_${groupName}`)) {
             const newGrupoRef = doc(gruposCollectionRef);
             await setDoc(newGrupoRef, { name: groupName, carteraId, plazaId, prefix });
             existingGrupos.set(`${carteraId}_${groupName}`, newGrupoRef.id);
             newGroupsCount++;
        }
    }
    
    // Write customers
    const BATCH_LIMIT = 500;
    let writeBatcher = writeBatch(db);
    let operationCount = 0;

    for (const plazaName of Object.keys(dataByPlaza)) {
        for (const carteraName of Object.keys(dataByPlaza[plazaName])) {
            for (const groupName of Object.keys(dataByPlaza[plazaName][carteraName])) {
                
                const plazaId = existingPlazas.get(plazaName)!;
                const carteraId = existingCarteras.get(`${plazaId}_${carteraName}`)!;
                const grupoId = existingGrupos.get(`${carteraId}_${groupName}`) || null;
                
                for (const customer of dataByPlaza[plazaName][carteraName][groupName]) {
                    const newCustomerRef = doc(customersCollectionRef);
                    const { plazaName: pn, carteraName: cn, groupName: gn, responsable: r, ...rest } = customer as any;
                    const completeCustomerData = {
                        ...rest, plazaId, prefix, loanControlGroupId: grupoId, status: 'Pendiente' as const,
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
    }
    
    if (operationCount > 0) {
        await writeBatcher.commit();
    }

    return { newPlazas: newPlazasCount, newCarteras: newCarterasCount, newGroups: newGroupsCount, totalCustomers: customers.length };
}


