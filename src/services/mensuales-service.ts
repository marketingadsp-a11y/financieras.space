

'use server';

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, writeBatch, runTransaction, Timestamp, getDoc, orderBy, type Transaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { OficinaMensual, ClienteMensual, MovimientoMensual, InterestRate } from "@/lib/data";

const oficinasCollectionRef = collection(db, "mensuales_oficinas");
const clientesCollectionRef = collection(db, "mensuales_clientes");
const movimientosCollectionRef = collection(db, "mensuales_movimientos");
const interestRatesCollectionRef = collection(db, "mensuales_interestRates");

type PendingInterestResult = {
    updatedCliente: ClienteMensual;
    updates?: Partial<ClienteMensual>;
    newMovements: Omit<MovimientoMensual, 'id' | 'clienteId'>[];
};

function computePendingInterest(cliente: ClienteMensual): PendingInterestResult {
    if (cliente.status === 'liquidado' || !cliente.registrationDate) {
        return { updatedCliente: cliente, newMovements: [] };
    }

    const updatedClienteData = { ...cliente };
    const lastChargeDate = cliente.lastInterestChargedDate || cliente.registrationDate;

    const now = new Date();
    let chargeDateCursor = new Date(lastChargeDate);
    let interestToCharge = 0;
    const newMovements: Omit<MovimientoMensual, 'id' | 'clienteId'>[] = [];
    let newLastChargedDate = lastChargeDate;

    while (chargeDateCursor < now) {
        const nextChargeCutoff = new Date(chargeDateCursor.getFullYear(), chargeDateCursor.getMonth(), cliente.paymentDay + 1);

        if (now >= nextChargeCutoff && lastChargeDate < nextChargeCutoff) {
            const interestForThisMonth = (updatedClienteData.currentBalance * updatedClienteData.interestRateValue) / 100;

            interestToCharge += interestForThisMonth;
            newLastChargedDate = new Date(chargeDateCursor.getFullYear(), chargeDateCursor.getMonth() + 1, cliente.paymentDay);

            newMovements.push({
                date: newLastChargedDate,
                type: 'charge_interest',
                amount: interestForThisMonth,
                notes: `Cargo de interés del ${cliente.interestRateValue}% sobre $${updatedClienteData.currentBalance.toLocaleString()}`
            });

            updatedClienteData.unpaidInterest = (updatedClienteData.unpaidInterest || 0) + interestForThisMonth;
            chargeDateCursor = new Date(chargeDateCursor.getFullYear(), chargeDateCursor.getMonth() + 1, 1);
        } else {
            break;
        }
    }

    if (interestToCharge <= 0) {
        return { updatedCliente: cliente, newMovements: [] };
    }

    const newUnpaidInterest = updatedClienteData.unpaidInterest;
    const monthsOverdue = cliente.interestRateValue > 0 ? newUnpaidInterest / ((cliente.loanAmount * cliente.interestRateValue) / 100) : 0;
    const newStatus = monthsOverdue >= 3 ? 'vencido' : 'vigente';

    const updates: Partial<ClienteMensual> = {
        unpaidInterest: newUnpaidInterest,
        lastInterestChargedDate: newLastChargedDate,
        status: newStatus,
    };

    updatedClienteData.lastInterestChargedDate = newLastChargedDate;
    updatedClienteData.status = newStatus;

    return { updatedCliente: updatedClienteData, updates, newMovements };
}

// This function will automatically charge interest if a payment cycle has passed.
async function chargeInterestIfNeeded(cliente: ClienteMensual, transaction?: Transaction): Promise<ClienteMensual> {
    const { updatedCliente, updates, newMovements } = computePendingInterest(cliente);
    if (!updates) return updatedCliente;

    const clienteRef = doc(db, 'mensuales_clientes', cliente.id);

    if (transaction) {
        transaction.update(clienteRef, updates);
        newMovements.forEach(movement => {
            const movRef = doc(movimientosCollectionRef);
            transaction.set(movRef, { ...movement, clienteId: cliente.id });
        });
    } else {
        const batch = writeBatch(db);
        batch.update(clienteRef, updates);
        newMovements.forEach(movement => {
            const movRef = doc(movimientosCollectionRef);
            batch.set(movRef, { ...movement, clienteId: cliente.id });
        });
        await batch.commit();
    }

    return updatedCliente;
}

