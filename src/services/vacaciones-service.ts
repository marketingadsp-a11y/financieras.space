

'use server';

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, Timestamp, runTransaction, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { EmpleadoVacaciones, VacationRule, VacationRequest } from "@/lib/data";

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
    return requests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
