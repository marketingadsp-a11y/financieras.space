
'use server';

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type SupportInfo = {
  title: string;
  content: string;
}

export type ToolSetting = {
  id: string;
  name: string;
  color: string;
}

export type PwaSettings = {
    shortName?: string;
    iconUrl?: string;
}

export type AppSettings = {
  supportInfo?: SupportInfo;
  toolSettings?: ToolSetting[];
  pwaSettings?: PwaSettings;
}

const SETTINGS_DOC_ID = "--app-settings--";
const settingsDocRef = doc(db, "settings", SETTINGS_DOC_ID);

export async function getAppSettings(): Promise<AppSettings | null> {
    try {
        const docSnap = await getDoc(settingsDocRef);
        if (docSnap.exists()) {
            return docSnap.data() as AppSettings;
        }
        return null;
    } catch (error) {
        console.error("Error getting app settings: ", error);
        // Avoid crashing the app if firestore is not available, return null
        return null;
    }
}

export async function saveAppSettings(settingsData: Partial<AppSettings>): Promise<void> {
    await setDoc(settingsDocRef, settingsData, { merge: true });
}
