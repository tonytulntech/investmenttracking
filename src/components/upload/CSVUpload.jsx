import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { bulkImportTransactions } from '../../services/firestoreService';
import Papa from 'papaparse';
import { Upload, FileText, CheckCircle, AlertCircle, Download } from 'lucide-react';

function CSVUpload() {
  const { currentUser } = useAuth();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState([]);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        alert('Per favore seleziona un file CSV');
        return;
      }
      setFile(selectedFile);
      previewCSV(selectedFile);
    }
  };

  const previewCSV = (file) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      preview: 5, // Show only first 5 rows
      complete: (results) => {
        setPreview(results.data);
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        alert('Errore nel leggere il file CSV');
      }
    });
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Seleziona un file prima');
      return;
    }

    setUploading(true);
    setResult(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const transactions = results.data.map(row => ({
            date: row.Date || row.date || row.DATA || new Date().toISOString(),
            type: (row.Type || row.type || row.TIPO || 'buy').toLowerCase(),
            ticker: (row.Ticker || row.ticker || row.TICKER || '').toUpperCase().trim(),
            name: row.Name || row.name || row.NOME || '',
            assetClass: row['Asset Class'] || row.assetClass || row['CLASSE ASSET'] || 'Unknown',
            platform: row.Platform || row.platform || row.PIATTAFORMA || 'Unknown',
            quantity: parseFloat(row.Quantity || row.quantity || row.QUANTITA || 0),
            price: parseFloat(row.Price || row.price || row.PREZZO || 0),
            notes: row.Notes || row.notes || row.NOTE || ''
          }));

          // Filter out invalid transactions
          const validTransactions = transactions.filter(tx =>
            tx.ticker && tx.quantity > 0 && tx.price > 0
          );

          if (validTransactions.length === 0) {
            throw new Error('Nessuna transazione valida trovata nel CSV');
          }

          // Bulk import to Firestore
          await bulkImportTransactions(currentUser.uid, validTransactions);

          setResult({
            success: true,
            message: `${validTransactions.length} transazioni importate con successo!`,
            total: results.data.length,
            imported: validTransactions.length,
            skipped: results.data.length - validTransactions.length
          });

          setFile(null);
          setPreview([]);
        } catch (error) {
          console.error('Error importing transactions:', error);
          setResult({
            success: false,
            message: `Errore: ${error.message}`
          });
        } finally {
          setUploading(false);
        }
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        setResult({
          success: false,
          message: `Errore nel leggere il CSV: ${error.message}`
        });
        setUploading(false);
      }
    });
  };

  const downloadTemplate = () => {
    const template = `Date,Type,Ticker,Name,Asset Class,Platform,Quantity,Price,Notes
2025-01-15,buy,VWCE.DE,Vanguard FTSE All-World,ETF,Fineco,10.5,98.50,First purchase
2025-01-20,buy,BTC,Bitcoin,Crypto,Binance,0.005,40000.00,Long term hold
2025-02-01,sell,VWCE.DE,Vanguard FTSE All-World,ETF,Fineco,2.0,100.00,Partial sale`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="csv-upload">
      <div className="upload-header">
        <h2>Carica Transazioni da CSV</h2>
        <p>Importa le tue transazioni in blocco da un file CSV</p>
      </div>

      {/* Instructions */}
      <div className="upload-instructions">
        <h3>Come usare:</h3>
        <ol>
          <li>Scarica il template CSV di esempio</li>
          <li>Compila il CSV con le tue transazioni</li>
          <li>Carica il file usando il pulsante qui sotto</li>
          <li>Verifica l'anteprima e conferma l'importazione</li>
        </ol>

        <button onClick={downloadTemplate} className="btn-secondary">
          <Download size={20} />
          Scarica Template CSV
        </button>
      </div>

      {/* CSV Format */}
      <div className="csv-format">
        <h3>Formato CSV Richiesto:</h3>
        <table>
          <thead>
            <tr>
              <th>Colonna</th>
              <th>Obbligatorio</th>
              <th>Esempio</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>Date</code></td>
              <td>Sì</td>
              <td>2025-01-15</td>
              <td>Formato YYYY-MM-DD</td>
            </tr>
            <tr>
              <td><code>Type</code></td>
              <td>Sì</td>
              <td>buy, sell, deposit, withdrawal</td>
              <td>Tipo transazione</td>
            </tr>
            <tr>
              <td><code>Ticker</code></td>
              <td>Sì</td>
              <td>VWCE.DE, BTC</td>
              <td>Simbolo ticker</td>
            </tr>
            <tr>
              <td><code>Name</code></td>
              <td>No</td>
              <td>Vanguard FTSE All-World</td>
              <td>Nome asset</td>
            </tr>
            <tr>
              <td><code>Asset Class</code></td>
              <td>Sì</td>
              <td>ETF, Stock, Crypto, Bond</td>
              <td>Classe asset</td>
            </tr>
            <tr>
              <td><code>Platform</code></td>
              <td>Sì</td>
              <td>Fineco, Binance, BBVA</td>
              <td>Piattaforma</td>
            </tr>
            <tr>
              <td><code>Quantity</code></td>
              <td>Sì</td>
              <td>10.5, 0.005</td>
              <td>Quantità</td>
            </tr>
            <tr>
              <td><code>Price</code></td>
              <td>Sì</td>
              <td>98.50, 40000.00</td>
              <td>Prezzo unitario in EUR</td>
            </tr>
            <tr>
              <td><code>Notes</code></td>
              <td>No</td>
              <td>First purchase</td>
              <td>Note opzionali</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* File Upload */}
      <div className="upload-section">
        <div className="file-input-wrapper">
          <input
            type="file"
            id="csv-file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <label htmlFor="csv-file" className="file-input-label">
            <Upload size={24} />
            {file ? file.name : 'Seleziona file CSV'}
          </label>
        </div>

        {file && (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="btn-primary upload-btn"
          >
            {uploading ? 'Caricamento...' : 'Importa Transazioni'}
          </button>
        )}
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div className="preview-section">
          <h3>
            <FileText size={20} />
            Anteprima (prime 5 righe)
          </h3>
          <div className="preview-table">
            <table>
              <thead>
                <tr>
                  {Object.keys(preview[0]).map(key => (
                    <th key={key}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, index) => (
                  <tr key={index}>
                    {Object.values(row).map((value, i) => (
                      <td key={i}>{value}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`result ${result.success ? 'success' : 'error'}`}>
          {result.success ? (
            <CheckCircle size={24} />
          ) : (
            <AlertCircle size={24} />
          )}
          <div className="result-content">
            <p className="result-message">{result.message}</p>
            {result.success && (
              <div className="result-stats">
                <span>Totale righe: {result.total}</span>
                <span>Importate: {result.imported}</span>
                {result.skipped > 0 && <span>Saltate: {result.skipped}</span>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CSVUpload;
