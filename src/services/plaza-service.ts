
'use server';

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Plaza, Customer } from "@/lib/data";

const plazasCollectionRef = collection(db, "plazas");
const customersCollectionRef = collection(db, "customers");

export async function getPlazas(prefix?: string): Promise<Plaza[]> {
    let q = query(plazasCollectionRef);
    if (prefix) {
        q = query(plazasCollectionRef, where("prefix", "==", prefix));
    }
    
    const plazasSnapshot = await getDocs(q);
    const customersSnapshot = await getDocs(customersCollectionRef);
    const allCustomers = customersSnapshot.docs.map(doc => doc.data() as Customer);

    const plazas = plazasSnapshot.docs.map(doc => {
        const plazaData = doc.data() as Omit<Plaza, 'id'>;
        const plazaId = doc.id;
        
        const customersInPlaza = allCustomers.filter(c => c.plazaId === plazaId);
        
        const pendingDebt = customersInPlaza.reduce((acc, customer) => acc + (customer.dueAmount || 0), 0);
        
        const totalLoanAmount = customersInPlaza.reduce((acc, customer) => acc + (customer.loanAmount || 0), 0);
        const totalPaidAmount = totalLoanAmount - pendingDebt;
        const recoveryRate = totalLoanAmount > 0 ? (totalPaidAmount / totalLoanAmount) * 100 : 0;

        return {
            id: plazaId,
            name: plazaData.name,
            pendingDebt,
            recoveryRate,
            prefix: plazaData.prefix,
        };
    });

    return plazas;
}

export async function getPlazaById(id: string): Promise<Plaza | null> {
    const plazaDocRef = doc(db, "plazas", id);
    const plazaDoc = await getDoc(plazaDocRef);

    if (plazaDoc.exists()) {
        const plazaData = plazaDoc.data() as Omit<Plaza, 'id'>;
        return { 
            id: plazaDoc.id, 
            ...plazaData,
            pendingDebt: plazaData.pendingDebt || 0,
            recoveryRate: plazaData.recoveryRate || 0
        };
    } else {
        return null;
    }
}


export async function addPlaza(plaza: Omit<Plaza, 'id' | 'pendingDebt' | 'recoveryRate'>) : Promise<Plaza> {
    const dataToSave = {
        name: plaza.name,
        pendingDebt: 0,
        recoveryRate: 0,
        prefix: plaza.prefix || "",
    }
    const docRef = await addDoc(plazasCollectionRef, dataToSave);
    return { ...dataToSave, id: docRef.id };
}

export async function updatePlaza(id: string, plaza: Partial<Omit<Plaza, 'id'>>) {
    const plazaDoc = doc(db, "plazas", id);
    await updateDoc(plazaDoc, plaza);
}

export async function deletePlaza(id: string) {
    const plazaDoc = doc(db, "plazas", id);
    // Also delete customers associated with the plaza
    const q = query(customersCollectionRef, where("plazaId", "==", id));
    const customerDocs = await getDocs(q);
    const batch = db.batch();
    customerDocs.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    await deleteDoc(plazaDoc);
}
