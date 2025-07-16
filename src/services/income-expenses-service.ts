
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
  orderBy,
  setDoc
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

  // Firestore requires a composite index for queries with where and orderBy on different fields.
  // To avoid this requirement for users, we'll fetch and sort on the client side.
  const qTransactions = query(
    centralAccountTransactionsCollectionRef, 
    where("accountId", "==", prefix),
    limit(25) // Fetch a reasonable number to sort
  );
  
  const [accountSnap, transactionsSnap] = await Promise.all([
    getDoc(centralAccountDocRef),
    getDocs(qTransactions),
  ]);

  let centralAccount: CentralAccount;
  if (accountSnap.exists()) {
    centralAccount = { id: accountSnap.id, ...accountSnap.data() } as CentralAccount;
  } else {
    // Return a default object but don't create it here. 
    // Creation will be handled by the first transaction.
    centralAccount = {
      id: prefix,
      prefix: prefix,
      currentBalance: 0,
      assignedCapital: 0,
      totalBranchBalance: 0,
    };
  }

  const transactions = transactionsSnap.docs.map(doc => {
      const data = doc.data();
      return { ...data, id: doc.id, date: (data.date as Timestamp).toDate() }
  }) as CentralAccountTransaction[];

  // Sort transactions by date descending and take the last 10
  const sortedAndLimitedTransactions = transactions
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 10);

  return { centralAccount, sucursales, transactions: sortedAndLimitedTransactions };
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
        let centralAccountData: CentralAccount;
        
        // If account doesn't exist, create it in memory for this transaction
        if (!centralAccountDoc.exists()) {
             centralAccountData = {
                id: prefix,
                prefix: prefix,
                currentBalance: 0,
                assignedCapital: 0,
                totalBranchBalance: 0,
            };
        } else {
            centralAccountData = { id: centralAccountDoc.id, ...centralAccountDoc.data() } as CentralAccount;
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
        
        // Remove the 'id' field before writing to Firestore
        const { id, ...dataToSave } = centralAccountData;

        // Use set with merge: true to create or update
        transaction.set(centralAccountRef, dataToSave, { merge: true });
        transaction.set(transactionRef, newTransactionData);
    });
}

// DANGER ZONE FUNCTION
export async function deleteAllIncomeExpensesData(prefix: string): Promise<void> {
    const batch = writeBatch(db);

    // Delete Central Account
    const centralAccountRef = doc(db, "centralAccounts", prefix);
    batch.delete(centralAccountRef);

    // Delete all sucursales for the prefix
    const sucursalesQuery = query(sucursalesCollectionRef, where("prefix", "==", prefix));
    const sucursalesSnapshot = await getDocs(sucursalesQuery);
    sucursalesSnapshot.forEach(doc => batch.delete(doc.ref));

    // Delete all transactions for the prefix
    const transactionsQuery = query(centralAccountTransactionsCollectionRef, where("accountId", "==", prefix));
    const transactionsSnapshot = await getDocs(transactionsQuery);
    transactionsSnapshot.forEach(doc => batch.delete(doc.ref));
    
    await batch.commit();
}
