import { useState, useRef, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import {
  ChevronDown,
  Search,
  Minus,
  Plus,
  Check,
  Upload,
  FileSpreadsheet,
  X,
  AlertCircle,
} from "lucide-react";
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

      <div
        ref={dropdownRef}
        className={`relative w-full ${isOpen ? "z-50" : "z-auto"}`}
      >
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
          <div className="absolute top-full left-0 right-0 mt-1.5 max-h-60 bg-slate-900/98 backdrop-blur-xl border border-slate-800 rounded-xl shadow-2xl z-[100] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
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
  dropUp = false,
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
    <div
      ref={dropdownRef}
      className={`relative select-none ${isOpen ? "z-[70]" : "z-10"} ${className}`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full bg-slate-900/95 border border-slate-800 rounded-xl text-left flex items-center justify-between gap-2.5 transition-all duration-200 outline-none hover:border-slate-700 hover:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed ${
          isOpen ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-slate-900" : ""
        } ${size === "sm" ? "px-3 py-2 text-xs h-9" : "px-3.5 py-2.5 text-xs h-10"}`}
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
        <div
          className={`absolute ${
            dropUp ? "bottom-full mb-1.5" : "top-full mt-1.5"
          } left-0 min-w-full w-max max-w-sm max-h-64 bg-slate-900/98 backdrop-blur-2xl border border-slate-700/80 rounded-xl shadow-2xl shadow-black/90 z-[999] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100`}
        >
          {searchable && (
            <div className="p-2 border-b border-slate-800 bg-slate-950/80 sticky top-0 z-10 flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full bg-transparent text-xs text-slate-100 outline-none placeholder:text-slate-500 py-1 pr-2"
              />
            </div>
          )}
          <div className="overflow-y-auto p-1 divide-y divide-slate-800/40 scrollbar-thin [scrollbar-color:#334155_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-700/60 [&::-webkit-scrollbar-thumb]:rounded-full">
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
 * Standalone Stepper Component (Direct state controlled)
 * Clean pill-shaped control: [ − ] | value | [ + ]
 */
export const StandaloneStepper = ({
  value = 2.0,
  onChange,
  min = 1.0,
  max = 5.0,
  step = 0.5,
  suffix = "s",
  prefix,
  disabled = false,
  className = "",
}) => {
  const numValue = Number(value) || 0;
  const isAtMin = numValue <= min;
  const isAtMax = numValue >= max;

  const clamp = (val) => Math.min(max, Math.max(min, val));

  const handleDecrement = () => {
    if (disabled || isAtMin) return;
    const nextVal = +(clamp(numValue - step)).toFixed(1);
    onChange(nextVal);
  };

  const handleIncrement = () => {
    if (disabled || isAtMax) return;
    const nextVal = +(clamp(numValue + step)).toFixed(1);
    onChange(nextVal);
  };

  return (
    <div
      className={`inline-flex items-stretch bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden transition-all duration-200 h-9 select-none hover:border-slate-700 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${className}`}
    >
      <button
        type="button"
        onClick={handleDecrement}
        disabled={disabled || isAtMin}
        aria-label="Decrease value"
        className={`flex items-center justify-center w-8 shrink-0 transition-all duration-150 active:scale-90 ${
          isAtMin || disabled
            ? "text-slate-600 cursor-not-allowed"
            : "text-slate-400 hover:text-white hover:bg-slate-800/70 cursor-pointer"
        }`}
      >
        <Minus className="w-3.5 h-3.5" />
      </button>

      <div className="w-px bg-slate-800 shrink-0" />

      <div className="px-2.5 flex-1 flex items-center justify-center gap-1 min-w-[54px] bg-slate-950/40">
        {prefix && <span className="text-slate-400 text-xs font-mono">{prefix}</span>}
        <span className="text-xs font-mono font-semibold text-indigo-300">
          {numValue.toFixed(1)}
        </span>
        {suffix && <span className="text-slate-400 text-xs font-mono">{suffix}</span>}
      </div>

      <div className="w-px bg-slate-800 shrink-0" />

      <button
        type="button"
        onClick={handleIncrement}
        disabled={disabled || isAtMax}
        aria-label="Increase value"
        className={`flex items-center justify-center w-8 shrink-0 transition-all duration-150 active:scale-90 ${
          isAtMax || disabled
            ? "text-slate-600 cursor-not-allowed"
            : "text-slate-400 hover:text-white hover:bg-slate-800/70 cursor-pointer"
        }`}
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
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
  defaultCountryCode = "+91",
  defaultValue = "",
}) => {
  const {
    register,
    watch,
    setValue,
    trigger,
    getValues,
    formState: { errors },
  } = useFormContext();

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  // Initialize defaults if not already present in form state
  useEffect(() => {
    // If defaultValue is provided like "+919876543210", intelligently split code and digits
    let initialCode = defaultCountryCode || "+91";
    let initialPhone = defaultValue ? String(defaultValue).trim() : "";

    if (initialPhone.startsWith("+")) {
      const match = COUNTRY_CODES.find((c) => initialPhone.startsWith(c.code));
      if (match) {
        initialCode = match.code;
        initialPhone = initialPhone.slice(match.code.length).trim();
      }
    }

    if (!getValues(countryCodeName)) {
      setValue(countryCodeName, initialCode);
    }
    if (initialPhone && !getValues(phoneName)) {
      setValue(phoneName, initialPhone);
    }
  }, [countryCodeName, phoneName, defaultCountryCode, defaultValue, setValue, getValues]);

  const selectedCode = watch(countryCodeName) || defaultCountryCode || "+91";
  const phoneError = errors[phoneName];

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
      required: {
        value: true,
        message: "Phone number is required",
      },
      ...rules,
      validate: {
        digitsOnly: (value) => {
          if (!value) return true;
          const digits = String(value).replace(/\D/g, "");
          if (digits.length !== String(value).length) {
            return "Only numbers are allowed";
          }
          return true;
        },
        exactLength: (value) => {
          if (!value) return true;
          const digits = String(value).replace(/\D/g, "");
          const min = activeCountry?.minLength || 10;
          const max = activeCountry?.maxLength || 10;

          if (min === max && digits.length !== min) {
            return `${activeCountry.country || "Phone"} number must be exactly ${min} digits`;
          }
          if (digits.length < min || digits.length > max) {
            return `${activeCountry.country || "Phone"} number must be between ${min} and ${max} digits`;
          }
          return true;
        },
        ...(typeof rules?.validate === "function"
          ? { custom: rules.validate }
          : typeof rules?.validate === "object"
          ? rules.validate
          : {}),
      },
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
            className={`w-full h-full px-2.5 py-2.5 border rounded-xl text-sm flex items-center justify-between transition-all duration-200 ${
              disabled
                ? "bg-slate-900/90 border-slate-800 text-slate-100 cursor-default shadow-inner"
                : "bg-slate-900/80 border-slate-800 text-slate-200 hover:border-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            }`}
          >
            <span className="flex items-center gap-1.5 truncate">
              <span className="text-base leading-none">{activeCountry.flag}</span>
              <span className="font-mono text-xs font-semibold text-slate-100">
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

        {/* Clean, Visible Phone Number Input (type="tel") */}
        <input
          id={phoneName}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={autoComplete}
          disabled={disabled}
          placeholder={placeholder}
          {...register(phoneName, getPhoneValidationRules())}
          onKeyDown={(e) => {
            // Allow navigation and edit controls
            const allowedKeys = [
              "Backspace",
              "Tab",
              "Enter",
              "Delete",
              "ArrowLeft",
              "ArrowRight",
              "ArrowUp",
              "ArrowDown",
              "Home",
              "End",
            ];
            if (
              allowedKeys.includes(e.key) ||
              (e.ctrlKey === true || e.metaKey === true)
            ) {
              return;
            }
            // Block non-digit keys
            if (!/^[0-9]$/.test(e.key)) {
              e.preventDefault();
            }
          }}
          onChange={(e) => {
            // Strip any non-numeric characters (e.g. from copy-paste)
            const cleanDigits = e.target.value.replace(/\D/g, "");
            setValue(phoneName, cleanDigits, { shouldValidate: true, shouldDirty: true });
          }}
          className={`w-full px-3.5 py-2.5 border rounded-xl text-sm placeholder:text-slate-500 transition-all duration-200 outline-none ${
            disabled
              ? "bg-slate-900/90 border-slate-800 text-slate-100 font-medium cursor-default shadow-inner select-all"
              : phoneError
              ? "bg-slate-900/80 text-slate-100 border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
              : "bg-slate-900/80 text-slate-100 border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 hover:border-slate-700"
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

/**
 * Universal Drag-and-Drop File Upload Field
 * Supports:
 * - Specific file restrictions (accept=".csv,.xlsx")
 * - Drag and drop states
 * - Custom callback onFileSelect(file)
 * - File removal / clearing
 */
export const FileUploadField = ({
  name = "file",
  label = "Upload File",
  accept = ".csv,.xlsx",
  maxSizeMB = 10,
  rules = {},
  onFileSelect,
  disabled = false,
  helperText,
}) => {
  const formContext = useFormContext();
  const register = formContext?.register;
  const setValue = formContext?.setValue;
  const formErrors = formContext?.formState?.errors;

  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [internalError, setInternalError] = useState("");
  const inputRef = useRef(null);

  const fieldError = formErrors && formErrors[name];
  const activeError = fieldError?.message || internalError;
  const isRequired = rules?.required?.value ?? Boolean(rules?.required);

  const validateAndProcessFile = (file) => {
    setInternalError("");
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      setInternalError(`File size exceeds maximum limit of ${maxSizeMB}MB`);
      return;
    }

    if (accept) {
      const allowedExts = accept
        .split(",")
        .map((ext) => ext.trim().toLowerCase());
      const fileExt = `.${file.name.split(".").pop().toLowerCase()}`;
      if (!allowedExts.includes(fileExt)) {
        setInternalError(`Invalid file type. Allowed formats: ${accept}`);
        return;
      }
    }

    setSelectedFile(file);
    if (setValue) {
      setValue(name, file, { shouldValidate: true, shouldDirty: true });
    }
    if (typeof onFileSelect === "function") {
      onFileSelect(file);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setSelectedFile(null);
    setInternalError("");
    if (setValue) {
      setValue(name, null, { shouldValidate: true, shouldDirty: true });
    }
    if (inputRef.current) inputRef.current.value = "";
    if (typeof onFileSelect === "function") {
      onFileSelect(null);
    }
  };

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-sm font-medium text-slate-200 flex items-center gap-1">
          {label}
          {isRequired && <span className="text-rose-400 font-bold">*</span>}
        </label>
      )}

      {/* Hidden input to register with react-hook-form */}
      {register && <input type="hidden" {...register(name, rules)} />}

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
          disabled
            ? "border-slate-800/60 bg-slate-900/30 opacity-50 cursor-not-allowed"
            : dragActive
            ? "border-indigo-500 bg-indigo-500/10 scale-[1.008]"
            : activeError
            ? "border-rose-500/80 bg-rose-500/5 hover:border-rose-500"
            : selectedFile
            ? "border-emerald-500/60 bg-emerald-500/5 hover:border-emerald-500"
            : "border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900/80"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          disabled={disabled}
          onChange={handleChange}
          className="hidden"
        />

        {selectedFile ? (
          <div className="flex items-center justify-between w-full max-w-md bg-slate-900/90 border border-slate-700/80 rounded-xl p-3 shadow-lg">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="text-left min-w-0">
                <p className="text-xs font-semibold text-slate-100 truncate">
                  {selectedFile.name}
                </p>
                <p className="text-[11px] text-slate-400 font-mono">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors ml-2"
              title="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 select-none">
            <div
              className={`p-3 rounded-2xl transition-colors ${
                dragActive
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800/80 text-slate-400"
              }`}
            >
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">
                Click to upload or drag & drop
              </p>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">
                Supports {accept || "all files"} (Max {maxSizeMB}MB)
              </p>
            </div>
          </div>
        )}
      </div>

      {activeError && (
        <span className="text-xs text-rose-400 font-medium flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {activeError}
        </span>
      )}
      {helperText && !activeError && (
        <span className="text-xs text-slate-400">{helperText}</span>
      )}
    </div>
  );
};