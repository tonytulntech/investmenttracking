import React, { useState } from 'react';
import { Calendar, DollarSign, Hash, Tag, Building2 } from 'lucide-react';

function ManualEntry({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'buy',
    ticker: '',
    name: '',
    assetClass: 'ETF',
    platform: 'Fineco',
    quantity: '',
    price: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.date) {
      newErrors.date = 'Data richiesta';
    }

    if (!formData.type) {
      newErrors.type = 'Tipo richiesto';
    }

    // For buy/sell, require ticker, quantity, and price
    if (formData.type === 'buy' || formData.type === 'sell') {
      if (!formData.ticker.trim()) {
        newErrors.ticker = 'Ticker richiesto';
      }

      if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
        newErrors.quantity = 'Quantità deve essere > 0';
      }

      if (!formData.price || parseFloat(formData.price) <= 0) {
        newErrors.price = 'Prezzo deve essere > 0';
      }

      if (!formData.assetClass) {
        newErrors.assetClass = 'Classe richiesta';
      }
    }

    if (!formData.platform) {
      newErrors.platform = 'Piattaforma richiesta';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    // Convert string values to numbers
    const transaction = {
      ...formData,
      quantity: formData.quantity ? parseFloat(formData.quantity) : null,
      price: formData.price ? parseFloat(formData.price) : null,
      ticker: formData.ticker.toUpperCase().trim()
    };

    onSubmit(transaction);
  };

  return (
    <form onSubmit={handleSubmit} className="manual-entry-form">
      <h3>Nuova Transazione</h3>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="date">
            <Calendar size={18} />
            Data *
          </label>
          <input
            id="date"
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            max={new Date().toISOString().split('T')[0]}
          />
          {errors.date && <span className="error">{errors.date}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="type">
            <Tag size={18} />
            Tipo *
          </label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
          >
            <option value="buy">Acquisto</option>
            <option value="sell">Vendita</option>
            <option value="deposit">Deposito</option>
            <option value="withdrawal">Prelievo</option>
          </select>
          {errors.type && <span className="error">{errors.type}</span>}
        </div>
      </div>

      {(formData.type === 'buy' || formData.type === 'sell') && (
        <>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="ticker">
                <Tag size={18} />
                Ticker *
              </label>
              <input
                id="ticker"
                type="text"
                name="ticker"
                value={formData.ticker}
                onChange={handleChange}
                placeholder="VWCE.DE"
              />
              {errors.ticker && <span className="error">{errors.ticker}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="name">
                Nome
              </label>
              <input
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Nome asset (opzionale)"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="assetClass">
                <Tag size={18} />
                Classe Asset *
              </label>
              <select
                id="assetClass"
                name="assetClass"
                value={formData.assetClass}
                onChange={handleChange}
              >
                <option value="ETF">ETF</option>
                <option value="Stock">Stock</option>
                <option value="Crypto">Crypto</option>
                <option value="Bond">Bond</option>
                <option value="Cash">Cash</option>
                <option value="Other">Other</option>
              </select>
              {errors.assetClass && <span className="error">{errors.assetClass}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="platform">
                <Building2 size={18} />
                Piattaforma *
              </label>
              <select
                id="platform"
                name="platform"
                value={formData.platform}
                onChange={handleChange}
              >
                <option value="Fineco">Fineco</option>
                <option value="Binance">Binance</option>
                <option value="Nexo">Nexo</option>
                <option value="Crypto">Crypto.com</option>
                <option value="BBVA">BBVA</option>
                <option value="Kraken">Kraken</option>
                <option value="Other">Other</option>
              </select>
              {errors.platform && <span className="error">{errors.platform}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="quantity">
                <Hash size={18} />
                Quantità *
              </label>
              <input
                id="quantity"
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                placeholder="0.0000"
                step="0.0001"
                min="0"
              />
              {errors.quantity && <span className="error">{errors.quantity}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="price">
                <DollarSign size={18} />
                Prezzo (€) *
              </label>
              <input
                id="price"
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
              {errors.price && <span className="error">{errors.price}</span>}
            </div>
          </div>

          {formData.quantity && formData.price && (
            <div className="total-preview">
              <strong>Totale: €{(parseFloat(formData.quantity) * parseFloat(formData.price)).toFixed(2)}</strong>
            </div>
          )}
        </>
      )}

      <div className="form-group">
        <label htmlFor="notes">
          Note
        </label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Note aggiuntive (opzionale)"
          rows="3"
        />
      </div>

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Annulla
        </button>
        <button type="submit" className="btn-primary">
          Salva Transazione
        </button>
      </div>
    </form>
  );
}

export default ManualEntry;
