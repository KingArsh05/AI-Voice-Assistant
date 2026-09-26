import React, { useState, useRef, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { ChevronDown, Search, Minus, Plus, Check } from "lucide-react";
import { COUNTRY_CODES } from "../../utils/countryCodes";

/**
 * Number Stepper Field
 * Pill-shaped control: [ − ] | value | [ + ]
 * Matches the reference design with internal dividers and clamped typeable center input.
 */
export const NumberStepperField = ({
  name,
  label,
  min = 0,
  max = 100,
  step = 1,
  prefix,
  suffix,
  rules = {},
  disabled = false,
  helperText,
}) => {
  const {
    watch,
    setValue,
    register,
    formState: { errors },
  } = useFormContext();

  const rawValue = watch(name);
  const numValue = parseFloat(rawValue) || 0;
  const error = errors[name];

  const clamp = (val) => Math.min(max, Math.max(min, val));

  const handleDecrement = () => {
    if (disabled || numValue <= min) return;
    setValue(name, clamp(numValue - step), { shouldValidate: true });
  };

  const handleIncrement = () => {
    if (disabled || numValue >= max) return;
    setValue(name, clamp(numValue + step), { shouldValidate: true });
  };

  const handleInputChange = (e) => {
    const raw = e.target.value;
    if (raw === "" || raw === "-") {
      setValue(name, raw);
      return;
    }
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      setValue(name, parsed, { shouldValidate: false });
    }
  };

  const handleInputBlur = () => {
    const clamped = clamp(numValue);
    setValue(name, clamped, { shouldValidate: true });
  };

  const isAtMin = numValue <= min;
  const isAtMax = numValue >= max;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-sm font-medium text-slate-200">{label}</label>
      )}

      {/* Hidden input for react-hook-form registration */}
      <input type="hidden" {...register(name, rules)} />

      {/* Pill container */}
      <div
        className={`flex items-stretch bg-slate-900/80 border rounded-xl overflow-hidden transition-all duration-200 ${
          error
            ? "border-rose-500 focus-within:ring-2 focus-within:ring-rose-500/20"
            : "border-slate-800 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 hover:border-slate-700"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {/* Decrement button */}
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || isAtMin}
          aria-label="Decrease value"
          className={`flex items-center justify-center w-10 shrink-0 transition-all duration-150 active:scale-90 select-none
            ${isAtMin || disabled
              ? "text-slate-600 cursor-not-allowed"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 cursor-pointer"
            }`}
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        {/* Left divider */}
        <div className="w-px bg-slate-800/80 shrink-0" />

        {/* Value display / typeable center */}
        <div className="flex-1 flex items-center justify-center gap-1 px-2 min-w-0">
          {prefix && (
            <span className="text-slate-400 text-xs font-mono shrink-0">{prefix}</span>
          )}
          <input
            type="number"
            value={rawValue ?? 0}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            disabled={disabled}
            min={min}
            max={max}
            step={step}
            className="w-full min-w-0 text-center bg-transparent text-slate-100 text-sm font-semibold outline-none appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield] py-2.5"
          />
          {suffix && (
            <span className="text-slate-400 text-xs shrink-0">{suffix}</span>
          )}
        </div>

        {/* Right divider */}
        <div className="w-px bg-slate-800/80 shrink-0" />

        {/* Increment button */}
        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || isAtMax}
          aria-label="Increase value"
          className={`flex items-center justify-center w-10 shrink-0 transition-all duration-150 active:scale-90 select-none
            ${isAtMax || disabled
              ? "text-slate-600 cursor-not-allowed"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 cursor-pointer"
            }`}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {error && (
        <span className="text-xs text-rose-400 font-medium">
          {error.message || "Invalid value"}
        </span>
      )}
      {helperText && !error && (
        <span className="text-xs text-slate-400">{helperText}</span>
      )}
    </div>
  );
};

/**
 * Standard Text / Number Input Field
 */
export const InputField = ({
  name,
  label,
  type = "text",
  placeholder = "",
  autoComplete = "on",
  rules = {},
  disabled = false,
  helperText,
}) => {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  const error = errors[name];

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={name} className="text-sm font-medium text-slate-200">
          {label}
        </label>
      )}
      <input
        id={name}
        type={type}
        autoComplete={autoComplete}
        disabled={disabled}
        placeholder={placeholder}
        {...register(name, rules)}
        className={`w-full px-3.5 py-2.5 bg-slate-900/80 border rounded-xl text-slate-100 text-sm placeholder:text-slate-500 transition-all duration-200 outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
          error
            ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20"
            : "border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20 hover:border-slate-700"
        }`}
      />
      {error && (
        <span className="text-xs text-rose-400 font-medium">
          {error.message || "This field is required"}
        </span>
      )}
      {helperText && !error && (
        <span className="text-xs text-slate-400">{helperText}</span>
      )}
    </div>
  );
};

/**
 * Custom Select Dropdown Field (react-hook-form connected)
 * Uses register & setValue from useFormContext
 */
export const SelectField = ({
  name,
  label,
  options = [],
  rules = {},
  disabled = false,
  searchable = false,
  placeholder = "Select an option",
}) => {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext();

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const selectedValue = watch(name);
  const error = errors[name];

  const selectedOption = options.find((opt) => String(opt.value) === String(selectedValue));

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto focus search
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    if (!isOpen) setSearch("");
  }, [isOpen, searchable]);

  const handleSelect = (val) => {
    setValue(name, val, { shouldValidate: true });
    setIsOpen(false);
  };

  const filteredOptions = searchable && search.trim()
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(search.toLowerCase()) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(search.toLowerCase()))
      )
    : options;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={`${name}-btn`} className="text-sm font-medium text-slate-200">
          {label}
        </label>
      )}

      {/* Hidden input for react-hook-form registration & validation */}
      <input type="hidden" {...register(name, rules)} />

      <div ref={dropdownRef} className="relative w-full">
        <button
          id={`${name}-btn`}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          className={`w-full px-3.5 py-2.5 bg-slate-900/90 border rounded-xl text-sm flex items-center justify-between outline-none focus:ring-2 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            error
              ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20"
              : isOpen
              ? "border-indigo-500 ring-2 ring-indigo-500/20"
              : "border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {selectedOption?.icon && (
              <span className="shrink-0 text-slate-400">{selectedOption.icon}</span>
            )}
            <span
              className={`truncate ${
                selectedOption ? "text-slate-100 font-medium" : "text-slate-500"
              }`}
            >
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            {selectedOption?.subLabel && (
              <span className="text-[11px] text-slate-500 truncate hidden sm:inline">
                ({selectedOption.subLabel})
              </span>
            )}
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${
              isOpen ? "rotate-180 text-indigo-400" : ""
            }`}
          />
        </button>

        {/* Custom Dropdown List */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1.5 max-h-60 bg-slate-900/98 backdrop-blur-xl border border-slate-800 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            {searchable && (
              <div className="p-2 border-b border-slate-800/80 bg-slate-950/60 sticky top-0 z-10 flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-500 py-1 pr-2"
                />
              </div>
            )}
            <div className="overflow-y-auto p-1 divide-y divide-slate-800/30">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => {
                  const isSelected = String(selectedValue) === String(opt.value);
                  return (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      className={`w-full px-3 py-2 text-left rounded-lg text-xs transition-colors flex items-center justify-between gap-2 ${
                        isSelected
                          ? "bg-indigo-600/25 text-indigo-200 font-semibold"
                          : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                        <span className="truncate">{opt.label}</span>
                        {opt.subLabel && (
                          <span className="text-[10px] text-slate-500 truncate">
                            {opt.subLabel}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-indigo-400 font-bold shrink-0" />
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="p-3 text-center text-xs text-slate-500">
                  No matching options
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <span className="text-xs text-rose-400 font-medium">
          {error.message || "Selection is required"}
        </span>
      )}
    </div>
  );
};

