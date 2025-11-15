import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getTransactions, addTransaction, deleteTransaction } from '../../services/firestoreService';
import { format } from 'date-fns';
import { Plus, Trash2, Filter, Search, Loader } from 'lucide-react';
import ManualEntry from './ManualEntry';

function TransactionsList() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterClass, setFilterClass] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, [currentUser]);

  useEffect(() => {
    applyFilters();
  }, [transactions, searchTerm, filterType, filterClass]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const data = await getTransactions(currentUser.uid);
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(tx =>
        tx.ticker?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.platform?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(tx => tx.type === filterType);
    }

    // Asset class filter
    if (filterClass !== 'all') {
      filtered = filtered.filter(tx => tx.assetClass === filterClass);
    }

    setFilteredTransactions(filtered);
  };

  const handleAddTransaction = async (transactionData) => {
    try {
      await addTransaction(currentUser.uid, transactionData);
      await loadTransactions();
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('Errore nell\'aggiungere la transazione');
    }
  };

  const handleDeleteTransaction = async (transactionId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questa transazione?')) {
      return;
    }

    try {
      await deleteTransaction(transactionId);
      await loadTransactions();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Errore nell\'eliminare la transazione');
    }
  };

  const formatDate = (dateString) => {
    try {
      if (dateString.seconds) {
        // Firestore Timestamp
        return format(new Date(dateString.seconds * 1000), 'dd/MM/yyyy');
      }
      return format(new Date(dateString), 'dd/MM/yyyy');
    } catch (error) {
      return dateString;
    }
  };

  // Get unique values for filters
  const assetClasses = ['all', ...new Set(transactions.map(tx => tx.assetClass).filter(Boolean))];

  if (loading) {
    return (
      <div className="transactions loading">
        <Loader className="spinner" size={48} />
        <p>Caricamento transazioni...</p>
      </div>
    );
  }

  return (
    <div className="transactions">
      <div className="transactions-header">
        <h2>Storico Transazioni</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary"
        >
          <Plus size={20} />
          {showAddForm ? 'Annulla' : 'Nuova Transazione'}
        </button>
      </div>

      {/* Add Transaction Form */}
      {showAddForm && (
        <div className="add-transaction-form">
          <ManualEntry onSubmit={handleAddTransaction} onCancel={() => setShowAddForm(false)} />
        </div>
      )}

      {/* Filters */}
      <div className="filters">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Cerca ticker, nome o piattaforma..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <Filter size={20} />
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">Tutti i tipi</option>
            <option value="buy">Acquisto</option>
            <option value="sell">Vendita</option>
            <option value="deposit">Deposito</option>
            <option value="withdrawal">Prelievo</option>
          </select>

          <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
            {assetClasses.map(cls => (
              <option key={cls} value={cls}>
                {cls === 'all' ? 'Tutte le classi' : cls}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="transactions-table">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Ticker</th>
              <th>Nome</th>
              <th>Classe</th>
              <th>Piattaforma</th>
              <th>Quantità</th>
              <th>Prezzo</th>
              <th>Totale</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map((tx) => (
              <tr key={tx.id}>
                <td>{formatDate(tx.date)}</td>
                <td>
                  <span className={`badge badge-${tx.type}`}>
                    {tx.type === 'buy' ? 'Acquisto' :
                     tx.type === 'sell' ? 'Vendita' :
                     tx.type === 'deposit' ? 'Deposito' : 'Prelievo'}
                  </span>
                </td>
                <td><strong>{tx.ticker || '-'}</strong></td>
                <td>{tx.name || '-'}</td>
                <td>{tx.assetClass || '-'}</td>
                <td>{tx.platform || '-'}</td>
                <td>{tx.quantity ? tx.quantity.toFixed(4) : '-'}</td>
                <td>{tx.price ? `€${tx.price.toFixed(2)}` : '-'}</td>
                <td>
                  <strong>
                    {tx.quantity && tx.price
                      ? `€${(tx.quantity * tx.price).toFixed(2)}`
                      : tx.amount
                      ? `€${tx.amount.toFixed(2)}`
                      : '-'}
                  </strong>
                </td>
                <td>
                  <button
                    onClick={() => handleDeleteTransaction(tx.id)}
                    className="btn-delete"
                    title="Elimina transazione"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredTransactions.length === 0 && (
          <div className="empty-state">
            <p>Nessuna transazione trovata</p>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="transactions-summary">
        <div className="summary-item">
          <span>Totale Transazioni:</span>
          <strong>{filteredTransactions.length}</strong>
        </div>
        <div className="summary-item">
          <span>Acquisti:</span>
          <strong>{filteredTransactions.filter(tx => tx.type === 'buy').length}</strong>
        </div>
        <div className="summary-item">
          <span>Vendite:</span>
          <strong>{filteredTransactions.filter(tx => tx.type === 'sell').length}</strong>
        </div>
        <div className="summary-item">
          <span>Totale Investito:</span>
          <strong>
            €{filteredTransactions
              .filter(tx => tx.type === 'buy')
              .reduce((sum, tx) => sum + (tx.quantity * tx.price || 0), 0)
              .toFixed(2)}
          </strong>
        </div>
      </div>
    </div>
  );
}

export default TransactionsList;
