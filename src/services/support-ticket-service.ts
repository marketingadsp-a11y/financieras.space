
'use server';

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { SupportTicket } from "@/lib/data";

const ticketsCollectionRef = collection(db, "supportTickets");

export async function addSupportTicket(ticketData: Omit<SupportTicket, 'id' | 'status' | 'createdAt'>): Promise<SupportTicket> {
    const dataToAdd = {
        ...ticketData,
        status: 'new' as const,
        createdAt: Date.now(),
    };
    const docRef = await addDoc(ticketsCollectionRef, dataToAdd);
    return { ...dataToAdd, id: docRef.id };
}

export async function getSupportTickets(): Promise<SupportTicket[]> {
    const q = query(ticketsCollectionRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as SupportTicket[];
}

export async function updateSupportTicketStatus(ticketId: string, status: SupportTicket['status']): Promise<void> {
    const ticketDoc = doc(db, "supportTickets", ticketId);
    await updateDoc(ticketDoc, { status });
}

export async function deleteSupportTicket(ticketId: string): Promise<void> {
    const ticketDoc = doc(db, "supportTickets", ticketId);
    await deleteDoc(ticketDoc);
}
