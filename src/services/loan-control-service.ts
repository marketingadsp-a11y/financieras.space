
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
    });
}


// --- Full Data Import ---
export async function clearDataByPrefix(prefix: string) {
    const collectionsToDelete = [plazasCollectionRef, carterasCollectionRef, gruposCollectionRef, customersCollectionRef];
    for (const coll of collectionsToDelete) {
        const q = query(coll, where("prefix", "==", prefix));
        const snapshot = await getDocs(q);
        if (snapshot.empty) continue;

        let batch = writeBatch(db);
        let count = 0;
        for (const d of snapshot.docs) {
            batch.delete(d.ref);
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
}


export async function importFullLoanData(
    data: any[],
    mode: 'add' | 'replace',
    prefix: string
): Promise<void> {
    
    if (mode === 'replace') {
        await clearDataByPrefix(prefix);
    }
    
    let batch = writeBatch(db);
    let operationCount = 0;
    const plazaCache: Record<string, string> = {};
    const carteraCache: Record<string, string> = {};
    const grupoCache: Record<string, string> = {};

    let lastPlazaName = '';
    let lastCarteraName = '';
    let lastGroupName = '';

    for (const row of data) {
         // Skip fully empty rows silently
        if (Object.values(row).every(val => val === null || val === '')) {
            continue;
        }

        const commitBatchIfNeeded = async () => {
            if (operationCount >= 400) {
                await batch.commit();
                batch = writeBatch(db);
                operationCount = 0;
            }
        };

        const currentPlazaName = row.Plaza || lastPlazaName;
        const currentCarteraName = row.Cartera || lastCarteraName;
        const currentGroupName = row.Grupo || lastGroupName;

        const customerName = row.Cliente || row.Nombre;
        
        // A row is only valid if it has a customer name and we know its hierarchy
        if (!customerName || !currentPlazaName || !currentCarteraName || !currentGroupName) {
            if (Object.values(row).some(val => val !== null && val !== '')) {
                lastPlazaName = currentPlazaName;
                lastCarteraName = currentCarteraName;
                lastGroupName = currentGroupName;
            }
            continue;
        }

        lastPlazaName = currentPlazaName;
        lastCarteraName = currentCarteraName;
        lastGroupName = currentGroupName;

        let plazaId = plazaCache[currentPlazaName];
        if (!plazaId) {
            const plazaRef = doc(plazasCollectionRef);
            batch.set(plazaRef, { name: currentPlazaName, prefix });
            plazaId = plazaRef.id;
            plazaCache[currentPlazaName] = plazaId;
            operationCount++;
            await commitBatchIfNeeded();
        }

        const carteraKey = `${plazaId}_${currentCarteraName}`;
        let carteraId = carteraCache[carteraKey];
        if (!carteraId) {
            const carteraRef = doc(carterasCollectionRef);
            batch.set(carteraRef, { name: currentCarteraName, plazaId, prefix });
            carteraId = carteraRef.id;
            carteraCache[carteraKey] = carteraId;
            operationCount++;
            await commitBatchIfNeeded();
        }

        const grupoKey = `${carteraId}_${currentGroupName}`;
        let grupoId = grupoCache[grupoKey];
        if (!grupoId) {
            const grupoRef = doc(gruposCollectionRef);
            batch.set(grupoRef, { name: currentGroupName, carteraId, plazaId, prefix });
            grupoId = grupoRef.id;
            grupoCache[grupoKey] = grupoId;
            operationCount++;
            await commitBatchIfNeeded();
        }
        
        let fechaPrestamoDate;
        const fechaValue = row['F. Prestamo'] || row.FechaPrestamo || row.fechaPrestamo || row.fecha_prestamo;
        if (fechaValue) {
            if (fechaValue instanceof Date) {
                fechaPrestamoDate = fechaValue;
            } else if (typeof fechaValue === 'string') {
                const parsed = Date.parse(fechaValue);
                fechaPrestamoDate = isNaN(parsed) ? undefined : new Date(parsed);
            } else if (typeof fechaValue === 'number') { 
                 const excelEpoch = new Date(1899, 11, 30);
                 fechaPrestamoDate = new Date(excelEpoch.getTime() + fechaValue * 86400000);
            }
        }

        const loanAmount = parseFloat(String(row.Prestamo || 0).replace(/[^0-9.-]+/g,""));
        const dueAmountRaw = row.Saldo || row.adeudo;
        const dueAmount = dueAmountRaw === undefined || String(dueAmountRaw).trim() === "" ? loanAmount : parseFloat(String(dueAmountRaw).replace(/[^0-9.-]+/g,""));

        const completeCustomerData = {
            plazaId: plazaId,
            loanControlGroupId: grupoId,
            status: dueAmount <= 0 ? 'Pagado' : 'Pendiente' as const,
            prefix: prefix,
            name: customerName,
            address: row.Dirección || row.Direccion || '',
            phone: String(row.Telefonos || row.Telefono || ''),
            colonia: row.Colonia || '',
            cp: String(row.CP || row['C.P.'] || ''),
            guarantor: row.Aval || '',
            direccionAval: row.DireccionAval || '',
            guarantorPhone: String(row.TelefonoAval || row.TelefonosAval || ''),
            coloniaAval: row.ColoniaAval || '',
            cpAval: String(row.CPAval || ''),
            loanAmount: loanAmount,
            paymentAmount: row.Pago || 0,
            installmentsDue: row.Vencidos || 0,
            dueAmount: dueAmount,
            fechaPrestamo: fechaPrestamoDate ? Timestamp.fromDate(fechaPrestamoDate) : null,
        };
        
        const customerRef = doc(customersCollectionRef);
        batch.set(customerRef, completeCustomerData);
        operationCount++;
        await commitBatchIfNeeded();
    }

    if (operationCount > 0) {
        await batch.commit();
    }
}

    