async function processClientsInterestBatch(clientes: ClienteMensual[]): Promise<ClienteMensual[]> {
    const results = clientes.map(computePendingInterest);
    const pendingItems = results.filter(r => r.updates);

    if (pendingItems.length > 0) {
        let batch = writeBatch(db);
        let opCount = 0;

        for (const item of pendingItems) {
            const clienteRef = doc(db, 'mensuales_clientes', item.updatedCliente.id);
            batch.update(clienteRef, item.updates!);
            opCount++;

            for (const movement of item.newMovements) {
                if (opCount >= 400) {
                    await batch.commit();
                    batch = writeBatch(db);
                    opCount = 0;
                }
                const movRef = doc(movimientosCollectionRef);
                batch.set(movRef, { ...movement, clienteId: item.updatedCliente.id });
                opCount++;
            }

            if (opCount >= 400) {
                await batch.commit();
                batch = writeBatch(db);
                opCount = 0;
            }
        }

        if (opCount > 0) {
            await batch.commit();
        }
    }

    return results.map(r => r.updatedCliente);
}

function mapClienteDoc(docSnap: any): ClienteMensual {
    const data = docSnap.data();
    return {
        id: docSnap.id,
        displayId: data.displayId || "0000",
        name: data.name || "",
        prefix: data.prefix || "",
        oficinaId: data.oficinaId || "",
        loanAmount: data.loanAmount || 0,
        paymentDay: data.paymentDay || 1,
        interestRateId: data.interestRateId || "",
        interestRateValue: data.interestRateValue || 0,
        currentBalance: data.currentBalance || 0,
        unpaidInterest: data.unpaidInterest || 0,
        registrationDate: data.registrationDate?.toDate(),
        status: data.status || 'vigente',
        lastInterestChargedDate: data.lastInterestChargedDate?.toDate(),
        lastPaymentDate: data.lastPaymentDate?.toDate(),
    } as ClienteMensual;
}



export async function getOficinas(prefix: string): Promise<OficinaMensual[]> {
    const q = query(oficinasCollectionRef, where("prefix", "==", prefix));
    const snapshot = await getDocs(q);
    const oficinas = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as OficinaMensual[];
    return oficinas.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getOficinaById(id: string): Promise<OficinaMensual | null> {
    if (!id) return null;
    const docRef = doc(db, "mensuales_oficinas", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as OficinaMensual;
    }
    return null;
}

export async function addOficina(oficina: Omit<OficinaMensual, 'id'>): Promise<OficinaMensual> {
    const docRef = await addDoc(oficinasCollectionRef, oficina);
    return { ...oficina, id: docRef.id };
}

export async function updateOficina(id: string, oficina: Partial<Omit<OficinaMensual, 'id'>>) {
    const oficinaDoc = doc(db, "mensuales_oficinas", id);
    await updateDoc(oficinaDoc, oficina);
}

export async function deleteOficina(id: string) {
    const batch = writeBatch(db);

    // Delete the oficina
    const oficinaDocRef = doc(db, "mensuales_oficinas", id);
    batch.delete(oficinaDocRef);

    // Find and delete all clients in that oficina
    const clientesQuery = query(clientesCollectionRef, where("oficinaId", "==", id));
    const clientesSnapshot = await getDocs(clientesQuery);
    clientesSnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
}


// --- Client Functions ---

export async function getClientes(prefix: string): Promise<ClienteMensual[]> {
    const q = query(clientesCollectionRef, where("prefix", "==", prefix));
    const snapshot = await getDocs(q);
    const clientes = snapshot.docs.map(mapClienteDoc);
    return processClientsInterestBatch(clientes);
}

export async function getClientesByOficina(oficinaId: string): Promise<ClienteMensual[]> {
    const q = query(clientesCollectionRef, where("oficinaId", "==", oficinaId));
    const snapshot = await getDocs(q);
    const clientes = snapshot.docs.map(mapClienteDoc);
    return processClientsInterestBatch(clientes);
}

export async function searchClientesByName(name: string, prefix: string): Promise<ClienteMensual[]> {
    const searchTerm = name.toUpperCase();
    const q = query(
        clientesCollectionRef,
        where("prefix", "==", prefix),
        where("name", ">=", searchTerm),
        where("name", "<=", searchTerm + '\uf8ff')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            displayId: data.displayId || "0000",
            name: data.name || "",
            prefix: data.prefix || "",
            oficinaId: data.oficinaId || "",
            loanAmount: data.loanAmount || 0,
            paymentDay: data.paymentDay || 1,
            interestRateId: data.interestRateId || "",
            interestRateValue: data.interestRateValue || 0,
            currentBalance: data.currentBalance || 0,
            unpaidInterest: data.unpaidInterest || 0,
            registrationDate: data.registrationDate?.toDate(),
            status: data.status || 'vigente',
        } as ClienteMensual;
    });
}


