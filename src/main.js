// Investment Portfolio Tracker - Main Entry Point
import './styles/main.css';
import { init } from './app.js';

// Initialize the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Handle hot module replacement in development
if (import.meta.hot) {
    import.meta.hot.accept();
}
