
'use server';

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { InterestRate } from "@/lib/data";

const interestRatesCollectionRef = collection(db, "mensuales_interestRates");

export async function getInterestRates(prefix: string): Promise<InterestRate[]> {
    const q = query(interestRatesCollectionRef, where("prefix", "==", prefix));
    const snapshot = await getDocs(q);
    const rates = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as InterestRate[];
    return rates.sort((a, b) => a.value - b.value);
}

export async function addInterestRate(rate: Omit<InterestRate, 'id'>): Promise<InterestRate> {
    const docRef = await addDoc(interestRatesCollectionRef, rate);
    return { ...rate, id: docRef.id };
}

export async function updateInterestRate(id: string, rate: Partial<Omit<InterestRate, 'id'>>) {
    const rateDoc = doc(db, "mensuales_interestRates", id);
    await updateDoc(rateDoc, rate);
}

export async function deleteInterestRate(id: string) {
    const rateDoc = doc(db, "mensuales_interestRates", id);
    await deleteDoc(rateDoc);
}
