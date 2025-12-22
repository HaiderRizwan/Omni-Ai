import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { RefreshCcw, ArrowRightLeft, TrendingUp } from 'lucide-react';

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
    <section className="py-24 bg-noir-800 relative z-10" id="pricing">
      <motion.div
        className="max-w-4xl mx-auto px-6"
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-[var(--primary)] text-black">
            <TrendingUp size={20} />
          </div>
          <h2 className="text-3xl font-heading font-bold text-white">Live Exchange Rates</h2>
        </div>

        <div className="glass-panel p-8 rounded-3xl bg-[#080808] border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--primary)]/5 blur-[80px] rounded-full pointer-events-none" />

          <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 items-end relative z-10">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/60 ml-1">From</label>
              <div className="relative">
                <select
                  className="ui-input h-14 pl-4 pr-10 appearance-none font-mono text-lg"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                >
                  {currencies.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-white/30">
                  <span className="text-xs">▼</span>
                </div>
              </div>
            </div>

            <div className="flex justify-center pb-2">
              <button
                className="p-3 rounded-full bg-white/5 text-white/70 hover:bg-[var(--primary)] hover:text-black transition-all hover:scale-110 active:scale-90 border border-white/10"
                onClick={swap}
                type="button"
                title="Swap Currencies"
              >
                <ArrowRightLeft size={20} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white/60 ml-1">To</label>
              <div className="relative">
                <select
                  className="ui-input h-14 pl-4 pr-10 appearance-none font-mono text-lg"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                >
                  {currencies.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-white/30">
                  <span className="text-xs">▼</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-white/60 ml-1">Amount</label>
              <input
                className="ui-input h-14 font-mono text-xl"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <button
              className="h-14 px-8 rounded-xl bg-[var(--primary)] text-black font-bold text-lg hover:bg-[var(--primary-700)] transition-colors shadow-[0_0_20px_rgba(204,255,0,0.15)] disabled:opacity-50 disabled:cursor-not-allowed min-w-[160px]"
              onClick={convert}
              disabled={!canConvert || loading}
              type="button"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <RefreshCcw className="animate-spin" size={20} />
                </div>
              ) : 'Convert'}
            </button>
          </div>

          {result && (
            <motion.div
              className="mt-8 p-6 rounded-2xl bg-white/5 border border-white/5"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <div className="text-sm text-white/50 mb-1">Converted Amount</div>
                  <div className="text-3xl md:text-4xl font-mono font-bold text-white tracking-tight">
                    {result.convertedAmount} <span className="text-[var(--primary)]">{result.to}</span>
                  </div>
                  <div className="text-sm text-white/40 mt-2">
                    1 {result.from} = {result.rate} {result.to}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-white/30 px-3 py-1 rounded-full border border-white/5">
                    Updated: {new Date(result.lastUpdated).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </section>
  );
}

export default CurrencyConverter;


