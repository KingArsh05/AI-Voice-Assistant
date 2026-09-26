import React, { useState, useEffect } from 'react';
import { PhoneCall, X, User, Phone, Building2, FileText, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { StandaloneSelect } from '../common/FormControl';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function ConfirmCallModal({ lead, hotels, onClose, onCallTriggered }) {
  const [guestName, setGuestName] = useState(lead?.guest_name || '');
  const [phoneNumber, setPhoneNumber] = useState(lead?.phone_number || '');
  const [hotelId, setHotelId] = useState(lead?.hotel_id || '');
  const [leadDetails, setLeadDetails] = useState(lead?.lead_details || '');
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

  const handleCall = async (e) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      setError('Phone number is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/crm/leads/${lead.lead_id}/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_number: '+918031825752',
          hotel_id: hotelId || null,
          lead_details: leadDetails.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onCallTriggered(data);
      } else {
        setError(data.message || 'Failed to dispatch voice call');
      }
    } catch (err) {
      setError('Network error while dispatching call');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-slate-200 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl">
            <PhoneCall className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Confirm Guest Call</h2>
            <p className="text-xs text-slate-400">Review lead context before dispatching the Plivo CX AI Agent.</p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCall} className="space-y-4">
          {/* Guest Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-400" /> Guest Name
            </label>
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              disabled
              className="w-full px-3.5 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-sm text-slate-300 opacity-80 cursor-not-allowed"
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-indigo-400" /> Destination Phone
            </label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled
              className="w-full px-3.5 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-sm font-mono text-slate-300 opacity-80 cursor-not-allowed"
            />
          </div>

          {/* Hotel Selection using StandaloneSelect */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" /> Associated Hotel Knowledge
            </label>
            <StandaloneSelect
              value={hotelId}
              onChange={(val) => setHotelId(val)}
              placeholder="Select Hotel Knowledge Base..."
              searchable={hotels.length > 4}
              options={[
                { value: '', label: 'None / General Follow Up' },
                ...hotels.map((h) => ({
                  value: h.hotel_id,
                  label: h.name || h.hotel_name || 'Hotel Property',
                  subLabel: h.contact?.city || h.city || 'Hotel',
                })),
              ]}
            />
          </div>

          {/* Lead Context / Prompt Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-400" /> Lead Notes / Specific Follow-up Context
            </label>
            <textarea
              rows={4}
              value={leadDetails}
              onChange={(e) => setLeadDetails(e.target.value)}
              placeholder="E.g. Guest inquired about luxury suite for 2 nights on weekend, asked about early check-in and complimentary breakfast..."
              className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed"
            />
          </div>

          {/* Action Buttons */}
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
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-600/30 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Triggering Call...
                </>
              ) : (
                <>
                  <PhoneCall className="w-4 h-4" />
                  Confirm & Call
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
