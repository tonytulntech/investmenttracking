import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getTransactions, getPortfolio } from '../../services/firestoreService';
import { fetchMultiplePrices } from '../../services/yahooFinance';
import { fetchMultipleCryptoPrices, isCrypto } from '../../services/coinGecko';
import { Search, Filter, ArrowUpDown, RefreshCw, Loader } from 'lucide-react';

function Portfolio() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [portfolio, setPortfolio] = useState([]);
  const [filteredPortfolio, setFilteredPortfolio] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [sortBy, setSortBy] = useState('marketValue');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    loadPortfolio();
  }, [currentUser]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [portfolio, searchTerm, filterClass, filterPlatform, sortBy, sortOrder]);

  const loadPortfolio = async () => {
    try {
      setLoading(true);
      const [transactionsData, portfolioData] = await Promise.all([
        getTransactions(currentUser.uid),
        getPortfolio(currentUser.uid)
      ]);

      let portfolioAssets;
      if (portfolioData && portfolioData.assets) {
        portfolioAssets = portfolioData.assets;
      } else {
        portfolioAssets = calculatePortfolioFromTransactions(transactionsData || []);
      }

      await updatePrices(portfolioAssets);
    } catch (error) {
      console.error('Error loading portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePortfolioFromTransactions = (transactions) => {
    const holdings = {};

    transactions.forEach(tx => {
      const { ticker, type, quantity, price, assetClass, platform } = tx;

      if (!holdings[ticker]) {
        holdings[ticker] = {
          ticker,
          quantity: 0,
          totalCost: 0,
          assetClass: assetClass || 'Unknown',
          platform: platform || 'Unknown',
          name: tx.name || ticker
        };
      }

      if (type === 'buy') {
        holdings[ticker].quantity += quantity;
        holdings[ticker].totalCost += quantity * price;
      } else if (type === 'sell') {
        holdings[ticker].quantity -= quantity;
        holdings[ticker].totalCost -= quantity * price;
      }
    });

    return Object.values(holdings)
      .filter(h => h.quantity > 0)
      .map(h => ({
        ...h,
        avgPrice: h.totalCost / h.quantity
      }));
  };

  const updatePrices = async (portfolioAssets) => {
    try {
      setRefreshing(true);

      const stockTickers = [];
      const cryptoSymbols = [];

      portfolioAssets.forEach(asset => {
        if (isCrypto(asset.ticker)) {
          cryptoSymbols.push(asset.ticker);
        } else {
          stockTickers.push(asset.ticker);
        }
      });

      const [stockPrices, cryptoPrices] = await Promise.all([
        stockTickers.length > 0 ? fetchMultiplePrices(stockTickers) : Promise.resolve({}),
        cryptoSymbols.length > 0 ? fetchMultipleCryptoPrices(cryptoSymbols) : Promise.resolve({})
      ]);

      const allPrices = { ...stockPrices, ...cryptoPrices };

      const updatedPortfolio = portfolioAssets.map(asset => {
        const priceData = allPrices[asset.ticker];
        const currentPrice = priceData && !priceData.error ? priceData.price : asset.avgPrice;
        const marketValue = currentPrice * asset.quantity;
        const totalCost = asset.avgPrice * asset.quantity;
        const unrealizedPL = marketValue - totalCost;
        const roi = totalCost > 0 ? (unrealizedPL / totalCost) * 100 : 0;

        return {
          ...asset,
          currentPrice,
          marketValue,
          totalCost,
          unrealizedPL,
          roi,
          dayChange: priceData ? priceData.change : 0,
          dayChangePercent: priceData ? priceData.changePercent : 0
        };
      });

      setPortfolio(updatedPortfolio);
    } catch (error) {
      console.error('Error updating prices:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...portfolio];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(asset =>
        asset.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (asset.name && asset.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Asset class filter
    if (filterClass !== 'all') {
      filtered = filtered.filter(asset => asset.assetClass === filterClass);
    }

    // Platform filter
    if (filterPlatform !== 'all') {
      filtered = filtered.filter(asset => asset.platform === filterPlatform);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredPortfolio(filtered);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleRefresh = () => {
    if (portfolio.length > 0) {
      updatePrices(portfolio);
    }
  };

  // Get unique values for filters
  const assetClasses = ['all', ...new Set(portfolio.map(a => a.assetClass))];
  const platforms = ['all', ...new Set(portfolio.map(a => a.platform))];

  if (loading) {
    return (
      <div className="portfolio loading">
        <Loader className="spinner" size={48} />
        <p>Caricamento portfolio...</p>
      </div>
    );
  }

  return (
    <div className="portfolio">
      <div className="portfolio-header">
        <h2>Il Mio Portfolio</h2>
        <button
          onClick={handleRefresh}
          className="refresh-btn"
          disabled={refreshing}
        >
          <RefreshCw className={refreshing ? 'spinning' : ''} size={20} />
          {refreshing ? 'Aggiornamento...' : 'Aggiorna'}
        </button>
      </div>

      {/* Filters */}
      <div className="filters">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Cerca ticker o nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <Filter size={20} />
          <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
            {assetClasses.map(cls => (
              <option key={cls} value={cls}>
                {cls === 'all' ? 'Tutte le classi' : cls}
              </option>
            ))}
          </select>

          <select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)}>
            {platforms.map(platform => (
              <option key={platform} value={platform}>
                {platform === 'all' ? 'Tutte le piattaforme' : platform}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Portfolio Table */}
      <div className="portfolio-table">
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort('ticker')}>
                Ticker <ArrowUpDown size={16} />
              </th>
              <th onClick={() => handleSort('name')}>
                Nome <ArrowUpDown size={16} />
              </th>
              <th onClick={() => handleSort('assetClass')}>
                Classe <ArrowUpDown size={16} />
              </th>
              <th onClick={() => handleSort('platform')}>
                Piattaforma <ArrowUpDown size={16} />
              </th>
              <th onClick={() => handleSort('quantity')}>
                Quantità <ArrowUpDown size={16} />
              </th>
              <th onClick={() => handleSort('avgPrice')}>
                Prezzo Medio <ArrowUpDown size={16} />
              </th>
              <th onClick={() => handleSort('currentPrice')}>
                Prezzo Attuale <ArrowUpDown size={16} />
              </th>
              <th onClick={() => handleSort('marketValue')}>
                Valore <ArrowUpDown size={16} />
              </th>
              <th onClick={() => handleSort('unrealizedPL')}>
                P/L <ArrowUpDown size={16} />
              </th>
              <th onClick={() => handleSort('roi')}>
                ROI % <ArrowUpDown size={16} />
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredPortfolio.map((asset, index) => (
              <tr key={index}>
                <td><strong>{asset.ticker}</strong></td>
                <td>{asset.name || '-'}</td>
                <td><span className="badge">{asset.assetClass}</span></td>
                <td>{asset.platform}</td>
                <td>{asset.quantity.toFixed(4)}</td>
                <td>€{asset.avgPrice.toFixed(2)}</td>
                <td>€{asset.currentPrice.toFixed(2)}</td>
                <td>€{asset.marketValue.toFixed(2)}</td>
                <td className={asset.unrealizedPL >= 0 ? 'positive' : 'negative'}>
                  €{asset.unrealizedPL.toFixed(2)}
                </td>
                <td className={asset.roi >= 0 ? 'positive' : 'negative'}>
                  {asset.roi.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredPortfolio.length === 0 && (
          <div className="empty-state">
            <p>Nessun asset trovato</p>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="portfolio-summary">
        <div className="summary-item">
          <span>Totale Assets:</span>
          <strong>{filteredPortfolio.length}</strong>
        </div>
        <div className="summary-item">
          <span>Valore Totale:</span>
          <strong>
            €{filteredPortfolio.reduce((sum, a) => sum + a.marketValue, 0).toFixed(2)}
          </strong>
        </div>
        <div className="summary-item">
          <span>P/L Totale:</span>
          <strong className={
            filteredPortfolio.reduce((sum, a) => sum + a.unrealizedPL, 0) >= 0
              ? 'positive'
              : 'negative'
          }>
            €{filteredPortfolio.reduce((sum, a) => sum + a.unrealizedPL, 0).toFixed(2)}
          </strong>
        </div>
      </div>
    </div>
  );
}

export default Portfolio;
