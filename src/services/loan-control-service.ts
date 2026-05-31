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
    Timestamp,
    WriteBatch
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { LoanControlCartera, LoanControlGrupo, Customer, Plaza, HistoryLog } from "@/lib/data";
import { customerFromDoc } from "./customer-service-helper";

const carterasCollectionRef = collection(db, "loanControlCarteras");
const gruposCollectionRef = collection(db, "loanControlGrupos");
const plazasCollectionRef = collection(db, "plazas");
const customersCollectionRef = collection(db, "customers");
const historyCollectionRef = collection(db, "historyLogs");


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

export async function addPayment(customerId: string, paymentAmount: number, userName: string): Promise<void> {
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

        // Add to history log
        const historyLog: Omit<HistoryLog, 'id'> = {
            prefix: customerData.prefix || 'N/A',
            toolContext: 'loan-control',
            type: 'payment',
            timestamp: new Date(),
            userName: userName,
            details: `Abono de $${paymentAmount} a ${customerData.name}. Saldo anterior: $${previousDueAmount}. Saldo nuevo: $${newDueAmount > 0 ? newDueAmount : 0}.`,
            customerName: customerData.name,
            amount: paymentAmount,
            promoter: customerData.promoter,
            group: customerData.groupName
        };
        const historyDocRef = doc(historyCollectionRef);
        transaction.set(historyDocRef, historyLog);
    });
}


