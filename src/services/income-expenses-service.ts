

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
  DocumentSnapshot,
  DocumentData
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Sucursal, CentralAccount, CentralAccountTransaction, SucursalTransaction } from "@/lib/data";

const sucursalesCollectionRef = collection(db, "sucursales");
const centralAccountsCollectionRef = collection(db, "centralAccounts");
const centralAccountTransactionsCollectionRef = collection(db, "centralAccountTransactions");
const sucursalTransactionsCollectionRef = collection(db, "sucursalTransactions");


// --- Sucursal Functions ---
export async function getSucursales(prefix?: string): Promise<Sucursal[]> {
  const q = prefix ? query(sucursalesCollectionRef, where("prefix", "==", prefix)) : query(sucursalesCollectionRef);
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
        } as Sucursal;
    }
    return null;
}

export async function addSucursal(sucursalData: Omit<Sucursal, 'id' | 'currentBalance'>): Promise<Sucursal> {
  const data: Omit<Sucursal, 'id'> = { ...sucursalData, prefix: sucursalData.prefix || '', currentBalance: 0 };
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

export async function adjustSucursalBalance(sucursalId: string, newBalance: number) {
    const sucursalRef = doc(db, "sucursales", sucursalId);
    await updateDoc(sucursalRef, { currentBalance: newBalance });
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

                // Update Central Account
                centralAccountData.currentBalance -= amount;
                centralAccountData.assignedCapital += amount;
                centralAccountData.totalBranchBalance += amount;
                
                // Update Sucursal
                const newSucursalBalance = (sucursalData.currentBalance || 0) + amount;
                transaction.update(sucursalRef, { currentBalance: newSucursalBalance });
                
                break;
            default:
                throw new Error("Tipo de transacción no válido.");
        }
        
        const { id, ...dataToSave } = centralAccountData;

        transaction.set(centralAccountRef, dataToSave, { merge: true });
        transaction.set(transactionRef, newTransactionData);
    });
}

// DANGER ZONE FUNCTIONS
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

    if(sucursalIds.length > 0){
        const sucursalTransactionsQuery = query(sucursalTransactionsCollectionRef, where("sucursalId", "in", sucursalIds));
        const sucursalTransactionsSnapshot = await getDocs(sucursalTransactionsQuery);
        sucursalTransactionsSnapshot.forEach(doc => batch.delete(doc.ref));
    }
    
    await batch.commit();
}

export async function deleteSucursalData(sucursalId: string): Promise<void> {
    const batch = writeBatch(db);

    const transactionsQuery = query(sucursalTransactionsCollectionRef, where("sucursalId", "==", sucursalId));
    const transactionsSnapshot = await getDocs(transactionsQuery);
    transactionsSnapshot.forEach(doc => batch.delete(doc.ref));
    
    const sucursalRef = doc(db, "sucursales", sucursalId);
    batch.update(sucursalRef, { currentBalance: 0 });

    await batch.commit();
}


// --- Sucursal Panel Functions ---

