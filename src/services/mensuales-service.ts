

'use server';

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, writeBatch, runTransaction, Timestamp, getDoc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { OficinaMensual, ClienteMensual, MovimientoMensual, InterestRate } from "@/lib/data";

const oficinasCollectionRef = collection(db, "mensuales_oficinas");
const clientesCollectionRef = collection(db, "mensuales_clientes");
const movimientosCollectionRef = collection(db, "mensuales_movimientos");
const interestRatesCollectionRef = collection(db, "mensuales_interestRates");


// This function will automatically charge interest if a payment cycle has passed.
async function chargeInterestIfNeeded(cliente: ClienteMensual, transaction?: FirebaseFirestore.Transaction): Promise<ClienteMensual> {
    if (cliente.status === 'liquidado' || !cliente.registrationDate) {
        return cliente;
    }

    const clienteRef = doc(db, 'mensuales_clientes', cliente.id);
    let updatedClienteData = { ...cliente };
    
    // Determine the last charge date, defaulting to registration date
    const lastChargeDate = cliente.lastInterestChargedDate || cliente.registrationDate;

    // Use a function that can work with or without a transaction
    const updateFn = transaction ? transaction.update.bind(transaction) : updateDoc;

    const now = new Date();
    let chargeDateCursor = new Date(lastChargeDate);
    let interestToCharge = 0;
    let newMovements: Omit<MovimientoMensual, 'id' | 'clienteId'>[] = [];
    let newLastChargedDate = lastChargeDate;

    // Loop through months between last charge and now
    while(chargeDateCursor < now) {
        const nextChargeCutoff = new Date(chargeDateCursor.getFullYear(), chargeDateCursor.getMonth(), cliente.paymentDay + 1);

        if (now >= nextChargeCutoff && lastChargeDate < nextChargeCutoff) {
            interestToCharge += cliente.monthlyInterestCharge;
            newLastChargedDate = new Date(chargeDateCursor.getFullYear(), chargeDateCursor.getMonth() + 1, cliente.paymentDay);
            
            newMovements.push({
                date: newLastChargedDate,
                type: 'charge_interest',
                amount: cliente.monthlyInterestCharge,
                notes: `Cargo de interés mensual`
            });
            chargeDateCursor = new Date(chargeDateCursor.getFullYear(), chargeDateCursor.getMonth() + 1, 1);
        } else {
            break;
        }
    }
    
    if (interestToCharge > 0) {
        const newUnpaidInterest = (updatedClienteData.unpaidInterest || 0) + interestToCharge;
        const monthsOverdue = cliente.monthlyInterestCharge > 0 ? newUnpaidInterest / cliente.monthlyInterestCharge : 0;
        
        const newStatus = monthsOverdue >= 3 ? 'vencido' : 'vigente';

        const updates: Partial<ClienteMensual> = {
            unpaidInterest: newUnpaidInterest,
            lastInterestChargedDate: newLastChargedDate,
            status: newStatus,
        };

        if(transaction) {
            transaction.update(clienteRef, updates);
            newMovements.forEach(movement => {
                const movRef = doc(movimientosCollectionRef);
                transaction.set(movRef, { ...movement, clienteId: cliente.id });
            });
        } else {
            // If not in a transaction, perform writes directly
            await updateDoc(clienteRef, updates);
            const batch = writeBatch(db);
            newMovements.forEach(movement => {
                const movRef = doc(movimientosCollectionRef);
                batch.set(movRef, { ...movement, clienteId: cliente.id });
            });
            await batch.commit();
        }

        // Update the local object to reflect changes immediately
        updatedClienteData.unpaidInterest = newUnpaidInterest;
        updatedClienteData.lastInterestChargedDate = newLastChargedDate;
        updatedClienteData.status = newStatus;
    }

    // Return the potentially updated client data
    return updatedClienteData;
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
    
    const clientesPromises = snapshot.docs.map(async doc => {
        const data = doc.data();
        const cliente = {
            id: doc.id,
            displayId: data.displayId || "0000",
            name: data.name || "",
            prefix: data.prefix || "",
            oficinaId: data.oficinaId || "", // Ensure oficinaId is a string
            loanAmount: data.loanAmount || 0,
            paymentDay: data.paymentDay || 1,
            interestRateId: data.interestRateId || "",
            interestRateValue: data.interestRateValue || 0,
            monthlyInterestCharge: data.monthlyInterestCharge || 0,
            currentBalance: data.currentBalance || 0,
            unpaidInterest: data.unpaidInterest || 0,
            registrationDate: data.registrationDate?.toDate(),
            status: data.status || 'vigente',
            lastInterestChargedDate: data.lastInterestChargedDate?.toDate(),
            lastPaymentDate: data.lastPaymentDate?.toDate(),
        } as ClienteMensual;
        return chargeInterestIfNeeded(cliente);
    });
    
    const clientes = await Promise.all(clientesPromises);

    return clientes.sort((a, b) => a.name.localeCompare(b.name));
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
            monthlyInterestCharge: data.monthlyInterestCharge || 0,
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
            monthlyInterestCharge: data.monthlyInterestCharge || 0,
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
            const interestMovementsSnapshot = await getDocs(q); 
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

    await runTransaction(db, async (transaction) => {
        // Run interest charge logic first to ensure unpaidInterest is up-to-date
        const upToDateClienteData = await getClienteById(clienteId);
        if (!upToDateClienteData) {
            throw new Error("El cliente no existe.");
        }

        const clienteDoc = await transaction.get(clienteRef);
        if (!clienteDoc.exists()) {
             throw new Error("El cliente no existe (fallo en transacción).");
        }
        
        let clienteData = clienteDoc.data() as ClienteMensual;
        
        const totalInterestToCover = (upToDateClienteData.unpaidInterest || 0) + upToDateClienteData.monthlyInterestCharge;

        let remainingPayment = paymentAmount;
        let interestPaid = 0;
        let capitalPaid = 0;

        // 1. Cover total interest first
        if (totalInterestToCover > 0) {
            interestPaid = Math.min(remainingPayment, totalInterestToCover);
            remainingPayment -= interestPaid;
        }

        // 2. The rest goes to capital
        if (remainingPayment > 0) {
            capitalPaid = Math.min(remainingPayment, clienteData.currentBalance);
        }

        const newUnpaidInterest = totalInterestToCover - interestPaid;
        const newCurrentBalance = clienteData.currentBalance - capitalPaid;
        
        // 3. Determine new status
        const monthsOverdue = clienteData.monthlyInterestCharge > 0 ? newUnpaidInterest / clienteData.monthlyInterestCharge : 0;
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
        
        // 4. Create movement records
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
    const batch = writeBatch(db);

    // Pre-fetch existing oficinas and rates to avoid duplicates
    const oficinasQuery = query(oficinasCollectionRef, where("prefix", "==", prefix));
    const ratesQuery = query(interestRatesCollectionRef, where("prefix", "==", prefix));
    
    const [oficinasSnapshot, ratesSnapshot] = await Promise.all([
        getDocs(oficinasQuery),
        getDocs(ratesQuery),
    ]);

    const oficinaMap = new Map<string, string>();
    oficinasSnapshot.forEach(doc => oficinaMap.set(doc.data().name.toUpperCase(), doc.id));

    const rateMap = new Map<number, string>();
    ratesSnapshot.forEach(doc => rateMap.set(doc.data().value, doc.id));
    
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
            oficinaMap.set(oficinaName, oficinaId);
        }
        
        let rateId = rateMap.get(interestRateValue);
        if (!rateId) {
            const newRateRef = doc(interestRatesCollectionRef);
            rateId = newRateRef.id;
            batch.set(newRateRef, { value: interestRateValue, prefix });
            rateMap.set(interestRateValue, rateId);
        }
        
        const displayId = await generateUniqueDisplayId(prefix);
        const monthlyInterestCharge = (loanAmount * interestRateValue) / 100;

        const newCliente: Omit<ClienteMensual, 'id'> = {
            displayId,
            prefix,
            oficinaId,
            name: clienteName,
            loanAmount,
            paymentDay: isNaN(paymentDay) ? 1 : paymentDay,
            interestRateId: rateId,
            interestRateValue,
            monthlyInterestCharge,
            currentBalance: loanAmount,
            unpaidInterest: 0,
            status: 'vigente',
            registrationDate: new Date(),
        };
        
        const newClienteRef = doc(clientesCollectionRef);
        batch.set(newClienteRef, newCliente);
        
        const initialMovement: Omit<MovimientoMensual, 'id' | 'clienteId'> = {
            date: new Date(),
            type: 'initial_loan',
            amount: loanAmount,
            notes: 'Préstamo inicial importado desde Excel'
        };
        const newMovimientoRef = doc(movimientosCollectionRef);
        batch.set(newMovimientoRef, { ...initialMovement, clienteId: newClienteRef.id });
    }
    
    await batch.commit();
}
