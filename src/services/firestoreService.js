import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

// ============================================
// TRANSACTIONS
// ============================================

export const addTransaction = async (userId, transactionData) => {
  try {
    const transactionRef = await addDoc(collection(db, 'transactions'), {
      userId,
      ...transactionData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return transactionRef.id;
  } catch (error) {
    console.error('Error adding transaction:', error);
    throw error;
  }
};

export const getTransactions = async (userId) => {
  try {
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting transactions:', error);
    throw error;
  }
};

export const updateTransaction = async (transactionId, updates) => {
  try {
    const transactionRef = doc(db, 'transactions', transactionId);
    await updateDoc(transactionRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    throw error;
  }
};

export const deleteTransaction = async (transactionId) => {
  try {
    await deleteDoc(doc(db, 'transactions', transactionId));
  } catch (error) {
    console.error('Error deleting transaction:', error);
    throw error;
  }
};

// ============================================
// PORTFOLIO
// ============================================

export const savePortfolio = async (userId, portfolioData) => {
  try {
    const portfolioRef = doc(db, 'portfolios', userId);
    await updateDoc(portfolioRef, {
      assets: portfolioData,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    // If document doesn't exist, create it
    try {
      await addDoc(collection(db, 'portfolios'), {
        userId,
        assets: portfolioData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    } catch (createError) {
      console.error('Error creating portfolio:', createError);
      throw createError;
    }
  }
};

export const getPortfolio = async (userId) => {
  try {
    const q = query(
      collection(db, 'portfolios'),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const portfolioDoc = querySnapshot.docs[0];
    return {
      id: portfolioDoc.id,
      ...portfolioDoc.data()
    };
  } catch (error) {
    console.error('Error getting portfolio:', error);
    throw error;
  }
};

// ============================================
// BULK IMPORT (CSV)
// ============================================

export const bulkImportTransactions = async (userId, transactions) => {
  try {
    const promises = transactions.map(transaction =>
      addTransaction(userId, transaction)
    );
    await Promise.all(promises);
    return true;
  } catch (error) {
    console.error('Error bulk importing transactions:', error);
    throw error;
  }
};

// ============================================
// PRICES CACHE (optional - for caching API results)
// ============================================

export const savePriceCache = async (ticker, priceData) => {
  try {
    const cacheRef = doc(db, 'priceCache', ticker);
    await updateDoc(cacheRef, {
      ...priceData,
      timestamp: Timestamp.now()
    });
  } catch (error) {
    try {
      await addDoc(collection(db, 'priceCache'), {
        ticker,
        ...priceData,
        timestamp: Timestamp.now()
      });
    } catch (createError) {
      console.error('Error saving price cache:', createError);
    }
  }
};

export const getPriceCache = async (ticker, maxAgeMinutes = 15) => {
  try {
    const cacheRef = doc(db, 'priceCache', ticker);
    const cacheDoc = await getDoc(cacheRef);

    if (!cacheDoc.exists()) {
      return null;
    }

    const data = cacheDoc.data();
    const now = Date.now();
    const cacheTime = data.timestamp.toMillis();
    const ageMinutes = (now - cacheTime) / 1000 / 60;

    if (ageMinutes > maxAgeMinutes) {
      return null; // Cache expired
    }

    return data;
  } catch (error) {
    console.error('Error getting price cache:', error);
    return null;
  }
};
