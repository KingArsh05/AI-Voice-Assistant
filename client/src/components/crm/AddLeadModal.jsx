import React, { useState, useEffect } from 'react';
import { UserPlus, X, User, Phone, Building2, FileText, Loader2, AlertCircle } from 'lucide-react';
import { StandaloneSelect } from '../common/FormControl';
import CountryCodeSelector from '../common/CountryCodeSelector';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function AddLeadModal({ hotels, onClose, onLeadCreated }) {
  const [guestName, setGuestName] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [hotelId, setHotelId] = useState('');
  const [leadDetails, setLeadDetails] = useState('');
  const [status, setStatus] = useState('new');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!guestName.trim() || !phoneNumber.trim()) {
      setError('Guest name and phone number are required');
      return;
    }

    setLoading(true);
    setError('');

    // Format full phone number with country prefix
    const cleanDigits = phoneNumber.trim().replace(/^0+/, '');
    const fullPhone = phoneNumber.trim().startsWith('+') ? phoneNumber.trim() : `${countryCode}${cleanDigits}`;

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/crm/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_name: guestName.trim(),
          phone_number: fullPhone,
          hotel_id: hotelId || null,
          lead_details: leadDetails.trim() || undefined,
          status: status,
          source: 'manual',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onLeadCreated(data.data);
      } else {
        setError(data.message || 'Failed to create lead');
      }
    } catch (err) {
      setError('Network error while creating lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-slate-200 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Add New CRM Lead</h2>
            <p className="text-xs text-slate-400">Insert guest directly into the pipeline for voice follow-ups.</p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-400" /> Guest Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Rahul Sharma"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-indigo-400" /> Phone Number *
            </label>
            <div className="flex gap-2 items-center">
              <CountryCodeSelector
                value={countryCode}
                onChange={(code) => setCountryCode(code)}
                size="md"
              />
              <input
                type="tel"
                required
                placeholder="9876543210"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" /> Associated Hotel
              </label>
              <StandaloneSelect
                value={hotelId}
                onChange={(val) => setHotelId(val)}
                placeholder="None / Unassigned"
                searchable={hotels.length > 4}
                options={[
                  { value: '', label: 'None / Unassigned' },
                  ...hotels.map((h) => ({
                    value: h.hotel_id,
                    label: h.name || h.hotel_name || 'Hotel Property',
                    subLabel: h.contact?.city || h.city || 'Hotel',
                  })),
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Initial Pipeline Status
              </label>
              <StandaloneSelect
                value={status}
                onChange={(val) => setStatus(val)}
                options={[
                  { value: 'new', label: 'New Lead' },
                  { value: 'follow_up', label: 'Follow Up' },
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'booked', label: 'Booked' },
                  { value: 'cold', label: 'Cold / Unresponsive' },
                ]}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-400" /> Inquired Preferences / Lead Details
            </label>
            <textarea
              rows={3}
              value={leadDetails}
              onChange={(e) => setLeadDetails(e.target.value)}
              placeholder="Any room category, date range, or special requests mentioned..."
              className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add to CRM'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