/**
 * Standalone Custom Select Field (Non-form / pure state controlled)
 * Placed inside FormControl.jsx for cohesive UI architecture
 */
export const StandaloneSelect = ({
  value,
  onChange,
  options = [],
  placeholder = "Select an option",
  disabled = false,
  searchable = false,
  size = "md",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    if (!isOpen) setSearch("");
  }, [isOpen, searchable]);

  const filteredOptions = searchable && search.trim()
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(search.toLowerCase()) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(search.toLowerCase()))
      )
    : options;

  return (
    <div ref={dropdownRef} className={`relative select-none ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full bg-slate-900/90 border border-slate-800 rounded-xl text-left flex items-center justify-between gap-2.5 transition-all duration-200 outline-none hover:border-slate-700 hover:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed ${
          isOpen ? "border-indigo-500 ring-2 ring-indigo-500/20" : ""
        } ${size === "sm" ? "px-3 py-1.5 text-xs" : "px-3.5 py-2.5 text-sm"}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedOption?.icon && (
            <span className="shrink-0 text-slate-400">{selectedOption.icon}</span>
          )}
          <span
            className={`truncate ${
              selectedOption ? "text-slate-100 font-medium" : "text-slate-500"
            }`}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.subLabel && (
            <span className="text-[11px] text-slate-500 truncate hidden sm:inline">
              ({selectedOption.subLabel})
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ml-1 ${
            isOpen ? "rotate-180 text-indigo-400" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 max-h-60 bg-slate-900/98 backdrop-blur-xl border border-slate-800 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {searchable && (
            <div className="p-2 border-b border-slate-800/80 bg-slate-950/60 sticky top-0 z-10 flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-500 py-1 pr-2"
              />
            </div>
          )}
          <div className="overflow-y-auto p-1 divide-y divide-slate-800/30">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = String(value) === String(opt.value);
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left rounded-lg text-xs transition-colors flex items-center justify-between gap-2 ${
                      isSelected
                        ? "bg-indigo-600/25 text-indigo-200 font-semibold"
                        : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                      <span className="truncate">{opt.label}</span>
                      {opt.subLabel && (
                        <span className="text-[10px] text-slate-500 truncate">
                          {opt.subLabel}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-indigo-400 font-bold shrink-0" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="p-3 text-center text-xs text-slate-500">
                No matching options
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Custom Textarea Field
 */
export const TextareaField = ({
  name,
  label,
  rows = 3,
  placeholder = "",
  rules = {},
  disabled = false,
  helperText,
}) => {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  const error = errors[name];

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={name} className="text-sm font-medium text-slate-200">
          {label}
        </label>
      )}
      <textarea
        id={name}
        rows={rows}
        disabled={disabled}
        placeholder={placeholder}
        {...register(name, rules)}
        className={`w-full px-3.5 py-2.5 bg-slate-900/80 border rounded-xl text-slate-100 text-sm placeholder:text-slate-500 transition-all duration-200 outline-none focus:ring-2 resize-none disabled:opacity-50 disabled:cursor-not-allowed ${
          error
            ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20"
            : "border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20 hover:border-slate-700"
        }`}
      />
      {error && (
        <span className="text-xs text-rose-400 font-medium">
          {error.message || "This field is required"}
        </span>
      )}
      {helperText && !error && (
        <span className="text-xs text-slate-400">{helperText}</span>
      )}
    </div>
  );
};

/**
 * Custom Phone Input Field with Custom Country Code Selector
 * Defaults to India (+91)
 */
export const PhoneInputField = ({
  countryCodeName = "countryCode",
  phoneName = "phoneNumber",
  label = "Phone Number",
  rules = {},
  placeholder = "8031825752",
  autoComplete = "tel-national",
  disabled = false,
  helperText,
}) => {
  const {
    register,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useFormContext();

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  const selectedCode = watch(countryCodeName) || "+91";
  const phoneError = errors[phoneName];

  // Set default to +91 if not yet set
  useEffect(() => {
    if (!watch(countryCodeName)) {
      setValue(countryCodeName, "+91");
    }
  }, [countryCodeName, setValue, watch]);

  // Find currently selected country item
  const activeCountry =
    COUNTRY_CODES.find((c) => c.code === selectedCode) || COUNTRY_CODES[0];

  // Filter country codes by search
  const filteredCountries = COUNTRY_CODES.filter(
    (c) =>
      c.country.toLowerCase().includes(search.toLowerCase()) ||
      c.code.includes(search)
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectCountry = (country) => {
    setValue(countryCodeName, country.code, { shouldValidate: true });
    // Re-validate phone number with new country length rules
    trigger(phoneName);
    setIsOpen(false);
    setSearch("");
  };

  const getPhoneValidationRules = () => {
    return {
      required: "Phone number is required",
      validate: (value) => {
        if (!value) return "Phone number is required";
        const digitsOnly = value.replace(/\D/g, "");
        if (digitsOnly.length !== value.length) {
          return "Only numbers are allowed";
        }

        const min = activeCountry?.minLength || 7;
        const max = activeCountry?.maxLength || 15;

        if (min === max) {
          if (digitsOnly.length !== min) {
            return `${activeCountry.country} phone number must be exactly ${min} digits`;
          }
        } else {
          if (digitsOnly.length < min || digitsOnly.length > max) {
            return `${activeCountry.country} phone number must be between ${min} and ${max} digits`;
          }
        }
        return true;
      },
      ...rules,
    };
  };

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={phoneName} className="text-sm font-medium text-slate-200">
          {label}
        </label>
      )}

      {/* Hidden input to register with react-hook-form */}
      <input type="hidden" {...register(countryCodeName)} />

      <div className="flex gap-2 relative">
        {/* Custom Country Code Dropdown Trigger */}
        <div ref={dropdownRef} className="relative w-24 shrink-0">
          <button
            id={`${countryCodeName}-btn`}
            type="button"
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            disabled={disabled}
            onClick={() => setIsOpen((prev) => !prev)}
            className="w-full h-full px-2.5 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-slate-200 text-sm flex items-center justify-between hover:border-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="flex items-center gap-1.5 truncate">
              <span className="text-base leading-none">{activeCountry.flag}</span>
              <span className="font-mono text-xs font-medium text-slate-100">
                {activeCountry.code}
              </span>
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Custom Dropdown Menu */}
          {isOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-64 max-h-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              {/* Search Bar */}
              <div className="p-2 border-b border-slate-800 flex items-center gap-2 bg-slate-950/50">
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

              {/* Country List */}
              <div className="overflow-y-auto flex-1 p-1 divide-y divide-slate-800/40">
                {filteredCountries.length > 0 ? (
                  filteredCountries.map((c, index) => (
                    <button
                      key={`${c.iso}-${c.code}-${index}`}
                      type="button"
                      onClick={() => handleSelectCountry(c)}
                      className={`w-full px-2.5 py-2 flex items-center justify-between text-left rounded-lg text-xs hover:bg-indigo-600/15 hover:text-indigo-200 transition-colors ${
                        selectedCode === c.code && activeCountry.country === c.country
                          ? "bg-indigo-600/25 text-indigo-300 font-medium"
                          : "text-slate-300"
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span className="text-base">{c.flag}</span>
                        <span className="truncate">{c.country}</span>
                      </span>
                      <span className="font-mono text-slate-400 shrink-0 ml-2">
                        {c.code}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-center text-xs text-slate-500">
                    No country found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Telephone Input */}
        <input
          id={phoneName}
          type="tel"
          autoComplete={autoComplete}
          disabled={disabled}
          placeholder={placeholder}
          {...register(phoneName, getPhoneValidationRules())}
          className={`w-full px-3.5 py-2.5 bg-slate-900/80 border rounded-xl text-slate-100 text-sm placeholder:text-slate-500 transition-all duration-200 outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
            phoneError
              ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20"
              : "border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20 hover:border-slate-700"
          }`}
        />
      </div>

      {phoneError && (
        <span className="text-xs text-rose-400 font-medium">
          {phoneError.message}
        </span>
      )}
      {helperText && !phoneError && (
        <span className="text-xs text-slate-400">{helperText}</span>
      )}
    </div>
  );
};