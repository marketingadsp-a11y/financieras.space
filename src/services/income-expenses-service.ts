
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
import type { Sucursal, CentralAccount, CentralAccountTransaction, SucursalTransaction } from "@/lib/data";

const sucursalesCollectionRef = collection(db, "sucursales");
const centralAccountsCollectionRef = collection(db, "centralAccounts");
const centralAccountTransactionsCollectionRef = collection(db, "centralAccountTransactions");
const sucursalTransactionsCollectionRef = collection(db, "sucursalTransactions");


// --- Sucursal Functions ---
export async function getSucursales(prefix: string): Promise<Sucursal[]> {
  const q = query(sucursalesCollectionRef, where("prefix", "==", prefix));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Sucursal[];
}

export async function getSucursalById(id: string): Promise<Sucursal | null> {
    const docRef = doc(db, "sucursales", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        return { 
            id: docSnap.id, 
            ...data,
            currentBalance: data.currentBalance || 0,
            loanBalance: data.loanBalance || 0,
        } as Sucursal;
    }
    return null;
}

export async function addSucursal(sucursal: Omit<Sucursal, 'id' | 'currentBalance' | 'loanBalance'>): Promise<Sucursal> {
  const data = { ...sucursal, currentBalance: 0, loanBalance: 0 };
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

  if (sucursalDoc.exists() && (sucursalDoc.data().currentBalance > 0 || sucursalDoc.data().loanBalance > 0)) {
    throw new Error("No se puede eliminar una sucursal con balance positivo en Caja Chica o Caja para Prestar. Retire los fondos primero.");
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
    limit(25)
  );
  
  const [accountSnap, transactionsSnap] = await Promise.all([
    getDoc(centralAccountDocRef),
    getDocs(qTransactions),
  ]);

  let centralAccount: CentralAccount;
  if (accountSnap.exists()) {
    centralAccount = { id: accountSnap.id, ...accountSnap.data() } as CentralAccount;
  } else {
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

  const sortedAndLimitedTransactions = transactions
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 10);

  return { centralAccount, sucursales, transactions: sortedAndLimitedTransactions };
}


type CentralTransactionParams = {
    prefix: string;
    accountId: string;
    type: 'deposit' | 'withdrawal' | 'assignment';
    amount: number;
    userPerformed: string;
    sucursalId?: string;
    description?: string;
}

export async function performCentralAccountTransaction(params: CentralTransactionParams) {
    const { prefix, accountId, type, amount, userPerformed, sucursalId, description } = params;

    const centralAccountRef = doc(db, "centralAccounts", accountId);
    const sucursalRef = sucursalId ? doc(db, "sucursales", sucursalId) : null;
    const transactionRef = doc(centralAccountTransactionsCollectionRef);
    
    await runTransaction(db, async (transaction) => {
        const centralAccountDoc = await transaction.get(centralAccountRef);
        let centralAccountData: CentralAccount;
        
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

                centralAccountData.currentBalance -= amount;
                centralAccountData.assignedCapital += amount;
                // Note: totalBranchBalance is now just the sum of Caja Chica, not loan balance. We may need to reconsider this field.
                
                // Assign capital to the loan balance (Caja para Prestar)
                const newLoanBalance = (sucursalData.loanBalance || 0) + amount;

                transaction.update(sucursalRef, { loanBalance: newLoanBalance });
                
                // Also create a transaction record for the sucursal
                const sucursalTransactionRef = doc(sucursalTransactionsCollectionRef);
                const newSucursalTransaction: Omit<SucursalTransaction, 'id' | 'date'> & {date: Timestamp} = {
                    sucursalId,
                    type: 'deposit', // An assignment is a deposit from the sucursal's perspective
                    amount,
                    userPerformed,
                    description: `Asignación desde Capital Central`,
                    date: newTransactionData.date,
                };
                // This transaction now affects the LOAN balance, not the currentBalance, so we don't record it in the same log.
                // We'll need a separate log for loan balance movements if required. For now, we just update the balance.
                // transaction.set(sucursalTransactionRef, newSucursalTransaction);
                break;
            default:
                throw new Error("Tipo de transacción no válido.");
        }
        
        const { id, ...dataToSave } = centralAccountData;

        transaction.set(centralAccountRef, dataToSave, { merge: true });
        transaction.set(transactionRef, newTransactionData);
    });
}

