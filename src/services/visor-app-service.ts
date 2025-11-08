

'use server';

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, writeBatch, getDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { VisorSupervisor, VisorClient, VisorVisit } from "@/lib/data";
import { v4 as uuidv4 } from 'uuid';

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

export async function addClient(data: Omit<VisorClient, 'id' | 'qrCodeValue'>): Promise<VisorClient> {
    const qrCodeValue = uuidv4();
    const clientData = { ...data, qrCodeValue };
    const docRef = await addDoc(clientsCollectionRef, clientData);
    return { ...clientData, id: docRef.id };
}

export async function deleteClient(id: string) {
    const clientDoc = doc(db, "visor_clients", id);
    await deleteDoc(clientDoc);
}


// --- Visit Functions ---

export async function getVisitsBySupervisorForToday(supervisorId: string): Promise<VisorVisit[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1); // Start of tomorrow

  const q = query(
    visitsCollectionRef,
    where("supervisorId", "==", supervisorId),
    where("timestamp", ">=", today),
    where("timestamp", "<", tomorrow)
  );
  
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ 
        ...doc.data(), 
        id: doc.id,
        timestamp: (doc.data().timestamp as Timestamp).toDate(),
      })) as VisorVisit[];
  } catch (error) {
      // This can happen if the collection doesn't exist yet.
      // Instead of throwing an error and breaking the UI, we return an empty array.
      console.warn("Could not fetch visits, collection might not exist yet. Returning empty array.", error);
      return [];
  }
}
