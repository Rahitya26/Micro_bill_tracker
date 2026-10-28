import React, { useState, useRef, useEffect } from 'react';
import { Check, X, ChevronDown, Plus } from 'lucide-react';

export default function MerchantCombobox({ initialValue = '', knownMerchants = [], onSave, onCancel }) {
  const [query, setQuery] = useState(initialValue);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Focus input automatically on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  // Filter matching merchants
  const filteredMerchants = knownMerchants.filter(m =>
    m.toLowerCase().includes(query.trim().toLowerCase())
  );

  const isExactMatch = knownMerchants.some(
    m => m.toLowerCase() === query.trim().toLowerCase()
  );

  const isNewMerchant = query.trim().length > 0 && !isExactMatch;

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (merchantName) => {
    setQuery(merchantName);
    setIsOpen(false);
    onSave(merchantName);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex(prev => 
        prev < filteredMerchants.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && highlightedIndex >= 0 && filteredMerchants[highlightedIndex]) {
        handleSelect(filteredMerchants[highlightedIndex]);
      } else if (query.trim()) {
        onSave(query.trim());
      }
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onSave(query.trim());
    } else {
      onCancel();
    }
  };

  return (
    <div className="combobox-container" ref={containerRef}>
      <div className="combobox-input-wrap">
        <input
          ref={inputRef}
          type="text"
          className="combobox-input"
          placeholder="Type or select merchant..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className="combobox-toggle-btn"
          tabIndex={-1}
          onClick={() => setIsOpen(!isOpen)}
        >
          <ChevronDown size={14} />
        </button>

        {/* Dropdown Options */}
        {isOpen && (
          <ul className="combobox-dropdown">
            {filteredMerchants.length > 0 ? (
              filteredMerchants.map((m, idx) => (
                <li
                  key={m}
                  className={`combobox-item ${idx === highlightedIndex ? 'active' : ''}`}
                  onMouseDown={() => handleSelect(m)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                >
                  <span>{m}</span>
                </li>
              ))
            ) : (
              <li style={{ padding: '0.45rem 0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                No existing merchants match
              </li>
            )}

            {/* Prompt to add new merchant if typed text is unique */}
            {isNewMerchant && (
              <li
                className="combobox-item combobox-new-item"
                onMouseDown={() => handleSelect(query.trim())}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Plus size={13} />
                  <span>Use: "<strong>{query.trim()}</strong>"</span>
                </div>
              </li>
            )}
          </ul>
        )}
      </div>

      <button
        type="button"
        className="btn btn-primary btn-icon"
        style={{ width: '26px', height: '26px' }}
        title="Save Merchant"
        onClick={handleSubmit}
      >
        <Check size={13} />
      </button>

      <button
        type="button"
        className="btn btn-secondary btn-icon"
        style={{ width: '26px', height: '26px' }}
        title="Cancel"
        onClick={onCancel}
      >
        <X size={13} />
      </button>
    </div>
  );
}

