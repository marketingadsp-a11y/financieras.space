
'use server';

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, writeBatch, runTransaction, Timestamp, getDoc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { OficinaMensual, ClienteMensual, MovimientoMensual } from "@/lib/data";

const oficinasCollectionRef = collection(db, "mensuales_oficinas");
const clientesCollectionRef = collection(db, "mensuales_clientes");
const movimientosCollectionRef = collection(db, "mensuales_movimientos");

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
    const clientes = snapshot.docs.map(doc => {
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
            status: data.status || 'vigente',
            lastInterestChargedDate: data.lastInterestChargedDate?.toDate(),
            lastPaymentDate: data.lastPaymentDate?.toDate(),
        }
    }) as ClienteMensual[];
    return clientes.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getClienteById(id: string): Promise<ClienteMensual | null> {
    const clienteRef = doc(db, "mensuales_clientes", id);
    const clienteSnap = await getDoc(clienteRef);

    if (clienteSnap.exists()) {
        const data = clienteSnap.data();
        // This is a safe conversion, ensuring all fields are checked and have defaults.
        return {
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
            status: data.status || 'vigente',
            lastInterestChargedDate: data.lastInterestChargedDate?.toDate(),
            lastPaymentDate: data.lastPaymentDate?.toDate(),
        } as ClienteMensual;
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
    
    const clienteWithDisplayId = { ...cliente, displayId };

    const clienteDocRef = doc(collection(db, "mensuales_clientes"));
    const movimientoDocRef = doc(collection(db, "mensuales_movimientos"));
    
    await runTransaction(db, async (transaction) => {
        transaction.set(clienteDocRef, { ...clienteWithDisplayId, id: clienteDocRef.id });
        transaction.set(movimientoDocRef, { ...initialMovement, clienteId: clienteDocRef.id });
    });
    
    return { ...clienteWithDisplayId, id: clienteDocRef.id };
}


export async function addPaymentToCliente(clienteId: string, paymentAmount: number): Promise<void> {
    const clienteRef = doc(db, "mensuales_clientes", clienteId);

    await runTransaction(db, async (transaction) => {
        const clienteDoc = await transaction.get(clienteRef);
        if (!clienteDoc.exists()) {
            throw new Error("El cliente no existe.");
        }

        const clienteData = clienteDoc.data() as ClienteMensual;
        let currentBalance = clienteData.currentBalance;
        let interestToPay = clienteData.monthlyInterestCharge;
        let capitalPayment = 0;
        let interestPayment = 0;

        const now = new Date();
        const lastChargeDate = clienteData.lastInterestChargedDate instanceof Timestamp
            ? clienteData.lastInterestChargedDate.toDate()
            : clienteData.lastInterestChargedDate;

        // Check if interest for the current month has already been charged.
        if (!lastChargeDate || (lastChargeDate.getMonth() !== now.getMonth() || lastChargeDate.getFullYear() !== now.getFullYear())) {
            // Log the interest charge movement
            const interestChargeMovement: Omit<MovimientoMensual, 'id'> = {
                clienteId,
                date: now,
                type: 'charge_interest',
                amount: interestToPay,
                notes: 'Cargo de interés mensual automático'
            };
            transaction.set(doc(movimientosCollectionRef), interestChargeMovement);
            transaction.update(clienteRef, { lastInterestChargedDate: now });
        }
        
        let remainingPayment = paymentAmount;
        
        // 1. Pay the interest first
        interestPayment = Math.min(remainingPayment, interestToPay);
        remainingPayment -= interestPayment;
        
        if (interestPayment > 0) {
            const interestPaymentMovement: Omit<MovimientoMensual, 'id'> = {
                clienteId,
                date: now,
                type: 'pay_interest',
                amount: interestPayment,
            };
            transaction.set(doc(movimientosCollectionRef), interestPaymentMovement);
        }

        // 2. Any remaining amount goes to capital
        capitalPayment = remainingPayment;
        if (capitalPayment > 0) {
             currentBalance -= capitalPayment;
             const capitalPaymentMovement: Omit<MovimientoMensual, 'id'> = {
                clienteId,
                date: now,
                type: 'pay_capital',
                amount: capitalPayment,
            };
            transaction.set(doc(movimientosCollectionRef), capitalPaymentMovement);
        }

        const updates: Partial<ClienteMensual> = {
            currentBalance: currentBalance,
            lastPaymentDate: now,
            status: currentBalance <= 0 ? 'liquidado' : 'vigente',
        };
        
        if (currentBalance <= 0) {
            updates.currentBalance = 0;
        }

        transaction.update(clienteRef, updates);
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
