
'use server';

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDoc,
  runTransaction,
  Timestamp,
  writeBatch,
  limit,
  orderBy
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Sucursal, CentralAccount, CentralAccountTransaction } from "@/lib/data";

const sucursalesCollectionRef = collection(db, "sucursales");
const centralAccountsCollectionRef = collection(db, "centralAccounts");
const centralAccountTransactionsCollectionRef = collection(db, "centralAccountTransactions");


// --- Sucursal Functions ---
export async function getSucursales(prefix: string): Promise<Sucursal[]> {
  const q = query(sucursalesCollectionRef, where("prefix", "==", prefix));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Sucursal[];
}

export async function addSucursal(sucursal: Omit<Sucursal, 'id' | 'currentBalance'>): Promise<Sucursal> {
  const data = { ...sucursal, currentBalance: 0 };
  const docRef = await addDoc(sucursalesCollectionRef, data);
  return { ...data, id: docRef.id };
}

export async function updateSucursal(id: string, sucursal: Partial<Omit<Sucursal, 'id'>>) {
  const sucursalDoc = doc(db, "sucursales", id);
  await updateDoc(sucursalDoc, sucursal);
}

export async function deleteSucursal(id: string) {
  const sucursalDocRef = doc(db, "sucursales", id);
  const sucursalDoc = await getDoc(sucursalDocRef);

  if (sucursalDoc.exists() && sucursalDoc.data().currentBalance > 0) {
    throw new Error("No se puede eliminar una sucursal con balance positivo. Retire los fondos primero.");
  }
  await deleteDoc(sucursalDocRef);
}


// --- Dashboard & Central Account Functions ---
export async function getIncomeExpensesSummary(prefix: string) {
  const centralAccountDocRef = doc(db, "centralAccounts", prefix);
  const sucursales = await getSucursales(prefix);

  const qTransactions = query(
    centralAccountTransactionsCollectionRef, 
    where("accountId", "==", prefix), 
    orderBy("date", "desc"),
    limit(10)
  );
  
  const [accountSnap, transactionsSnap] = await Promise.all([
    getDoc(centralAccountDocRef),
    getDocs(qTransactions),
  ]);

  let centralAccount: CentralAccount;
  if (accountSnap.exists()) {
    centralAccount = { id: accountSnap.id, ...accountSnap.data() } as CentralAccount;
  } else {
    // Create a new central account if it doesn't exist
    centralAccount = {
      id: prefix,
      prefix: prefix,
      currentBalance: 0,
      assignedCapital: 0,
      totalBranchBalance: 0,
    };
    await addDoc(centralAccountsCollectionRef, centralAccount);
  }

  const transactions = transactionsSnap.docs.map(doc => {
      const data = doc.data();
      return { ...data, id: doc.id, date: (data.date as Timestamp).toDate() }
  }) as CentralAccountTransaction[];

  return { centralAccount, sucursales, transactions };
}


type TransactionParams = {
    prefix: string;
    accountId: string;
    type: 'deposit' | 'withdrawal' | 'assignment';
    amount: number;
    userPerformed: string;
    sucursalId?: string;
    description?: string;
}

export async function performCentralAccountTransaction(params: TransactionParams) {
    const { prefix, accountId, type, amount, userPerformed, sucursalId, description } = params;

    const centralAccountRef = doc(db, "centralAccounts", accountId);
    const sucursalRef = sucursalId ? doc(db, "sucursales", sucursalId) : null;
    const transactionRef = doc(centralAccountTransactionsCollectionRef);
    
    await runTransaction(db, async (transaction) => {
        const centralAccountDoc = await transaction.get(centralAccountRef);
        let centralAccountData = centralAccountDoc.data() as CentralAccount;
        
        // If account doesn't exist, create it in memory for this transaction
        if (!centralAccountDoc.exists()) {
             centralAccountData = {
                id: prefix,
                prefix: prefix,
                currentBalance: 0,
                assignedCapital: 0,
                totalBranchBalance: 0,
            };
        }

        const newTransactionData: Omit<CentralAccountTransaction, 'id' | 'date'> & { date: Timestamp } = {
            accountId,
            type,
            amount,
            userPerformed,
            description: description || type,
            date: Timestamp.now(),
            to: sucursalId,
        };

        switch (type) {
            case 'deposit':
                centralAccountData.currentBalance += amount;
                break;
            case 'withdrawal':
                if (centralAccountData.currentBalance < amount) {
                    throw new Error("Fondos insuficientes en la cuenta central.");
                }
                centralAccountData.currentBalance -= amount;
                break;
            case 'assignment':
                if (!sucursalRef) throw new Error("ID de sucursal no proporcionado para la asignación.");
                if (centralAccountData.currentBalance < amount) {
                    throw new Error("Fondos insuficientes en la cuenta central para asignar.");
                }
                
                const sucursalDoc = await transaction.get(sucursalRef);
                if (!sucursalDoc.exists()) throw new Error("La sucursal de destino no existe.");

                const sucursalData = sucursalDoc.data() as Sucursal;

                // Update balances
                centralAccountData.currentBalance -= amount;
                centralAccountData.assignedCapital += amount;
                centralAccountData.totalBranchBalance += amount;
                sucursalData.currentBalance += amount;

                transaction.update(sucursalRef, { currentBalance: sucursalData.currentBalance });
                break;
            default:
                throw new Error("Tipo de transacción no válido.");
        }
        
        if (centralAccountDoc.exists()) {
            transaction.update(centralAccountRef, centralAccountData);
        } else {
            transaction.set(centralAccountRef, centralAccountData);
        }
        transaction.set(transactionRef, newTransactionData);
    });
}
