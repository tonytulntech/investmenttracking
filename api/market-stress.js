// Calo del benchmark mondiale negli ultimi 60 giorni (per il raffreddamento di 7 giorni). Cache 1 ora, condivisa.
import { fetchBenchmarkDrawdown } from '../src/services/stressSources.js';

export default async function handler(req, res) {
  try {
    const data = await fetchBenchmarkDrawdown(fetch);
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=21600');
    return res.status(200).json(data);
  } catch (err) {
    res.setHeader('Cache-Control', 's-maxage=60');
    return res.status(502).json({ error: err.message, attempts: err.attempts ?? [] });
  }
}
