

'use server';

import { collection, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc, doc, query, where, Timestamp, runTransaction, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { EmpleadoVacaciones, VacationRule, VacationRequest } from "@/lib/data";
import { ai } from "@/ai/genkit";

const empleadosCollectionRef = collection(db, "vacaciones_empleados");
const vacationRulesCollectionRef = collection(db, "vacaciones_rules");
const vacationRequestsCollectionRef = collection(db, "vacaciones_requests");


// --- Empleado Functions ---
const fromDoc = (doc: any): EmpleadoVacaciones => {
    const data = doc.data();
    
    // Safely handle date conversion
    const fechaIngresoFromDb = data.fechaIngreso;
    let fechaIngresoDate: Date;
    if (fechaIngresoFromDb && typeof fechaIngresoFromDb.toDate === 'function') {
        fechaIngresoDate = fechaIngresoFromDb.toDate();
    } else if (fechaIngresoFromDb) {
        // Fallback for strings or other formats if needed
        fechaIngresoDate = new Date(fechaIngresoFromDb);
    } else {
        // Fallback if field is missing
        fechaIngresoDate = new Date();
    }

    const birthdayFromDb = data.birthday;
    let birthdayDate: Date | undefined;
    if (birthdayFromDb && typeof birthdayFromDb.toDate === 'function') {
        birthdayDate = birthdayFromDb.toDate();
    } else if (birthdayFromDb) {
        birthdayDate = new Date(birthdayFromDb);
    }

    return {
        id: doc.id,
        prefix: data.prefix,
        name: data.name,
        fechaIngreso: fechaIngresoDate,
        sueldoSemanal: data.sueldoSemanal,
        diasTomados: data.diasTomados || 0,
        birthday: birthdayDate,
    };
};

const toDoc = (empleado: Partial<Omit<EmpleadoVacaciones, 'id'>>) => {
    const data: any = { ...empleado };
    if (empleado.fechaIngreso) {
        data.fechaIngreso = Timestamp.fromDate(new Date(empleado.fechaIngreso));
    }
    if (empleado.birthday) {
        data.birthday = Timestamp.fromDate(new Date(empleado.birthday));
    }
    return data;
};

export async function getEmpleados(prefix: string): Promise<EmpleadoVacaciones[]> {
    const q = query(empleadosCollectionRef, where("prefix", "==", prefix));
    const snapshot = await getDocs(q);
    const empleados = snapshot.docs.map(fromDoc);
    return empleados.sort((a, b) => a.name.localeCompare(b.name));
}

export async function addEmpleado(empleado: Omit<EmpleadoVacaciones, 'id'>): Promise<EmpleadoVacaciones> {
    const docRef = await addDoc(empleadosCollectionRef, toDoc(empleado));
    return { ...empleado, id: docRef.id };
}

export async function updateEmpleado(id: string, empleado: Partial<Omit<EmpleadoVacaciones, 'id'>>) {
    const empleadoDoc = doc(db, "vacaciones_empleados", id);
    await updateDoc(empleadoDoc, toDoc(empleado));
}

export async function deleteEmpleado(id: string) {
    const empleadoDoc = doc(db, "vacaciones_empleados", id);
    await deleteDoc(empleadoDoc);
}


// --- Vacation Rule Functions ---
export async function getVacationRules(prefix: string): Promise<VacationRule[]> {
    const q = query(vacationRulesCollectionRef, where("prefix", "==", prefix));
    const snapshot = await getDocs(q);
    const rules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as VacationRule[];
    return rules.sort((a, b) => a.year - b.year);
}

export async function addVacationRule(rule: Omit<VacationRule, 'id'>): Promise<VacationRule> {
    const docRef = await addDoc(vacationRulesCollectionRef, rule);
    return { ...rule, id: docRef.id };
}

export async function updateVacationRule(id: string, rule: Partial<Omit<VacationRule, 'id'>>) {
    const ruleDoc = doc(db, "vacaciones_rules", id);
    await updateDoc(ruleDoc, rule);
}

export async function deleteVacationRule(id: string) {
    const ruleDoc = doc(db, "vacaciones_rules", id);
    await deleteDoc(ruleDoc);
}

// --- Vacation Request Functions ---

export async function addVacationRequest(requestData: Omit<VacationRequest, 'id' | 'createdAt'>): Promise<VacationRequest> {
  const requestWithTimestamp = {
    ...requestData,
    createdAt: Timestamp.now(),
    startDate: Timestamp.fromDate(requestData.startDate),
    returnDate: Timestamp.fromDate(requestData.returnDate),
  };

  const employeeRef = doc(db, "vacaciones_empleados", requestData.employeeId);

  await runTransaction(db, async (transaction) => {
    let newDaysTaken: number | undefined;

    // --- READ PHASE ---
    // All reads must happen before any writes.
    if (requestData.type === 'vacaciones') {
      const employeeDoc = await transaction.get(employeeRef);
      if (!employeeDoc.exists()) {
        throw new Error("El empleado para esta solicitud no existe.");
      }
      const currentDaysTaken = employeeDoc.data().diasTomados || 0;
      newDaysTaken = currentDaysTaken + requestData.daysRequested;
    }

    // --- WRITE PHASE ---
    // Now we can perform all writes.
    const newRequestRef = doc(vacationRequestsCollectionRef);
    transaction.set(newRequestRef, requestWithTimestamp);

    if (requestData.type === 'vacaciones' && newDaysTaken !== undefined) {
      transaction.update(employeeRef, { diasTomados: newDaysTaken });
    }
  });

  return { ...requestData, id: 'temp-id-after-save', createdAt: new Date() };
}

export async function getVacationRequests(prefix: string): Promise<VacationRequest[]> {
    const q = query(vacationRequestsCollectionRef, where("prefix", "==", prefix));
    const snapshot = await getDocs(q);
    const requests = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            startDate: (data.startDate as Timestamp).toDate(),
            returnDate: (data.returnDate as Timestamp).toDate(),
            createdAt: (data.createdAt as Timestamp).toDate(),
        } as VacationRequest;
    });
    // Sort by startDate in descending order in the application code
    return requests.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
}