// --- Full Data Import ---
export async function clearDataByPrefix(prefix: string) {
    const collectionsToDelete = [
        query(plazasCollectionRef, where("prefix", "==", prefix), where("toolContext", "==", "loan-control")),
        query(carterasCollectionRef, where("prefix", "==", prefix)),
        query(gruposCollectionRef, where("prefix", "==", prefix)),
        query(customersCollectionRef, where("prefix", "==", prefix)), // Assuming customers are shared, or filter by a context if they are not
    ];

    for (const q of collectionsToDelete) {
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

    const plazaCache: Record<string, string> = {};
    const carteraCache: Record<string, string> = {};
    const grupoCache: Record<string, string> = {};

    if (mode === 'add') {
        const plazaQuery = query(plazasCollectionRef, where("prefix", "==", prefix), where("toolContext", "==", "loan-control"));
        const plazaSnapshot = await getDocs(plazaQuery);
        plazaSnapshot.forEach(doc => { plazaCache[doc.data().name] = doc.id; });

        const carteraQuery = query(carterasCollectionRef, where("prefix", "==", prefix));
        const carteraSnapshot = await getDocs(carteraQuery);
        carteraSnapshot.forEach(doc => { carteraCache[`${doc.data().plazaId}_${doc.data().name}`] = doc.id; });
        
        const grupoQuery = query(gruposCollectionRef, where("prefix", "==", prefix));
        const grupoSnapshot = await getDocs(grupoQuery);
        grupoSnapshot.forEach(doc => { grupoCache[`${doc.data().carteraId}_${doc.data().name}`] = doc.id; });
    }
    
    let batch = writeBatch(db);
    let operationCount = 0;
    
    let lastPlazaName = '';
    let lastCarteraName = '';
    let lastGroupName = '';

    const commitBatchIfNeeded = async () => {
        if (operationCount >= 400) {
            await batch.commit();
            batch = writeBatch(db);
            operationCount = 0;
        }
    };
    
    for (const row of data) {
        const currentPlazaName = String(row.Plaza || row.plaza || '').trim() || lastPlazaName;
        const currentCarteraName = String(row.Cartera || row.cartera || '').trim() || lastCarteraName;
        const currentGroupName = String(row.Grupo || row.grupo || '').trim() || lastGroupName;
        
        lastPlazaName = currentPlazaName;
        lastCarteraName = currentCarteraName;
        lastGroupName = currentGroupName;

        const customerName = String(row.Cliente || row.Nombre || row.nombre || '').trim();

        // Skip if we don't have basic hierarchy info
        if (!currentPlazaName || !currentCarteraName || !currentGroupName) {
            continue;
        }

        await commitBatchIfNeeded();

        // Get or create Plaza
        let plazaId = plazaCache[currentPlazaName];
        if (!plazaId) {
            const newDocRef = doc(plazasCollectionRef);
            plazaId = newDocRef.id;
            batch.set(newDocRef, { name: currentPlazaName, prefix, toolContext: 'loan-control' });
            operationCount++;
            plazaCache[currentPlazaName] = plazaId;
        }

        // Get or create Cartera
        const carteraKey = `${plazaId}_${currentCarteraName}`;
        let carteraId = carteraCache[carteraKey];
        if (!carteraId) {
            const newDocRef = doc(carterasCollectionRef);
            carteraId = newDocRef.id;
            batch.set(newDocRef, { name: currentCarteraName, plazaId, prefix });
            operationCount++;
            carteraCache[carteraKey] = carteraId;
        }
        
        // Get or create Grupo
        const grupoKey = `${carteraId}_${currentGroupName}`;
        let grupoId = grupoCache[grupoKey];
        if (!grupoId) {
            const newDocRef = doc(gruposCollectionRef);
            grupoId = newDocRef.id;
            batch.set(newDocRef, { name: currentGroupName, plazaId, carteraId, prefix });
            operationCount++;
            grupoCache[grupoKey] = grupoId;
        }

        // If there's no customer name, we are done with this row (it was for hierarchy)
        if (!customerName) {
            continue;
        }
        
        let fechaPrestamoDate;
        const fechaValue = row['F. Prestamo'] || row.FechaPrestamo || row.fechaPrestamo || row.fecha_prestamo;
        if (fechaValue) {
            if (fechaValue instanceof Date) {
                fechaPrestamoDate = fechaValue;
            } else if (typeof fechaValue === 'string') {
                const parsed = Date.parse(fechaValue.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$2/$1/$3'));
                fechaPrestamoDate = isNaN(parsed) ? undefined : new Date(parsed);
            } else if (typeof fechaValue === 'number') { 
                const excelEpoch = new Date(1899, 11, 30);
                fechaPrestamoDate = new Date(excelEpoch.getTime() + (fechaValue * 86400000));
            }
        }

        const parseNumeric = (val: any) => {
            if (val === null || val === undefined || String(val).trim() === '') return 0;
            const num = parseFloat(String(val).replace(/[^0-9.-]+/g,""));
            return isNaN(num) ? 0 : num;
        };

        const loanAmountRaw = row.Prestamo !== undefined ? row.Prestamo : 
                              (row.Préstamo !== undefined ? row.Préstamo : 
                              (row.prestamo !== undefined ? row.prestamo : 
                              (row.préstamo !== undefined ? row.préstamo : 
                              (row.PRESTAMO !== undefined ? row.PRESTAMO : 
                              (row.PRÉSTAMO !== undefined ? row.PRÉSTAMO : 0)))));
        const loanAmount = parseNumeric(loanAmountRaw);
        const dueAmountRaw = row.Saldo !== undefined ? row.Saldo : row.adeudo;
        const dueAmount = dueAmountRaw !== undefined && String(dueAmountRaw).trim() !== "" ? parseNumeric(dueAmountRaw) : loanAmount;

        const completeCustomerData = {
            plazaId,
            loanControlGroupId: grupoId,
            status: dueAmount <= 0 ? 'Pagado' : 'Pendiente' as const,
            prefix,
            name: customerName,
            address: String(row.Dirección || row.Direccion || ''),
            phone: String(row.Telefonos || row.Telefono || ''),
            colonia: String(row.Colonia || ''),
            cp: String(row.CP || row['C.P.'] || ''),
            guarantor: String(row.Aval || ''),
            direccionAval: String(row.DireccionAval || ''),
            guarantorPhone: String(row.TelefonoAval || row.TelefonosAval || ''),
            coloniaAval: String(row.ColoniaAval || ''),
            cpAval: String(row.CPAval || ''),
            loanAmount: loanAmount,
            paymentAmount: parseNumeric(row.Pago),
            installmentsDue: parseInt(String(row.Vencidos || 0), 10) || 0,
            dueAmount: dueAmount,
            fechaPrestamo: fechaPrestamoDate ? Timestamp.fromDate(fechaPrestamoDate) : null,
            toolContext: 'loan-control',
        };
        
        const customerRef = doc(customersCollectionRef);
        batch.set(customerRef, completeCustomerData);
        operationCount++;
    }

    if (operationCount > 0) {
        await batch.commit();
    }
}

// --- Recall Functionality ---

export async function performRecall(
    plazaId: string,
    operation: 'sum' | 'subtract',
    multiple: number,
    totalAmount: number,
    userName: string
): Promise<{ success: boolean; totalApplied: number; customersAffected: number }> {
    const q = query(customersCollectionRef, where("plazaId", "==", plazaId));
    const snapshot = await getDocs(q);
    const customers = snapshot.docs.map(customerFromDoc);

    if (customers.length === 0) {
        throw new Error("No hay clientes en esta plaza para realizar el ajuste.");
    }

    let currentRecalled = 0;
    let customersAffected = new Set<string>();
    let batch = writeBatch(db);
    let operationCount = 0;

    // Use a while loop to keep applying units until target reached or no more changes possible
    let changedInLastPass = true;
    while (currentRecalled < totalAmount && changedInLastPass) {
        changedInLastPass = false;

        for (const customer of customers) {
            if (currentRecalled >= totalAmount) break;

            let amountToApply = multiple;
            if (currentRecalled + amountToApply > totalAmount) {
                amountToApply = totalAmount - currentRecalled;
            }

            if (operation === 'subtract') {
                // Ensure we don't go negative
                if (customer.dueAmount < amountToApply) continue;
                
                customer.dueAmount -= amountToApply;
                customer.status = customer.dueAmount <= 0 ? 'Pagado' : 'Pendiente';
            } else {
                customer.dueAmount += amountToApply;
                customer.status = 'Pendiente';
            }

            currentRecalled += amountToApply;
            customersAffected.add(customer.id);
            changedInLastPass = true;

            // Prepare doc update (only modify active debt and status, keeping loanAmount static)
            batch.update(doc(db, "customers", customer.id), {
                dueAmount: customer.dueAmount,
                status: customer.status
            });

            operationCount++;
            if (operationCount >= 450) {
                await batch.commit();
                batch = writeBatch(db);
                operationCount = 0;
            }
        }
    }

    if (operationCount > 0) {
        await batch.commit();
    }
    
    // Log in history
    const historyLog: Omit<HistoryLog, 'id'> = {
        prefix: customers[0].prefix || 'N/A',
        toolContext: 'loan-control',
        type: 'update',
        timestamp: new Date(),
        userName: userName,
        details: `Se realizó RECALL (${operation === 'sum' ? 'Suma' : 'Resta'}) de un total de $${totalAmount.toLocaleString()} en múltiplos de $${multiple}. Clientes afectados: ${customersAffected.size}.`,
    };
    await addDoc(historyCollectionRef, historyLog);

    return { success: true, totalApplied: currentRecalled, customersAffected: customersAffected.size };
}

export async function getLoanControlPlazaDetailData(plazaId: string): Promise<{
    plaza: Plaza | null;
    carteras: (LoanControlCartera & { grupoCount: number; totalLoaned: number; totalDue: number })[];
}> {
    const plazaDocRef = doc(db, "plazas", plazaId);
    
    // Fetch plaza, carteras, grupos, and customers all in parallel on the server
    const [plazaSnap, carterasSnap, gruposSnap, customersSnap] = await Promise.all([
        getDoc(plazaDocRef),
        getDocs(query(carterasCollectionRef, where("plazaId", "==", plazaId))),
        getDocs(query(gruposCollectionRef, where("plazaId", "==", plazaId))),
        getDocs(query(customersCollectionRef, where("plazaId", "==", plazaId)))
    ]);

    if (!plazaSnap.exists()) {
        return { plaza: null, carteras: [] };
    }

    const plazaData = plazaSnap.data();
    const plaza = {
        id: plazaSnap.id,
        ...plazaData,
        pendingDebt: plazaData.pendingDebt || 0,
        recoveryRate: plazaData.recoveryRate || 0,
        totalLoanAmount: plazaData.totalLoanAmount || 0,
    } as Plaza;

    const carteras = carterasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as LoanControlCartera[];
    const grupos = gruposSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as LoanControlGrupo[];
    const customers = customersSnap.docs.map(customerFromDoc);

    const carterasWithStats = carteras.map(cartera => {
        const carteraGrupos = grupos.filter(g => g.carteraId === cartera.id);
        let totalLoaned = 0;
        let totalDue = 0;

        carteraGrupos.forEach(grupo => {
            const grupoCustomers = customers.filter(c => c.loanControlGroupId === grupo.id);
            totalLoaned += grupoCustomers.reduce((acc, c) => acc + (c.loanAmount || 0), 0);
            totalDue += grupoCustomers.reduce((acc, c) => acc + (c.dueAmount || 0), 0);
        });

        return {
            ...cartera,
            grupoCount: carteraGrupos.length,
            totalLoaned,
            totalDue,
        };
    });

    return {
        plaza,
        carteras: carterasWithStats,
    };
}