export async function getSucursalTransactions(sucursalId: string): Promise<any[]> {
    const q = query(
        sucursalTransactionsCollectionRef,
        where("sucursalId", "==", sucursalId),
        limit(50)
    );
    const snapshot = await getDocs(q);
    const transactions = snapshot.docs.map(doc => {
        const data = doc.data();
        // Convert Timestamp to a serializable format (ISO string)
        return { ...data, id: doc.id, date: (data.date as Timestamp).toDate().toISOString() }
    });
    
    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

type SucursalTransactionParams = {
    sucursalId: string;
    type: 'expense' | 'deposit' | 'transfer_to_central';
    amount: number;
    userPerformed: string;
    description: string;
    category?: string;
    executive?: string;
}

export async function performSucursalTransaction(params: SucursalTransactionParams) {
    const { sucursalId, type, amount, userPerformed, description, category, executive } = params;

    await runTransaction(db, async (transaction) => {
        // --- ALL READS FIRST ---
        const sucursalRef = doc(db, "sucursales", sucursalId);
        const sucursalDoc = await transaction.get(sucursalRef);
        if (!sucursalDoc.exists()) {
            throw new Error("La sucursal no existe.");
        }
        const sucursalData = sucursalDoc.data() as Sucursal;

        const centralAccountRef = doc(db, "centralAccounts", sucursalData.prefix);
        const centralAccountDoc = await transaction.get(centralAccountRef);
        let centralAccountData: Partial<CentralAccount>;
        if (!centralAccountDoc.exists()) {
             centralAccountData = {
                prefix: sucursalData.prefix,
                currentBalance: 0,
                assignedCapital: 0,
                totalBranchBalance: 0,
            };
        } else {
            centralAccountData = centralAccountDoc.data() as CentralAccount;
        }

        // --- PREPARE DATA ---
        const now = Timestamp.now();
        const sucursalTransactionRef = doc(sucursalTransactionsCollectionRef);
        const newSucursalTransactionData: Partial<Omit<SucursalTransaction, 'id'|'date'>> & { date: Timestamp } = {
            sucursalId, type, amount, userPerformed, description, date: now,
        };
        if (category) newSucursalTransactionData.category = category;
        if (executive) newSucursalTransactionData.executive = executive;

        // --- CALCULATE NEW BALANCES ---
        let newSucursalBalance = sucursalData.currentBalance;
        
        if (type === 'deposit') {
            newSucursalBalance += amount;
            centralAccountData.totalBranchBalance = (centralAccountData.totalBranchBalance || 0) + amount;
        } else if (type === 'expense') {
            newSucursalBalance -= amount;
            centralAccountData.totalBranchBalance = (centralAccountData.totalBranchBalance || 0) - amount;
        } else if (type === 'transfer_to_central') {
            if (sucursalData.currentBalance < amount) {
                throw new Error("Fondos insuficientes en la Caja Chica para esta operación.");
            }
            newSucursalBalance -= amount;
            centralAccountData.currentBalance = (centralAccountData.currentBalance || 0) + amount; // Add to central account
            centralAccountData.totalBranchBalance = (centralAccountData.totalBranchBalance || 0) - amount; // Remove from total in branches

            // Log the "deposit" on the central account's side
            const centralTransactionRef = doc(centralAccountTransactionsCollectionRef);
            const centralTxData = {
                accountId: sucursalData.prefix,
                type: 'deposit' as const,
                amount: amount,
                date: now,
                userPerformed,
                description: `Transferencia recibida de ${sucursalData.name}`,
                from: sucursalId,
            };
            transaction.set(centralTransactionRef, centralTxData);
        }

        // --- ALL WRITES LAST ---
        transaction.set(sucursalTransactionRef, newSucursalTransactionData);
        transaction.update(sucursalRef, { currentBalance: newSucursalBalance });
        transaction.set(centralAccountRef, centralAccountData, { merge: true });
    });
}


export async function getSucursalStats(sucursalId: string) {
    const q = query(
        sucursalTransactionsCollectionRef,
        where("sucursalId", "==", sucursalId)
    );
    const snapshot = await getDocs(q);
    const transactions = snapshot.docs.map(doc => doc.data()) as SucursalTransaction[];
    
    const totals = transactions.reduce((acc, tx) => {
        if (tx.type === 'deposit') {
            acc.totalIncome += tx.amount;
        } else if (tx.type === 'expense') {
            acc.totalExpenses += tx.amount;
        }
        return acc;
    }, { totalIncome: 0, totalExpenses: 0 });

    return totals;
}


export async function deleteSucursalTransaction(transactionId: string): Promise<void> {
  const transactionRef = doc(db, "sucursalTransactions", transactionId);

  await runTransaction(db, async (transaction) => {
    // 1. Get the transaction to be deleted
    const txDoc = await transaction.get(transactionRef);
    if (!txDoc.exists()) {
      throw new Error("La transacción no existe o ya fue eliminada.");
    }
    const txData = txDoc.data() as SucursalTransaction;

    // 2. Get the associated sucursal and central account
    const sucursalRef = doc(db, "sucursales", txData.sucursalId);
    const sucursalDoc = await transaction.get(sucursalRef);
    if (!sucursalDoc.exists()) {
      throw new Error("La sucursal asociada no existe.");
    }
    const sucursalData = sucursalDoc.data() as Sucursal;

    const centralAccountRef = doc(db, "centralAccounts", sucursalData.prefix);
    const centralAccountDoc = await transaction.get(centralAccountRef);

    // 3. Calculate balance reversals for Sucursal
    let newSucursalBalance = sucursalData.currentBalance;
    if (txData.type === 'deposit') {
      newSucursalBalance -= txData.amount;
    } else if (txData.type === 'expense' || txData.type === 'transfer_to_central') {
      newSucursalBalance += txData.amount;
    }
    transaction.update(sucursalRef, { currentBalance: newSucursalBalance });
    
    // 4. Calculate balance reversals for Central Account
    if (centralAccountDoc.exists()) {
        const centralAccountData = centralAccountDoc.data() as CentralAccount;
        let newCentralTotalBranchBalance = centralAccountData.totalBranchBalance;
        let newCentralBalance = centralAccountData.currentBalance;

        if (txData.type === 'deposit') {
            newCentralTotalBranchBalance -= txData.amount;
        } else if (txData.type === 'expense') {
            newCentralTotalBranchBalance += txData.amount;
        } else if (txData.type === 'transfer_to_central') {
            // Revert the effects on central account
            newCentralTotalBranchBalance += txData.amount; // Add back to total branch balance
            newCentralBalance -= txData.amount; // Remove from central's available cash
        }

        transaction.update(centralAccountRef, { 
            totalBranchBalance: newCentralTotalBranchBalance,
            currentBalance: newCentralBalance,
        });
    }

    // 5. Delete the transaction
    transaction.delete(transactionRef);
  });
}

export async function updateSucursalTransaction(
  oldTransaction: SucursalTransaction,
  newTransactionData: Partial<SucursalTransaction>
): Promise<void> {
  const transactionRef = doc(db, "sucursalTransactions", oldTransaction.id);

  await runTransaction(db, async (transaction) => {
    // --- Step 1: Revert the old transaction's financial impact ---
    const sucursalRef = doc(db, "sucursales", oldTransaction.sucursalId);
    const sucursalDoc = await transaction.get(sucursalRef);
    if (!sucursalDoc.exists()) throw new Error("Sucursal no encontrada.");
    const sucursalData = sucursalDoc.data() as Sucursal;
    
    const centralAccountRef = doc(db, "centralAccounts", sucursalData.prefix);
    const centralAccountDoc = await transaction.get(centralAccountRef);
    
    let tempSucursalBalance = sucursalData.currentBalance;
    let tempCentralTotalBranchBalance = centralAccountDoc.exists() ? centralAccountDoc.data().totalBranchBalance : 0;
    
    // Revert old amount from sucursal
    if (oldTransaction.type === 'deposit') tempSucursalBalance -= oldTransaction.amount;
    else if (oldTransaction.type === 'expense') tempSucursalBalance += oldTransaction.amount;
    
    // Revert old amount from central account total
    if (oldTransaction.type === 'deposit') tempCentralTotalBranchBalance -= oldTransaction.amount;
    else if (oldTransaction.type === 'expense') tempCentralTotalBranchBalance += oldTransaction.amount;

    // --- Step 2: Apply the new transaction's financial impact ---
    const newAmount = newTransactionData.amount ?? oldTransaction.amount;
    const newType = newTransactionData.type ?? oldTransaction.type;
    
    // Apply new amount to sucursal
    if (newType === 'deposit') tempSucursalBalance += newAmount;
    else if (newType === 'expense') tempSucursalBalance -= newAmount;
    
    // Apply new amount to central account total
    if (newType === 'deposit') tempCentralTotalBranchBalance += newAmount;
    else if (newType === 'expense') tempCentralTotalBranchBalance -= newAmount;
    
    // --- Step 3: Write all changes ---
    transaction.update(sucursalRef, { currentBalance: tempSucursalBalance });
    if (centralAccountDoc.exists()) {
        transaction.update(centralAccountRef, { totalBranchBalance: tempCentralTotalBranchBalance });
    }
    
    // Update the transaction document itself
    const dataToUpdate: any = { ...newTransactionData };
    if (newTransactionData.date) {
        dataToUpdate.date = Timestamp.fromDate(new Date(newTransactionData.date));
    }
    transaction.update(transactionRef, dataToUpdate);
  });
}
