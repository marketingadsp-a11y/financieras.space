

'use server';

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, writeBatch, getDoc, Timestamp, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { VisorSupervisor, VisorClient, VisorVisit } from "@/lib/data";
import { v4 as uuidv4 } from 'uuid';
import { startOfWeek, endOfWeek } from 'date-fns';

const supervisorsCollectionRef = collection(db, "visor_supervisors");
const clientsCollectionRef = collection(db, "visor_clients");
const visitsCollectionRef = collection(db, "visor_visits");

// --- Supervisor Functions ---

export async function getSupervisors(prefix: string): Promise<VisorSupervisor[]> {
    const q = query(supervisorsCollectionRef, where("prefix", "==", prefix));
    const snapshot = await getDocs(q);
    const supervisors = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as VisorSupervisor[];
    return supervisors.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getSupervisorById(id: string): Promise<VisorSupervisor | null> {
    const docRef = doc(db, "visor_supervisors", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as VisorSupervisor;
    }
    return null;
}

export async function getSupervisorByAccessCode(accessCode: string): Promise<VisorSupervisor | null> {
    const q = query(supervisorsCollectionRef, where("accessCode", "==", accessCode));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        return null;
    }
    const supervisorDoc = snapshot.docs[0];
    return { id: supervisorDoc.id, ...supervisorDoc.data() } as VisorSupervisor;
}


export async function addSupervisor(data: Omit<VisorSupervisor, 'id'>): Promise<VisorSupervisor> {
    const docRef = await addDoc(supervisorsCollectionRef, data);
    return { ...data, id: docRef.id };
}

export async function updateSupervisor(id: string, data: Partial<Omit<VisorSupervisor, 'id'>>) {
    const supervisorDoc = doc(db, "visor_supervisors", id);
    await updateDoc(supervisorDoc, data);
}

export async function deleteSupervisor(id: string) {
    const batch = writeBatch(db);
    const supervisorDoc = doc(db, "visor_supervisors", id);
    batch.delete(supervisorDoc);

    const clientsQuery = query(clientsCollectionRef, where("supervisorId", "==", id));
    const clientsSnapshot = await getDocs(clientsQuery);
    clientsSnapshot.forEach(doc => batch.delete(doc.ref));

    await batch.commit();
}


// --- Client Functions ---

export async function getClientsBySupervisor(supervisorId: string): Promise<VisorClient[]> {
    const q = query(clientsCollectionRef, where("supervisorId", "==", supervisorId));
    const snapshot = await getDocs(q);
    const clients = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as VisorClient[];
    return clients.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getClientByQrCodeValue(qrCodeValue: string): Promise<VisorClient | null> {
    const q = query(clientsCollectionRef, where("qrCodeValue", "==", qrCodeValue));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        return null;
    }
    const clientDoc = snapshot.docs[0];
    return { id: clientDoc.id, ...clientDoc.data() } as VisorClient;
}


export async function addClient(data: Omit<VisorClient, 'id' | 'qrCodeValue'> & { qrCodeValue?: string }): Promise<VisorClient> {
    const qrCodeValue = data.qrCodeValue || uuidv4();
    const clientData = { ...data, qrCodeValue };
    const docRef = await addDoc(clientsCollectionRef, clientData);
    return { ...clientData, id: docRef.id };
}

export async function updateClient(id: string, data: Partial<Omit<VisorClient, 'id' | 'prefix' | 'supervisorId'>>) {
    const clientDoc = doc(db, "visor_clients", id);
    await updateDoc(clientDoc, data);
}

export async function deleteClient(id: string) {
    const clientDoc = doc(db, "visor_clients", id);
    await deleteDoc(clientDoc);
}


// --- Visit Functions ---

export async function addVisit(visitData: Omit<VisorVisit, 'id'>): Promise<VisorVisit> {
    const docRef = await addDoc(visitsCollectionRef, visitData);
    return { ...visitData, id: docRef.id };
}

export function getVisitsBySupervisorForWeek(supervisorId: string, callback: (visits: VisorVisit[]) => void): () => void {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 0 }); // Sunday
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 }); // Saturday

  const q = query(
    visitsCollectionRef,
    where("supervisorId", "==", supervisorId),
    where("timestamp", ">=", weekStart),
    where("timestamp", "<=", weekEnd)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const visits = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      timestamp: (doc.data().timestamp as Timestamp).toDate(),
    })) as VisorVisit[];
    callback(visits);
  }, (error) => {
    console.error("Error fetching visits in real-time: ", error);
    // If collection doesn't exist, it will error. We can handle it gracefully.
    callback([]);
  });

  return unsubscribe; // Return the unsubscribe function for cleanup
}
