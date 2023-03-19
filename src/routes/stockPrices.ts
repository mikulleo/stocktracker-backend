// WOX1T2MRIHWYHG8G API key alpha vantage
// cgb21ahr01ql0m8ri9ngcgb21ahr01ql0m8ri9o0 - API key finhub

import express from 'express';
import finnhub from 'finnhub';
//import fetch from "node-fetch";
const router = express.Router();

const api_key_const = process.env.FINNHUB_API_KEY || 'cgb21ahr01ql0m8ri9ngcgb21ahr01ql0m8ri9o0';

let fetch: any;

(async () => {
  const { default: importedFetch } = await import('node-fetch');
  fetch = importedFetch;
})();

interface StockData {
  c: number;
  h: number;
  l: number;
  o: number;
  pc: number;
  t: number;
}

export async function getStockPrice(stockSymbol: string, api_key: string): Promise<number | null> {
  const base_url = "https://finnhub.io/api/v1/quote?";
  const query_params = `symbol=${stockSymbol.toUpperCase()}&token=${api_key}`;
  const url = base_url + query_params;

  try {
    const response = await fetch(url);

    if (response.status !== 200) {
      console.error(`Error: Received status code ${response.status}`);  
      return null;
    }

    const stock_data: StockData = await response.json();
    return stock_data.c;
  } catch (error) {
    console.error('Error fetching stock price:', error);
    return null;
  }
};

router.get('/:symbol', async (req, res) => {
  const stockSymbol = req.params.symbol;

  try {
    const currentPrice = await getStockPrice(stockSymbol, api_key_const);

    if (currentPrice === null) {
      res.status(500).json({ message: 'Error fetching stock price' });
    } else {
      res.json({ currentPrice });
    }
  } catch (error) {
    console.error('Error fetching stock price:', error);
    res.status(500).json({ message: 'Error fetching stock price' });
  }
});

export default router;