export async function deleteVacationRequest(requestId: string): Promise<void> {
  const requestRef = doc(db, "vacaciones_requests", requestId);

  await runTransaction(db, async (transaction) => {
    const requestDoc = await transaction.get(requestRef);
    if (!requestDoc.exists()) {
      throw new Error("La solicitud que intentas eliminar no existe.");
    }
    
    const requestData = requestDoc.data() as VacationRequest;

    // If it was a vacation type, revert the days taken from the employee
    if (requestData.type === 'vacaciones') {
      const employeeRef = doc(db, "vacaciones_empleados", requestData.employeeId);
      const employeeDoc = await transaction.get(employeeRef);
      if (employeeDoc.exists()) {
        const employeeData = employeeDoc.data() as EmpleadoVacaciones;
        const newDaysTaken = (employeeData.diasTomados || 0) - requestData.daysRequested;
        transaction.update(employeeRef, { diasTomados: Math.max(0, newDaysTaken) });
      }
    }

    // Delete the request itself
    transaction.delete(requestRef);
  });
}

export type VacationSettings = {
    id?: string;
    prefix: string;
    logoUrl?: string;
    mascotUrl?: string;
    cardPrompt?: string;
    imgbbApiKey?: string;
};

export async function getVacationSettings(prefix: string): Promise<VacationSettings | null> {
    try {
        const settingsDocRef = doc(db, "vacaciones_settings", prefix);
        const settingsDoc = await getDoc(settingsDocRef);
        if (settingsDoc.exists()) {
            const data = settingsDoc.data();
            return {
                id: settingsDoc.id,
                prefix: data.prefix || prefix,
                logoUrl: data.logoUrl || "",
                mascotUrl: data.mascotUrl || "",
                cardPrompt: data.cardPrompt || "",
                imgbbApiKey: data.imgbbApiKey || "",
            };
        }
        return null;
    } catch (error) {
        console.error("Failed to get vacation settings", error);
        return null;
    }
}

export async function saveVacationSettings(prefix: string, settings: Omit<VacationSettings, 'prefix'>): Promise<void> {
    const settingsDocRef = doc(db, "vacaciones_settings", prefix);
    await setDoc(settingsDocRef, {
        ...settings,
        prefix,
        updatedAt: Timestamp.now()
    }, { merge: true });
}

export async function generateBirthdayMessage(employeeName: string): Promise<string> {
    try {
        const response = await ai.generate({
            prompt: `Escribe un mensaje corto de felicitación de cumpleaños muy profesional, motivador y cálido para un empleado de nuestra empresa llamado ${employeeName}. 
El mensaje debe ser corto (máximo 140 caracteres, idealmente 2 líneas breves) para que quepa en una tarjeta de felicitación de diseño formal de la empresa.
El tono debe ser corporativo pero amigable, cercano y agradecido.
Por favor, NO incluyas el nombre del empleado en el mensaje en sí (por ejemplo, no empieces con "Feliz cumpleaños Juan" o similar, solo escribe la dedicatoria/deseo).
Escribe UNICAMENTE la dedicatoria corta de felicitación, sin comillas, sin introducciones ni explicaciones.`,
        });
        return response.text.trim();
    } catch (error) {
        console.error("Failed to generate birthday message", error);
        return "Le deseamos un excelente día lleno de éxito, salud y felicidad en su vida profesional y personal.";
    }
}

