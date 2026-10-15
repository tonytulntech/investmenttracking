// Proxy cacheato per l'inflazione italiana (IPCA): prova BCE, poi Eurostat.
// Una sola chiamata al giorno serve tutti gli utenti. In caso di errore restituisce il motivo di ogni tentativo.
import { fetchInflationSeries } from '../src/services/inflationSources.js';

export default async function handler(req, res) {
  try {
    const { monthly, annual, source, attempts } = await fetchInflationSeries(fetch);
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).json({ monthly, annual, source, attempts });
  } catch (err) {
    res.setHeader('Cache-Control', 's-maxage=300');
    return res.status(502).json({ error: err.message, attempts: err.attempts ?? [] });
  }
}
