import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";
import { COUNTRY_CODES } from "../../utils/countryCodes";

/**
 * Reusable Country Code Dropdown Selector
 * Height, borders, shadows, and paddings pixel-perfect with FormControl InputField
 */
export default function CountryCodeSelector({
  value = "+91",
  onChange,
  size = "md", // 'sm' | 'md'
  disabled = false,
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  const activeCountry =
    COUNTRY_CODES.find((c) => c.code === value) || COUNTRY_CODES[0];

  const filteredCountries = COUNTRY_CODES.filter(
    (c) =>
      c.country.toLowerCase().includes(search.toLowerCase()) ||
      c.code.includes(search)
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (c) => {
    onChange?.(c.code);
    setIsOpen(false);
    setSearch("");
  };

  const isSmall = size === "sm";

  return (
    <div ref={dropdownRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`bg-slate-900/80 border border-slate-800 rounded-xl text-slate-100 flex items-center justify-between gap-1.5 hover:border-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          isSmall
            ? "px-2 py-1 text-xs"
            : "w-24 h-[42px] px-2.5 py-2.5 text-sm"
        }`}
        title={`Country calling prefix: ${activeCountry.country} (${activeCountry.code})`}
      >
        <span className="flex items-center gap-1.5 truncate">
          <span className={isSmall ? "text-sm leading-none" : "text-base leading-none"}>
            {activeCountry.flag}
          </span>
          <span className="font-mono text-xs font-semibold text-slate-100">
            {activeCountry.code}
          </span>
        </span>
        <ChevronDown
          className={`text-slate-400 transition-transform duration-200 shrink-0 ${
            isSmall ? "w-3 h-3" : "w-3.5 h-3.5"
          } ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-64 max-h-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search box */}
          <div className="p-2 border-b border-slate-800 flex items-center gap-2 bg-slate-950/70">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search country or code..."
              autoFocus
              className="w-full bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-500"
            />
          </div>

          {/* List items */}
          <div className="overflow-y-auto flex-1 p-1 divide-y divide-slate-800/40">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((c, index) => (
                <button
                  key={`${c.iso}-${c.code}-${index}`}
                  type="button"
                  onClick={() => handleSelect(c)}
                  className={`w-full px-2.5 py-1.5 flex items-center justify-between text-left rounded-lg text-xs hover:bg-indigo-600/15 hover:text-indigo-200 transition-colors cursor-pointer ${
                    value === c.code && activeCountry.country === c.country
                      ? "bg-indigo-600/25 text-indigo-300 font-semibold"
                      : "text-slate-300"
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span className="text-base leading-none">{c.flag}</span>
                    <span className="truncate">{c.country}</span>
                  </span>
                  <span className="font-mono text-slate-400 text-[11px] shrink-0 ml-2">
                    {c.code}
                  </span>
                </button>
              ))
            ) : (
              <div className="p-3 text-center text-xs text-slate-500">
                No matching country
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
