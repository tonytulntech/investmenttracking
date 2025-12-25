import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getTransactions, getPortfolio } from '../../services/firestoreService';
import { fetchMultiplePrices } from '../../services/yahooFinance';
import { fetchMultipleCryptoPrices, isCrypto } from '../../services/coinGecko';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, PieChart as PieChartIcon,
  RefreshCw, Loader
} from 'lucide-react';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

function Dashboard() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [metrics, setMetrics] = useState({
    totalValue: 0,
    totalCost: 0,
    totalPL: 0,
    totalROI: 0,
    dayChange: 0,
    dayChangePercent: 0
  });

  // Load data on mount
  useEffect(() => {
    loadDashboardData();
  }, [currentUser]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load transactions and portfolio from Firestore
      const [transactionsData, portfolioData] = await Promise.all([
        getTransactions(currentUser.uid),
        getPortfolio(currentUser.uid)
      ]);

      setTransactions(transactionsData || []);

      if (portfolioData && portfolioData.assets) {
        await updatePricesAndCalculate(portfolioData.assets);
      } else {
        // If no portfolio exists, calculate from transactions
        const calculatedPortfolio = calculatePortfolioFromTransactions(transactionsData || []);
        await updatePricesAndCalculate(calculatedPortfolio);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePricesAndCalculate = async (portfolioAssets) => {
    try {
      setRefreshing(true);

      // Separate stocks/ETFs from crypto
      const stockTickers = [];
      const cryptoSymbols = [];

      portfolioAssets.forEach(asset => {
        if (isCrypto(asset.ticker)) {
          cryptoSymbols.push(asset.ticker);
        } else {
          stockTickers.push(asset.ticker);
        }
      });

      // Fetch prices in parallel
      const [stockPrices, cryptoPrices] = await Promise.all([
        stockTickers.length > 0 ? fetchMultiplePrices(stockTickers) : Promise.resolve({}),
        cryptoSymbols.length > 0 ? fetchMultipleCryptoPrices(cryptoSymbols) : Promise.resolve({})
      ]);

      // Combine prices
      const allPrices = { ...stockPrices, ...cryptoPrices };

      // Update portfolio with latest prices
      const updatedPortfolio = portfolioAssets.map(asset => {
        const priceData = allPrices[asset.ticker];
        const currentPrice = priceData && !priceData.error ? priceData.price : asset.lastPrice || asset.avgPrice;

        const marketValue = currentPrice * asset.quantity;
        const totalCost = asset.avgPrice * asset.quantity;
        const unrealizedPL = marketValue - totalCost;
        const roi = (unrealizedPL / totalCost) * 100;

        return {
          ...asset,
          currentPrice,
          marketValue,
          unrealizedPL,
          roi,
          dayChange: priceData ? priceData.change : 0,
          dayChangePercent: priceData ? priceData.changePercent : 0
        };
      });

      setPortfolio(updatedPortfolio);
      calculateMetrics(updatedPortfolio);
    } catch (error) {
      console.error('Error updating prices:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const calculatePortfolioFromTransactions = (transactionsData) => {
    const holdings = {};

    transactionsData.forEach(tx => {
      const { ticker, type, quantity, price } = tx;

      if (!holdings[ticker]) {
        holdings[ticker] = {
          ticker,
          quantity: 0,
          totalCost: 0,
          assetClass: tx.assetClass || 'Unknown',
          platform: tx.platform || 'Unknown'
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

    // Convert to array and calculate average price
    return Object.values(holdings)
      .filter(h => h.quantity > 0)
      .map(h => ({
        ...h,
        avgPrice: h.totalCost / h.quantity,
        lastPrice: h.avgPrice // Will be updated by price fetch
      }));
  };

  const calculateMetrics = (portfolioData) => {
    const totalValue = portfolioData.reduce((sum, asset) => sum + asset.marketValue, 0);
    const totalCost = portfolioData.reduce((sum, asset) => sum + (asset.avgPrice * asset.quantity), 0);
    const totalPL = totalValue - totalCost;
    const totalROI = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;

    const dayChange = portfolioData.reduce((sum, asset) =>
      sum + (asset.dayChange || 0) * asset.quantity, 0
    );
    const dayChangePercent = totalValue > 0 ? (dayChange / (totalValue - dayChange)) * 100 : 0;

    setMetrics({
      totalValue,
      totalCost,
      totalPL,
      totalROI,
      dayChange,
      dayChangePercent
    });
  };

  const handleRefresh = () => {
    if (portfolio.length > 0) {
      updatePricesAndCalculate(portfolio);
    }
  };

  // Prepare chart data
  const assetAllocationData = portfolio.reduce((acc, asset) => {
    const existing = acc.find(item => item.name === asset.assetClass);
    if (existing) {
      existing.value += asset.marketValue;
    } else {
      acc.push({ name: asset.assetClass, value: asset.marketValue });
    }
    return acc;
  }, []);

  const performanceData = portfolio
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 10)
    .map(asset => ({
      name: asset.ticker,
      roi: asset.roi,
      pl: asset.unrealizedPL
    }));

  if (loading) {
    return (
      <div className="dashboard loading">
        <Loader className="spinner" size={48} />
        <p>Caricamento dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Dashboard Portfolio</h2>
        <button
          onClick={handleRefresh}
          className="refresh-btn"
          disabled={refreshing}
        >
          <RefreshCw className={refreshing ? 'spinning' : ''} size={20} />
          {refreshing ? 'Aggiornamento...' : 'Aggiorna Prezzi'}
        </button>
      </div>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">
            <DollarSign size={24} />
          </div>
          <div className="metric-content">
            <p className="metric-label">Valore Totale</p>
            <p className="metric-value">€{metrics.totalValue.toFixed(2)}</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">
            <TrendingUp size={24} />
          </div>
          <div className="metric-content">
            <p className="metric-label">P/L Non Realizzato</p>
            <p className={`metric-value ${metrics.totalPL >= 0 ? 'positive' : 'negative'}`}>
              €{metrics.totalPL.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">
            <PieChartIcon size={24} />
          </div>
          <div className="metric-content">
            <p className="metric-label">ROI</p>
            <p className={`metric-value ${metrics.totalROI >= 0 ? 'positive' : 'negative'}`}>
              {metrics.totalROI.toFixed(2)}%
            </p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">
            {metrics.dayChange >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
          </div>
          <div className="metric-content">
            <p className="metric-label">Variazione Giornaliera</p>
            <p className={`metric-value ${metrics.dayChange >= 0 ? 'positive' : 'negative'}`}>
              €{metrics.dayChange.toFixed(2)} ({metrics.dayChangePercent.toFixed(2)}%)
            </p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        {/* Asset Allocation */}
        <div className="chart-card">
          <h3>Allocazione per Classe</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={assetAllocationData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => `${entry.name}: €${entry.value.toFixed(0)}`}
              >
                {assetAllocationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `€${value.toFixed(2)}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Performance */}
        <div className="chart-card">
          <h3>Top 10 Performance (ROI %)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `${value.toFixed(2)}%`} />
              <Legend />
              <Bar dataKey="roi" fill="#8b5cf6" name="ROI %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Holdings */}
      <div className="holdings-section">
        <h3>Top Holdings</h3>
        <div className="holdings-table">
          <table>
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Classe</th>
                <th>Quantità</th>
                <th>Valore</th>
                <th>P/L</th>
                <th>ROI</th>
              </tr>
            </thead>
            <tbody>
              {portfolio
                .sort((a, b) => b.marketValue - a.marketValue)
                .slice(0, 10)
                .map((asset, index) => (
                  <tr key={index}>
                    <td><strong>{asset.ticker}</strong></td>
                    <td>{asset.assetClass}</td>
                    <td>{asset.quantity.toFixed(4)}</td>
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
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
