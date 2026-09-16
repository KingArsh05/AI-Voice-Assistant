import React, { useState, useRef, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { ChevronDown, Search } from "lucide-react";
import { COUNTRY_CODES } from "../../utils/countryCodes";

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
 * Custom Select Dropdown Field
 */
export const SelectField = ({
  name,
  label,
  options = [],
  rules = {},
  disabled = false,
  placeholder = "Select an option",
}) => {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedValue = watch(name);
  const error = errors[name];

  const selectedOption = options.find((opt) => opt.value === selectedValue);

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

  const handleSelect = (val) => {
    setValue(name, val, { shouldValidate: true });
    setIsOpen(false);
  };

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
          className={`w-full px-3.5 py-2.5 bg-slate-900/80 border rounded-xl text-sm flex items-center justify-between outline-none focus:ring-2 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            error
              ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20"
              : "border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20 hover:border-slate-700"
          }`}
        >
          <span
            className={`truncate ${
              selectedOption ? "text-slate-100 font-medium" : "text-slate-500"
            }`}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Custom Dropdown List */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1.5 max-h-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-y-auto p-1 divide-y divide-slate-800/40 animate-in fade-in zoom-in-95 duration-100">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={`w-full px-3 py-2 text-left rounded-lg text-xs transition-colors flex items-center justify-between ${
                  selectedValue === opt.value
                    ? "bg-indigo-600/25 text-indigo-300 font-medium"
                    : "text-slate-300 hover:bg-indigo-600/15 hover:text-indigo-200"
                }`}
              >
                <span>{opt.label}</span>
                {selectedValue === opt.value && (
                  <span className="text-indigo-400 text-xs font-bold">✓</span>
                )}
              </button>
            ))}
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
