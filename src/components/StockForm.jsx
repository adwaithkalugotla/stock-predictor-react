// src/components/StockForm.jsx
import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import { motion } from 'framer-motion';
import 'react-datepicker/dist/react-datepicker.css';

export default function StockForm({ onSubmit, loading }) {
  const [input,   setInput]   = useState('');
  const [symbols, setSymbols] = useState([]);
  const [start,   setStart]   = useState(null);
  const [end,     setEnd]     = useState(null);

  const addSymbol = () => {
    let sym = input.trim().toUpperCase().split(',')[0];
    if (sym.startsWith('$')) sym = sym.slice(1);
    if (sym && !symbols.includes(sym) && symbols.length < 4) {
      setSymbols([...symbols, sym]);
      setInput('');
    }
  };

  const removeSymbol = (sym) =>
    setSymbols(symbols.filter((s) => s !== sym));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (symbols.length > 0 && start && end) {
      onSubmit({
        symbols,
        start: start.toISOString().slice(0, 10),
        end:   end.toISOString().slice(0, 10),
      });
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="grid gap-6"
    >
      {/* ticker input + add */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="AAPL"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addSymbol();
            }
          }}
          disabled={loading}
          className="flex-1 border border-neutral rounded px-3 py-2 text-lg
                     bg-secondary text-neutral placeholder-neutral/60
                     focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
        />
        <button
          type="button"
          onClick={addSymbol}
          disabled={loading || symbols.length >= 4}
          className="bg-primary text-secondary px-4 py-2 rounded text-lg
                     hover:bg-indigo-600 transition disabled:opacity-50"
        >
          +
        </button>
      </div>

      {/* ticker pills */}
      <div className="flex gap-2 flex-wrap">
        {symbols.map((s) => (
          <span
            key={s}
            className="bg-primary text-secondary px-3 py-1 rounded-full
                       flex items-center gap-2"
          >
            {s}
            <button
              type="button"
              onClick={() => removeSymbol(s)}
              className="text-secondary hover:text-white"
            >
              &times;
            </button>
          </span>
        ))}
      </div>

      {/* date pickers + Explore */}
      <div className="grid grid-cols-3 gap-4 items-end">
        <div>
          <label className="block text-neutral mb-1 dark:text-gray-200">
            Start Date
          </label>
          <DatePicker
            selected={start}
            onChange={(d) => setStart(d)}
            placeholderText="Start"
            maxDate={new Date()}
            className="w-full border border-neutral rounded px-2 py-2 text-lg
                       bg-secondary text-neutral
                       focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div>
          <label className="block text-neutral mb-1 dark:text-gray-200">
            End Date
          </label>
          <DatePicker
            selected={end}
            onChange={(d) => setEnd(d)}
            minDate={start}
            maxDate={new Date()}
            placeholderText="End"
            className="w-full border border-neutral rounded px-2 py-2 text-lg
                       bg-secondary text-neutral
                       focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div>
          <button
            type="submit"
            disabled={loading || symbols.length === 0}
            className="w-full bg-primary text-secondary py-3 text-lg rounded
                       hover:bg-indigo-600 transition disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Explore'}
          </button>
        </div>
      </div>
    </motion.form>
  );
}
