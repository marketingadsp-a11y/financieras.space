
'use server';

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, writeBatch, runTransaction, Timestamp } from "firebase/firestore";
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
            ...data, 
            id: doc.id,
            lastInterestChargedDate: data.lastInterestChargedDate?.toDate(),
            lastPaymentDate: data.lastPaymentDate?.toDate(),
        }
    }) as ClienteMensual[];
    return clientes.sort((a, b) => a.name.localeCompare(b.name));
}

export async function addCliente(cliente: Omit<ClienteMensual, 'id'>): Promise<ClienteMensual> {
    const docRef = await addDoc(clientesCollectionRef, cliente);
    return { ...cliente, id: docRef.id };
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
            // Add interest to the balance if it hasn't been charged this month.
            currentBalance += interestToPay;
            
            // Log the interest charge movement
            const interestChargeMovement: Omit<MovimientoMensual, 'id'> = {
                clienteId,
                date: now,
                type: 'charge_interest',
                amount: interestToPay,
                notes: 'Cargo de interés mensual automático'
            };
            transaction.set(doc(movimientosCollectionRef), interestChargeMovement);
            transaction.update(clienteRef, { lastInterestChargedDate: now, currentBalance });
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
                type: 'pay_principal',
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