export async function getClienteById(id: string): Promise<ClienteMensual | null> {
    if (!id) return null;
    const clienteRef = doc(db, "mensuales_clientes", id);
    const clienteSnap = await getDoc(clienteRef);

    if (clienteSnap.exists()) {
        const data = clienteSnap.data();
        let cliente = {
            id: clienteSnap.id,
            displayId: data.displayId || "0000",
            name: data.name || "",
            prefix: data.prefix || "",
            oficinaId: data.oficinaId || "", // Ensure oficinaId is a string
            loanAmount: data.loanAmount || 0,
            paymentDay: data.paymentDay || 1,
            interestRateId: data.interestRateId || "",
            interestRateValue: data.interestRateValue || 0,
            currentBalance: data.currentBalance || 0,
            unpaidInterest: data.unpaidInterest || 0,
            registrationDate: data.registrationDate?.toDate(),
            status: data.status || 'vigente',
            lastInterestChargedDate: data.lastInterestChargedDate?.toDate(),
            lastPaymentDate: data.lastPaymentDate?.toDate(),
        } as ClienteMensual;

        cliente = await chargeInterestIfNeeded(cliente);

        return cliente;
    }
    return null;
}

// Function to generate a unique 4-digit ID
async function generateUniqueDisplayId(prefix: string): Promise<string> {
    let unique = false;
    let newId = '';
    while (!unique) {
        newId = Math.floor(1000 + Math.random() * 9000).toString();
        const q = query(clientesCollectionRef, where("prefix", "==", prefix), where("displayId", "==", newId));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            unique = true;
        }
    }
    return newId;
}

export async function addCliente(cliente: Omit<ClienteMensual, 'id' | 'displayId'>): Promise<ClienteMensual> {
    const displayId = await generateUniqueDisplayId(cliente.prefix);

    const initialMovement: Omit<MovimientoMensual, 'id' | 'clienteId'> = {
        date: new Date(),
        type: 'initial_loan',
        amount: cliente.loanAmount,
        notes: 'Préstamo inicial registrado'
    };
    
    const clienteWithDisplayId = { 
        ...cliente, 
        displayId, 
        name: cliente.name.toUpperCase(), 
        unpaidInterest: 0,
        registrationDate: new Date(),
    };

    const clienteDocRef = doc(collection(db, "mensuales_clientes"));
    const movimientoDocRef = doc(collection(db, "mensuales_movimientos"));
    
    await runTransaction(db, async (transaction) => {
        transaction.set(clienteDocRef, { ...clienteWithDisplayId, id: clienteDocRef.id });
        transaction.set(movimientoDocRef, { ...initialMovement, clienteId: clienteDocRef.id });
    });
    
    return { ...clienteWithDisplayId, id: clienteDocRef.id };
}

