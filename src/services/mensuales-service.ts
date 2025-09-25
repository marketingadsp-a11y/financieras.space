
'use server';

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { OficinaMensual, ClienteMensual } from "@/lib/data";

const oficinasCollectionRef = collection(db, "mensuales_oficinas");
const clientesCollectionRef = collection(db, "mensuales_clientes");

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
