
'use server';

import { 
    collection, 
    getDocs, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    query, 
    where, 
    writeBatch,
    getDoc,
    runTransaction,
    Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { LoanControlCartera, LoanControlGrupo, Customer, Plaza } from "@/lib/data";
import { customerFromDoc } from "./customer-service-helper";
import type { FullLoanDataParserOutput } from "@/ai/flows/full-loan-data-parser-flow";

const carterasCollectionRef = collection(db, "loanControlCarteras");
const gruposCollectionRef = collection(db, "loanControlGrupos");
const plazasCollectionRef = collection(db, "plazas");
const customersCollectionRef = collection(db, "customers");

// --- Cartera Functions ---

export async function getCarterasByPlaza(plazaId: string): Promise<LoanControlCartera[]> {
    const q = query(carterasCollectionRef, where("plazaId", "==", plazaId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as LoanControlCartera[];
}

export async function getCarteraById(carteraId: string): Promise<LoanControlCartera | null> {
    const docRef = doc(db, "loanControlCarteras", carteraId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as LoanControlCartera : null;
}

export async function addCartera(cartera: Omit<LoanControlCartera, 'id'>): Promise<LoanControlCartera> {
    const docRef = await addDoc(carterasCollectionRef, cartera);
    return { ...cartera, id: docRef.id };
}

export async function updateCartera(id: string, cartera: Partial<Omit<LoanControlCartera, 'id'>>) {
    const carteraDoc = doc(db, "loanControlCarteras", id);
    await updateDoc(carteraDoc, cartera);
}

export async function deleteCartera(carteraId: string) {
    const batch = writeBatch(db);
    
    // Delete the cartera itself
    const carteraDocRef = doc(db, "loanControlCarteras", carteraId);
    batch.delete(carteraDocRef);

    // Delete all grupos within that cartera
    const gruposQuery = query(gruposCollectionRef, where("carteraId", "==", carteraId));
    const gruposSnapshot = await getDocs(gruposQuery);
    
    const grupoDeletionPromises = gruposSnapshot.docs.map(async (grupoDoc) => {
        batch.delete(grupoDoc.ref);
        // Find customers in this grupo and unassign them
        const customersQuery = query(customersCollectionRef, where("loanControlGroupId", "==", grupoDoc.id));
        const customersSnapshot = await getDocs(customersQuery);
        customersSnapshot.forEach(customerDoc => {
            batch.update(customerDoc.ref, { loanControlGroupId: "" });
        });
    });

    await Promise.all(grupoDeletionPromises);
    await batch.commit();
}


// --- Grupo Functions ---

export async function getGruposByCartera(carteraId: string): Promise<LoanControlGrupo[]> {
    const q = query(gruposCollectionRef, where("carteraId", "==", carteraId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as LoanControlGrupo[];
}

export async function getGrupoById(grupoId: string): Promise<LoanControlGrupo | null> {
    const docRef = doc(db, "loanControlGrupos", grupoId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as LoanControlGrupo : null;
}

export async function addGrupo(grupo: Omit<LoanControlGrupo, 'id'>): Promise<LoanControlGrupo> {
    const docRef = await addDoc(gruposCollectionRef, grupo);
    return { ...grupo, id: docRef.id };
}

export async function updateGrupo(id: string, grupo: Partial<Omit<LoanControlGrupo, 'id'>>) {
    const grupoDoc = doc(db, "loanControlGrupos", id);
    await updateDoc(grupoDoc, grupo);
}

export async function deleteGrupo(grupoId: string) {
    const batch = writeBatch(db);

    // Delete the grupo itself
    const grupoDocRef = doc(db, "loanControlGrupos", grupoId);
    batch.delete(grupoDocRef);

    // Find customers in this grupo and unassign them
    const customersQuery = query(customersCollectionRef, where("loanControlGroupId", "==", grupoId));
    const customersSnapshot = await getDocs(customersQuery);
    customersSnapshot.forEach(customerDoc => {
        batch.update(customerDoc.ref, { loanControlGroupId: "" });
    });

    await batch.commit();
}


// --- Customer Assignment and Management ---

export async function getAssignedCustomersByGrupo(grupoId: string): Promise<Customer[]> {
    const q = query(customersCollectionRef, where("loanControlGroupId", "==", grupoId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(customerFromDoc);
}

export async function getUnassignedCustomersByPlaza(plazaId: string): Promise<Customer[]> {
    const q = query(customersCollectionRef, where("plazaId", "==", plazaId), where("loanControlGroupId", "in", ["", null]));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(customerFromDoc);
}

export async function assignCustomersToGrupo(customerIds: string[], grupoId: string) {
    const batch = writeBatch(db);
    customerIds.forEach(customerId => {
        const customerRef = doc(db, "customers", customerId);
        batch.update(customerRef, { loanControlGroupId: grupoId });
    });
    await batch.commit();
}

export async function unassignCustomerFromGrupo(customerId: string) {
    const customerRef = doc(db, "customers", customerId);
    await updateDoc(customerRef, { loanControlGroupId: "" });
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


// --- Full Data Import ---
export async function importFullLoanData(
    data: FullLoanDataParserOutput,
    mode: 'add' | 'replace',
    prefix: string
): Promise<void> {
    const batch = writeBatch(db);

    // If 'replace', first delete all existing data for this prefix
    if (mode === 'replace') {
        const collectionsToDelete = [plazasCollectionRef, carterasCollectionRef, gruposCollectionRef, customersCollectionRef];
        for (const coll of collectionsToDelete) {
            const q = query(coll, where("prefix", "==", prefix));
            const snapshot = await getDocs(q);
            snapshot.docs.forEach(d => batch.delete(d.ref));
        }
    }

    // Now, add the new data
    for (const plazaData of data) {
        // Create or get Plaza
        const plazaRef = doc(plazasCollectionRef);
        batch.set(plazaRef, { name: plazaData.plazaName, prefix });
        
        for (const carteraData of plazaData.carteras) {
            // Create or get Cartera
            const carteraRef = doc(carterasCollectionRef);
            batch.set(carteraRef, { name: carteraData.carteraName, plazaId: plazaRef.id, prefix });

            for (const grupoData of carteraData.grupos) {
                // Create or get Grupo
                const grupoRef = doc(gruposCollectionRef);
                batch.set(grupoRef, { name: grupoData.groupName, carteraId: carteraRef.id, plazaId: plazaRef.id, prefix });

                for (const customerData of grupoData.customers) {
                    const customerRef = doc(customersCollectionRef);
                    const completeCustomerData: Omit<Customer, 'id'> = {
                        plazaId: plazaRef.id,
                        loanControlGroupId: grupoRef.id,
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
                        fechaPrestamo: customerData.fechaPrestamo ? new Date(customerData.fechaPrestamo) : new Date(),
                    };

                    const { fechaPrestamo, ...restOfData } = completeCustomerData;
                    batch.set(customerRef, {
                        ...restOfData,
                        fechaPrestamo: fechaPrestamo ? Timestamp.fromDate(fechaPrestamo) : Timestamp.now()
                    });
                }
            }
        }
    }

    await batch.commit();
}