export async function updateCliente(id: string, updates: Partial<ClienteMensual>): Promise<void> {
    const clienteRef = doc(db, 'mensuales_clientes', id);

    // If registrationDate is being changed, it's a special case that requires recalculation.
    if (updates.registrationDate) {
         await runTransaction(db, async (transaction) => {
            const clienteDoc = await transaction.get(clienteRef);
            if (!clienteDoc.exists()) {
                throw new Error("El cliente a actualizar no existe.");
            }

            // 1. Delete all existing interest charge movements for this client
            const q = query(movimientosCollectionRef, where("clienteId", "==", id), where("type", "==", "charge_interest"));
            const interestMovementsSnapshot = await getDocs(q); // This should be outside transaction, but let's try
            interestMovementsSnapshot.forEach(movDoc => {
                transaction.delete(movDoc.ref);
            });

            // 2. Reset interest fields and status to a clean slate before recalculation
            const resetUpdates: Record<string, any> = {
                registrationDate: Timestamp.fromDate(updates.registrationDate!),
                unpaidInterest: 0,
                lastInterestChargedDate: Timestamp.fromDate(updates.registrationDate!),
                status: 'vigente', 
            };
            transaction.update(clienteRef, resetUpdates);
        });

        // 3. After the transaction commits, fetch the cleaned client and run the charge logic
        const updatedClienteSnap = await getDoc(clienteRef);
        if(updatedClienteSnap.exists()){
            await chargeInterestIfNeeded(updatedClienteSnap.data() as ClienteMensual);
        }

    } else {
        // For any other simple update, just apply it.
        const dataToUpdate: Record<string, any> = { ...updates };
        await updateDoc(clienteRef, dataToUpdate);
    }
}


export async function deleteCliente(clienteId: string): Promise<void> {
    const batch = writeBatch(db);

    // 1. Delete the client document
    const clienteRef = doc(db, "mensuales_clientes", clienteId);
    batch.delete(clienteRef);

    // 2. Find and delete all associated movements
    const q = query(movimientosCollectionRef, where("clienteId", "==", clienteId));
    const snapshot = await getDocs(q);
    snapshot.forEach(doc => {
        batch.delete(doc.ref);
    });

    // 3. Commit the batch
    await batch.commit();
}


