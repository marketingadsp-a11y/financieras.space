
'use server';

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { CompanyProfile } from "@/lib/data";

const companyProfilesCollection = "companyProfiles";

// The document ID for a company profile is its prefix
export async function getCompanyProfileByPrefix(prefix: string): Promise<CompanyProfile | null> {
    const docRef = doc(db, companyProfilesCollection, prefix);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as CompanyProfile;
    }
    return null;
}

export async function saveCompanyProfile(prefix: string, profileData: Omit<CompanyProfile, 'id'>): Promise<void> {
    const docRef = doc(db, companyProfilesCollection, prefix);
    await setDoc(docRef, profileData, { merge: true });
}
