// Debug script to check cash transactions
const fs = require('fs');

// This would normally read from localStorage, but we'll create a simple test
console.log('=== DEBUG CASH TRANSACTIONS ===\n');

// Sample code to paste in browser console:
console.log(`
Paste this in your browser console to debug cash transactions:

const transactions = JSON.parse(localStorage.getItem('investment_transactions') || '[]');
const cashTransactions = transactions.filter(tx =>
  tx.macroCategory === 'Cash' ||
  tx.category === 'Cash' ||
  tx.isCash === true ||
  tx.ticker === 'CASH'
);

console.log('Total transactions:', transactions.length);
console.log('Cash transactions:', cashTransactions.length);
console.log('Cash transactions details:');
cashTransactions.forEach((tx, i) => {
  console.log(\`\${i + 1}. Ticker: \${tx.ticker}, MacroCategory: \${tx.macroCategory}, Category: \${tx.category}, isCash: \${tx.isCash}\`);
});

// Check portfolio
const portfolio = JSON.parse(localStorage.getItem('investment_portfolio') || '[]');
const cashHolding = portfolio.find(p => p.ticker === 'CASH' || p.isCash);
console.log('\\nCash holding in portfolio:', cashHolding);
`);