export async function addPaymentToCliente(clienteId: string, paymentAmount: number): Promise<void> {
    const clienteRef = doc(db, "mensuales_clientes", clienteId);
    
    // Step 1: Ensure all pending interests are charged before processing the payment
    const initialClienteData = await getClienteById(clienteId);
    if (!initialClienteData) {
        throw new Error("El cliente no existe.");
    }
    
    await runTransaction(db, async (transaction) => {
        // We get the document again inside the transaction to ensure atomicity
        const clienteDoc = await transaction.get(clienteRef);
        if (!clienteDoc.exists()) {
             throw new Error("El cliente no existe (fallo en transacción).");
        }
        
        let clienteData = clienteDoc.data() as ClienteMensual;
        
        // This is the total interest that must be covered before anything goes to capital
        const totalInterestToCover = clienteData.unpaidInterest || 0;

        let remainingPayment = paymentAmount;
        let interestPaid = 0;
        let capitalPaid = 0;

        // Step 2: Cover total interest first.
        if (totalInterestToCover > 0) {
            interestPaid = Math.min(remainingPayment, totalInterestToCover);
            remainingPayment -= interestPaid;
        }

        // Step 3: The rest goes to capital.
        if (remainingPayment > 0) {
            capitalPaid = Math.min(remainingPayment, clienteData.currentBalance);
        }

        const newUnpaidInterest = totalInterestToCover - interestPaid;
        const newCurrentBalance = clienteData.currentBalance - capitalPaid;
        
        // Step 4: Determine new status.
        const monthsOverdue = clienteData.interestRateValue > 0 ? newUnpaidInterest / ((clienteData.loanAmount * clienteData.interestRateValue)/100) : 0;
        const newStatus = newCurrentBalance <= 0 ? 'liquidado' : (monthsOverdue >= 3 ? 'vencido' : 'vigente');

        const updates: Partial<ClienteMensual> = {
            currentBalance: newCurrentBalance,
            unpaidInterest: newUnpaidInterest,
            status: newStatus,
            lastPaymentDate: new Date(),
        };
        
        if (newCurrentBalance <= 0) {
            updates.currentBalance = 0;
            updates.unpaidInterest = 0; // Clear any tiny remaining interest if loan is paid off
        }

        transaction.update(clienteRef, updates);
        
        // Step 5: Create movement records.
        if (interestPaid > 0) {
            const interestMovRef = doc(movimientosCollectionRef);
            transaction.set(interestMovRef, {
                clienteId,
                date: new Date(),
                type: 'pago_interes',
                amount: interestPaid,
                notes: `Parte de un abono total de $${paymentAmount.toLocaleString('es-MX')}`
            });
        }
        if (capitalPaid > 0) {
            const capitalMovRef = doc(movimientosCollectionRef);
            transaction.set(capitalMovRef, {
                clienteId,
                date: new Date(),
                type: 'pago_capital',
                amount: capitalPaid,
                notes: `Parte de un abono total de $${paymentAmount.toLocaleString('es-MX')}`
            });
        }
    });
}


export async function getMovimientosByCliente(clienteId: string): Promise<MovimientoMensual[]> {
    const q = query(movimientosCollectionRef, where("clienteId", "==", clienteId), orderBy("date", "desc"));
    const snapshot = await getDocs(q);
    const movimientos = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
            ...data, 
            id: doc.id,
            date: data.date.toDate(),
        }
    }) as MovimientoMensual[];
    return movimientos;
}


