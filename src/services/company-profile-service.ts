
'use server';

import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { CompanyProfile } from "@/lib/data";

const companyProfilesCollectionRef = collection(db, "companyProfiles");

// Get all company profiles, for SuperAdmin view
export async function getAllCompanyProfiles(): Promise<CompanyProfile[]> {
    const snapshot = await getDocs(companyProfilesCollectionRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CompanyProfile));
}

// The document ID for a company profile is its prefix
export async function getCompanyProfileByPrefix(prefix: string): Promise<CompanyProfile | null> {
    const docRef = doc(db, "companyProfiles", prefix);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as CompanyProfile;
    }
    return null;
}

export async function saveCompanyProfile(prefix: string, profileData: Omit<CompanyProfile, 'id'>): Promise<void> {
    const docRef = doc(db, "companyProfiles", prefix);
    await setDoc(docRef, profileData, { merge: true });
}

export async function deleteCompanyProfile(prefix: string): Promise<void> {
    const docRef = doc(db, "companyProfiles", prefix);
    await deleteDoc(docRef);
}

    
