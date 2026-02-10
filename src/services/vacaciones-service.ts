'use server';

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { EmpleadoVacaciones } from "@/lib/data";

const empleadosCollectionRef = collection(db, "vacaciones_empleados");

const fromDoc = (doc: any): EmpleadoVacaciones => {
    const data = doc.data();
    return {
        id: doc.id,
        prefix: data.prefix,
        name: data.name,
        fechaIngreso: (data.fechaIngreso as Timestamp).toDate(),
        sueldoSemanal: data.sueldoSemanal,
    };
};

const toDoc = (empleado: Partial<Omit<EmpleadoVacaciones, 'id'>>) => {
    const data: any = { ...empleado };
    if (empleado.fechaIngreso) {
        data.fechaIngreso = Timestamp.fromDate(new Date(empleado.fechaIngreso));
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
