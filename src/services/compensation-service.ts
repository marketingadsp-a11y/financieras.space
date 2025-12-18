
'use server';

import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { CompensationConfig } from "@/lib/data";

const compensationCollectionRef = "compensations";

const defaultConfig: CompensationConfig = {
    baseSalary: 4000,
    baseBonus: 3000,
    bonuses: [],
    executives: [],
};

// Converts Firestore Timestamps to JS Dates for executives
const configFromDoc = (data: any): CompensationConfig => {
    const executives = (data.executives || []).map((exec: any) => ({
        ...exec,
        fechaIngreso: exec.fechaIngreso?.toDate ? exec.fechaIngreso.toDate() : new Date(),
    }));
    return { ...data, executives };
};

// Converts JS Dates to Firestore Timestamps for executives before saving
const configToDoc = (config: Partial<CompensationConfig>): Partial<CompensationConfig> => {
    if (config.executives) {
        const executivesWithTimestamp = config.executives.map(exec => ({
            ...exec,
            fechaIngreso: Timestamp.fromDate(new Date(exec.fechaIngreso)),
        }));
        return { ...config, executives: executivesWithTimestamp };
    }
    return config;
};

export async function getCompensationConfig(prefix: string): Promise<CompensationConfig> {
    if (!prefix) return defaultConfig;
    const docRef = doc(db, compensationCollectionRef, prefix);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return configFromDoc(docSnap.data());
    } else {
        // If no config exists, create one with default values
        await setDoc(docRef, defaultConfig);
        return defaultConfig;
    }
}

export async function saveCompensationConfig(prefix: string, config: Partial<CompensationConfig>): Promise<void> {
    const docRef = doc(db, compensationCollectionRef, prefix);
    const dataToSave = configToDoc(config);
    await setDoc(docRef, dataToSave, { merge: true });
}