// --- Bulk Import ---
export async function importMensualesData(jsonData: string, prefix: string): Promise<void> {
    const data = JSON.parse(jsonData);

    // Pre-fetch existing oficinas, rates, and displayIds once to avoid N+1 queries inside the loop
    const oficinasQuery = query(oficinasCollectionRef, where("prefix", "==", prefix));
    const ratesQuery = query(interestRatesCollectionRef, where("prefix", "==", prefix));
    const existingClientesQuery = query(clientesCollectionRef, where("prefix", "==", prefix));
    
    const [oficinasSnapshot, ratesSnapshot, existingClientesSnapshot] = await Promise.all([
        getDocs(oficinasQuery),
        getDocs(ratesQuery),
        getDocs(existingClientesQuery),
    ]);

    const oficinaMap = new Map<string, string>();
    oficinasSnapshot.forEach(doc => oficinaMap.set(doc.data().name.toUpperCase(), doc.id));

    const rateMap = new Map<number, string>();
    ratesSnapshot.forEach(doc => rateMap.set(doc.data().value, doc.id));

    const usedDisplayIds = new Set<string>();
    existingClientesSnapshot.forEach(doc => {
        const dId = doc.data().displayId;
        if (dId) usedDisplayIds.add(String(dId));
    });

    const nextDisplayId = () => {
        let candidate = '';
        do {
            candidate = Math.floor(1000 + Math.random() * 9000).toString();
        } while (usedDisplayIds.has(candidate));
        usedDisplayIds.add(candidate);
        return candidate;
    };

    let batch = writeBatch(db);
    let opCount = 0;
    const commitIfNeeded = async () => {
        if (opCount >= 400) {
            await batch.commit();
            batch = writeBatch(db);
            opCount = 0;
        }
    };
    
    for (const row of data) {
        const oficinaName = String(row.OFICINA || '').trim().toUpperCase();
        const clienteName = String(row.CLIENTE || '').trim().toUpperCase();
        const loanAmount = parseFloat(String(row['MONTO PRESTAMO'] || '0').replace(/[^0-9.-]+/g,""));
        const interestRateValue = parseFloat(String(row['TASA INTERES (%)'] || '0').replace(/[^0-9.-]+/g,""));
        const paymentDay = parseInt(String(row['DIA PAGO'] || '1'), 10);

        if (!oficinaName || !clienteName || !loanAmount || !interestRateValue) {
            console.warn("Skipping row due to missing data:", row);
            continue;
        }
        
        let oficinaId = oficinaMap.get(oficinaName);
        if (!oficinaId) {
            const newOficinaRef = doc(oficinasCollectionRef);
            oficinaId = newOficinaRef.id;
            batch.set(newOficinaRef, { name: oficinaName, prefix });
            opCount++;
            oficinaMap.set(oficinaName, oficinaId);
        }
        
        let rateId = rateMap.get(interestRateValue);
        if (!rateId) {
            const newRateRef = doc(interestRatesCollectionRef);
            rateId = newRateRef.id;
            batch.set(newRateRef, { value: interestRateValue, prefix });
            opCount++;
            rateMap.set(interestRateValue, rateId);
        }
        
        const displayId = nextDisplayId();

        const newCliente: Omit<ClienteMensual, 'id'> = {
            displayId,
            prefix,
            oficinaId,
            name: clienteName,
            loanAmount,
            paymentDay: isNaN(paymentDay) ? 1 : paymentDay,
            interestRateId: rateId,
            interestRateValue,
            currentBalance: loanAmount,
            unpaidInterest: 0,
            status: 'vigente',
            registrationDate: new Date(),
        };
        
        const newClienteRef = doc(clientesCollectionRef);
        batch.set(newClienteRef, newCliente);
        opCount++;
        
        const initialMovement: Omit<MovimientoMensual, 'id' | 'clienteId'> = {
            date: new Date(),
            type: 'initial_loan',
            amount: loanAmount,
            notes: 'Préstamo inicial importado desde Excel'
        };
        const newMovimientoRef = doc(movimientosCollectionRef);
        batch.set(newMovimientoRef, { ...initialMovement, clienteId: newClienteRef.id });
        opCount++;

        await commitIfNeeded();
    }
    
    if (opCount > 0) {
        await batch.commit();
    }
}


// DANGER ZONE FUNCTIONS
export async function deleteAllMensualesData(prefix: string, type: 'clientes' | 'oficinas' | 'interes'): Promise<void> {
    const refsToDelete: any[] = [];

    if (type === 'clientes' || type === 'oficinas') {
        const clientesSnapshot = await getDocs(query(clientesCollectionRef, where("prefix", "==", prefix)));
        const movimientosSnapshots = await Promise.all(
            clientesSnapshot.docs.map(c => getDocs(query(movimientosCollectionRef, where("clienteId", "==", c.id))))
        );
        clientesSnapshot.docs.forEach(d => refsToDelete.push(d.ref));
        movimientosSnapshots.forEach(snap => snap.docs.forEach(d => refsToDelete.push(d.ref)));
    }

    if (type === 'oficinas') {
        const oficinasSnapshot = await getDocs(query(oficinasCollectionRef, where("prefix", "==", prefix)));
        oficinasSnapshot.docs.forEach(d => refsToDelete.push(d.ref));
    }

    if (type === 'interes') {
        const ratesSnapshot = await getDocs(query(interestRatesCollectionRef, where("prefix", "==", prefix)));
        ratesSnapshot.docs.forEach(d => refsToDelete.push(d.ref));
    }

    for (let i = 0; i < refsToDelete.length; i += 400) {
        const batch = writeBatch(db);
        refsToDelete.slice(i, i + 400).forEach(ref => batch.delete(ref));
        await batch.commit();
    }
}