// DANGER ZONE FUNCTION
export async function deleteAllIncomeExpensesData(prefix: string): Promise<void> {
    const batch = writeBatch(db);

    const centralAccountRef = doc(db, "centralAccounts", prefix);
    batch.delete(centralAccountRef);

    const sucursalesQuery = query(sucursalesCollectionRef, where("prefix", "==", prefix));
    const sucursalesSnapshot = await getDocs(sucursalesQuery);
    
    const sucursalIds: string[] = [];
    sucursalesSnapshot.forEach(doc => {
        sucursalIds.push(doc.id);
        batch.delete(doc.ref)
    });

    const centralTransactionsQuery = query(centralAccountTransactionsCollectionRef, where("accountId", "==", prefix));
    const centralTransactionsSnapshot = await getDocs(centralTransactionsQuery);
    centralTransactionsSnapshot.forEach(doc => batch.delete(doc.ref));

    // Delete sucursal transactions in chunks if necessary
    if(sucursalIds.length > 0){
        const sucursalTransactionsQuery = query(sucursalTransactionsCollectionRef, where("sucursalId", "in", sucursalIds));
        const sucursalTransactionsSnapshot = await getDocs(sucursalTransactionsQuery);
        sucursalTransactionsSnapshot.forEach(doc => batch.delete(doc.ref));
    }
    
    await batch.commit();
}

// --- Sucursal Panel Functions ---

export async function getSucursalTransactions(sucursalId: string): Promise<SucursalTransaction[]> {
    const q = query(
        sucursalTransactionsCollectionRef,
        where("sucursalId", "==", sucursalId),
        limit(50)
    );
    const snapshot = await getDocs(q);
    const transactions = snapshot.docs.map(doc => {
        const data = doc.data();
        return { ...data, id: doc.id, date: (data.date as Timestamp).toDate() }
    }) as SucursalTransaction[];
    
    // Sort in code to avoid needing a composite index
    return transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
}

type SucursalTransactionParams = {
    sucursalId: string;
    type: 'expense' | 'deposit';
    amount: number;
    userPerformed: string;
    description: string;
}

export async function performSucursalTransaction(params: SucursalTransactionParams) {
    const { sucursalId, type, amount, userPerformed, description } = params;
    const sucursalRef = doc(db, "sucursales", sucursalId);
    const transactionRef = doc(sucursalTransactionsCollectionRef);

    await runTransaction(db, async (transaction) => {
        const sucursalDoc = await transaction.get(sucursalRef);
        if (!sucursalDoc.exists()) {
            throw new Error("La sucursal no existe.");
        }
        
        const sucursalData = sucursalDoc.data() as Sucursal;

        if (type === 'expense' && sucursalData.currentBalance < amount) {
            throw new Error("Fondos insuficientes en la Caja Chica para este gasto.");
        }

        const newBalance = type === 'expense'
            ? sucursalData.currentBalance - amount
            : sucursalData.currentBalance + amount;

        transaction.update(sucursalRef, { currentBalance: newBalance });

        const newTransactionData: Omit<SucursalTransaction, 'id'|'date'> & { date: Timestamp } = {
            sucursalId,
            type,
            amount,
            userPerformed,
            description,
            date: Timestamp.now()
        };
        transaction.set(transactionRef, newTransactionData);

        // Also update the totalBranchBalance in the central account
        const centralAccountRef = doc(db, "centralAccounts", sucursalData.prefix);
        const centralAccountDoc = await transaction.get(centralAccountRef);
        if (centralAccountDoc.exists()) {
            const centralAccountData = centralAccountDoc.data();
            const change = type === 'expense' ? -amount : amount;
            const newTotalBalance = (centralAccountData.totalBranchBalance || 0) + change;
            transaction.update(centralAccountRef, { totalBranchBalance: newTotalBalance });
        }
    });
}

export async function getSucursalStats(sucursalId: string) {
    const transactions = await getSucursalTransactions(sucursalId);
    
    const totals = transactions.reduce((acc, tx) => {
        // Only consider internal deposits and expenses for Caja Chica stats
        if (tx.type === 'deposit' && !tx.description.includes('Asignación desde Capital Central')) {
            acc.totalIncome += tx.amount;
        } else if (tx.type === 'expense') {
            acc.totalExpenses += tx.amount;
        }
        return acc;
    }, { totalIncome: 0, totalExpenses: 0 });

    return totals;
}
