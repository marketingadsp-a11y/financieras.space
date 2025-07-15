
import { DocumentData, Timestamp } from "firebase/firestore";
import type { Customer } from "@/lib/data";

// Helper to safely convert Firestore Timestamp to JS Date
const toDate = (timestamp: any): Date | undefined => {
    if (!timestamp) {
        return undefined;
    }
    if (timestamp instanceof Timestamp) {
        return timestamp.toDate();
    }
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
       return timestamp.toDate();
    }
    // Handle string dates from AI parser or other sources
    if (typeof timestamp === 'string') {
        const parsedDate = new Date(timestamp);
        if (!isNaN(parsedDate.getTime())) {
            return parsedDate;
        }
    }
    return undefined;
}

export function customerFromDoc(doc: DocumentData): Customer {
    const data = doc.data();

    return {
        id: doc.id,
        plazaId: data.plazaId,
        name: data.name,
        address: data.address,
        colonia: data.colonia || "",
        cp: data.cp || "",
        phone: data.phone || "",
        guarantor: data.guarantor || "",
        guarantorPhone: data.guarantorPhone || "",
        direccionAval: data.direccionAval || "",
        coloniaAval: data.coloniaAval || "",
        cpAval: data.cpAval || "",
        loanAmount: data.loanAmount || 0,
        paymentAmount: data.paymentAmount || 0,
        installmentsDue: data.installmentsDue || 0,
        dueAmount: data.dueAmount || 0,
        fechaPrestamo: toDate(data.fechaPrestamo),
        status: data.status || "Pendiente",
        prefix: data.prefix || "",
        loanControlGroupId: data.loanControlGroupId || undefined,
    };
}