export async function generateAICard(
    employeeName: string,
    settings: VacationSettings | null,
    customPrompt?: string
): Promise<string> {
    try {
        const parts: any[] = [];
        
        let promptText = customPrompt || settings?.cardPrompt || "";
        if (!promptText.trim()) {
            promptText = "Genera una tarjeta de felicitación alegre de cumpleaños para nuestro colaborador {name}. El diseño debe ser muy alegre, con mucho confeti y globos festivos sobre un fondo de tono claro y colorido (evita tonos oscuros). Integra el logotipo y la mascota adjuntos de forma de celebración.";
        }
        
        // Shorten name to first two words for the card prompt/generation
        const words = employeeName.trim().split(/\s+/);
        const shortName = words.slice(0, 2).join(" ");
        
        // Reemplazar marcador de nombre
        promptText = promptText.replace(/{name}|{nombre}|{employeeName}/gi, shortName);
        
        parts.push({ text: promptText });
        
        const getContentType = (dataUrl: string) => {
            const match = dataUrl.match(/^data:([^;]+);base64,/);
            return match ? match[1] : "image/png";
        };
        
        if (settings?.logoUrl && settings.logoUrl.startsWith("data:")) {
            parts.push({
                media: {
                    url: settings.logoUrl,
                    contentType: getContentType(settings.logoUrl)
                }
            });
        }
        
        if (settings?.mascotUrl && settings.mascotUrl.startsWith("data:")) {
            parts.push({
                media: {
                    url: settings.mascotUrl,
                    contentType: getContentType(settings.mascotUrl)
                }
            });
        }
        
        console.log("Generando tarjeta con Nano Banana (gemini-2.5-flash-image) para:", employeeName);
        const response = await ai.generate({
            model: 'googleai/gemini-2.5-flash-image',
            prompt: parts
        });
        
        const media = response.media;
        if (!media || !media.url) {
            throw new Error("El modelo no devolvió ninguna imagen en la respuesta.");
        }
        
        // Si el usuario tiene configurado ImgBB API Key, la subimos a la nube y guardamos registro en firestore
        if (settings?.imgbbApiKey?.trim()) {
            try {
                const { url, deleteUrl } = await uploadToImgBB(media.url, settings.imgbbApiKey.trim());
                await saveGeneratedCard({
                    prefix: settings.prefix,
                    employeeName,
                    imageUrl: url,
                    deleteUrl
                });
                console.log("Tarjeta guardada en historial de Firestore con URL:", url);
            } catch (err) {
                console.error("No se pudo subir e indexar la tarjeta de felicitación:", err);
            }
        }
        
        return media.url;
    } catch (error: any) {
        console.error("Error generating AI card:", error);
        throw new Error(error.message || "No se pudo generar la tarjeta con Inteligencia Artificial.");
    }
}

export type GeneratedCard = {
    id: string;
    prefix: string;
    employeeName: string;
    imageUrl: string;
    deleteUrl?: string;
    createdAt: Date;
};

const cardsCollectionRef = collection(db, "vacaciones_cards");

async function uploadToImgBB(base64Image: string, apiKey: string): Promise<{ url: string; deleteUrl: string }> {
    try {
        const base64Data = base64Image.replace(/^data:image\/[a-z]+;base64,/, "");
        
        const body = new URLSearchParams();
        body.append("image", base64Data);
        
        console.log("Uploading card image to ImgBB...");
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: body.toString()
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ImgBB API error (${response.status}): ${errorText}`);
        }
        
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error?.message || "ImgBB upload failed");
        }
        
        return {
            url: result.data.url,
            deleteUrl: result.data.delete_url
        };
    } catch (error) {
        console.error("Error uploading to ImgBB:", error);
        throw error;
    }
}

export async function getGeneratedCards(prefix: string): Promise<GeneratedCard[]> {
    try {
        const q = query(cardsCollectionRef, where("prefix", "==", prefix));
        const snapshot = await getDocs(q);
        const cards = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                prefix: data.prefix,
                employeeName: data.employeeName,
                imageUrl: data.imageUrl,
                deleteUrl: data.deleteUrl || "",
                createdAt: data.createdAt?.toDate() || new Date()
            };
        });
        // Sort on the client side to avoid composite index requirements
        return cards.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
        console.error("Failed to get generated cards", error);
        return [];
    }
}

export async function saveGeneratedCard(card: Omit<GeneratedCard, 'id' | 'createdAt'>): Promise<void> {
    await addDoc(cardsCollectionRef, {
        ...card,
        createdAt: Timestamp.now()
    });
}

export async function deleteGeneratedCard(id: string): Promise<void> {
    const cardDoc = doc(db, "vacaciones_cards", id);
    await deleteDoc(cardDoc);
}
