
'use server';

import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from '@/lib/firebase';

const storage = getStorage(app);

/**
 * Uploads a file to Firebase Storage.
 * @param file The file to upload.
 * @param path The path where the file will be stored in the bucket (e.g., 'pwa-icons/').
 * @returns The public URL of the uploaded file.
 */
export async function uploadFile(file: File, path: string): Promise<string> {
    try {
        const storageRef = ref(storage, `${path}/${file.name}`);
        
        const snapshot = await uploadBytes(storageRef, file, {
            contentType: file.type,
        });

        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;

    } catch (error: any) {
        console.error("Error uploading file: ", error);
        throw new Error("No se pudo subir el archivo. Error: " + error.message);
    }
}
