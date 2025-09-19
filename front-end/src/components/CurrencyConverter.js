import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

function CurrencyConverter() {
  const [apiBase, setApiBase] = useState(process.env.REACT_APP_API_URL || '');
  const [currencies, setCurrencies] = useState([]);
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('EUR');
  const [amount, setAmount] = useState('100');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const getCandidateBases = () => {
    const envBase = process.env.REACT_APP_API_URL;
    if (envBase) return [envBase];
    return ['http://localhost:3001', 'http://localhost:3000'];
  };

  useEffect(() => {
    const init = async () => {
      const bases = apiBase ? [apiBase] : getCandidateBases();
      for (const base of bases) {
        try {
          const res = await fetch(`${base}/api/currency/supported`);
          if (!res.ok) continue;
          const json = await res.json();
          if (json.success) {
            setCurrencies(json.data.currencies || []);
            setApiBase(base);
            return;
          }
        } catch (e) {
          // try next base
        }
      }
      toast.error('Currency API not reachable');
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canConvert = useMemo(() => from && to && amount && parseFloat(amount) > 0, [from, to, amount]);

  const convert = async () => {
    if (!canConvert) return;
    setLoading(true);
    setResult(null);
    try {
      const url = new URL(`${apiBase}/api/currency/convert`);
      url.searchParams.set('from', from);
      url.searchParams.set('to', to);
      url.searchParams.set('amount', amount);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Request failed');
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Conversion failed');
      setResult(json.data);
      toast.success('Converted');
    } catch (e) {
      toast.error(e.message || 'Conversion failed');
    } finally {
      setLoading(false);
    }
  };

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  return (
    <section className="currency">
      <motion.div className="doc-card" initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
        <p className="muted">Live exchange rates with caching.</p>

        <div className="currency-form">
          <div className="field">
            <label className="label">From</label>
            <select className="select" value={from} onChange={(e) => setFrom(e.target.value)}>
              {currencies.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label">To</label>
            <select className="select" value={to} onChange={(e) => setTo(e.target.value)}>
              {currencies.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label">Amount</label>
            <input className="prompt-input" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">&nbsp;</label>
            <button className="btn btn-secondary" onClick={swap} type="button">Swap</button>
          </div>
          <div className="field">
            <label className="label">&nbsp;</label>
            <button className="btn btn-primary" onClick={convert} disabled={!canConvert || loading} type="button">{loading ? 'Converting...' : 'Convert'}</button>
          </div>
        </div>

        {result && (
          <div className="currency-result">
            <div>
              {result.amount} {result.from} → {result.convertedAmount} {result.to}
            </div>
            <div className="muted">Rate: {result.rate} • Updated: {new Date(result.lastUpdated).toLocaleString()}</div>
          </div>
        )}
      </motion.div>
    </section>
  );
}

export default CurrencyConverter;


