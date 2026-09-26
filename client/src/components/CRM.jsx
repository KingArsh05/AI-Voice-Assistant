import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  PhoneCall,
  Plus,
  RefreshCw,
  Building2,
  Calendar,
  CheckSquare,
  Square,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Flame,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Award,
  UploadCloud,
} from 'lucide-react';
import ConfirmCallModal from './crm/ConfirmCallModal';
import AddLeadModal from './crm/AddLeadModal';
import { StandaloneSelect } from './common/FormControl';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const STATUS_CONFIG = {
  new: { label: 'New Lead', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  follow_up: { label: 'Follow Up', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  in_progress: { label: 'In Progress', bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  booked: { label: 'Booked', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  cold: { label: 'Cold', bg: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  lost: { label: 'Lost', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
};

export default function CRM() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [stats, setStats] = useState({ total: 0, by_status: {} });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedHotel, setSelectedHotel] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedLeads, setSelectedLeads] = useState(new Set());

  // Modals
  const [callModalLead, setCallModalLead] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [notification, setNotification] = useState(null);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchHotels = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/hotels?active_only=true`);
      const data = await res.json();
      if (data.success) setHotels(data.data || []);
    } catch (err) {
      console.error('Failed to load hotels:', err);
    }
  };

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (selectedHotel) params.append('hotel_id', selectedHotel);
      if (selectedStatus) params.append('status', selectedStatus);

      const res = await fetch(`${BACKEND_URL}/api/v1/crm/leads?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLeads(data.data || []);
        if (data.counts) setStats(data.counts);
      }
    } catch (err) {
      console.error('Failed to fetch CRM leads:', err);
      showNotification('Could not connect to CRM API', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotels();
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [selectedHotel, selectedStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLeads();
  };

  const toggleSelectLead = (id) => {
    const next = new Set(selectedLeads);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedLeads(next);
  };

  const toggleSelectAll = () => {
    if (selectedLeads.size === leads.length && leads.length > 0) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(leads.map(l => l.lead_id)));
    }
  };

  const handleSeedSampleLeads = async () => {
    setActionLoading(true);
    try {
      const sampleGuests = [
        { guest_name: "Rahul Sharma", phone_number: "+918544953527", lead_details: "Interested in Deluxe Room for 2 nights check-in tomorrow", status: "new" },
        { guest_name: "Priya Verma", phone_number: "+918544953527", lead_details: "Inquired about suite pricing and airport cab pickup", status: "follow_up" },
        { guest_name: "Aman Gupta", phone_number: "+918544953527", lead_details: "Looking to book banquet hall for family dinner", status: "new" },
        { guest_name: "Vikram Malhotra", phone_number: "+918544953527", lead_details: "Requested early check-in at 10 AM for executive suite", status: "in_progress" },
        { guest_name: "Neha Kapoor", phone_number: "+918544953527", lead_details: "Asking for couple weekend package with breakfast included", status: "new" },
        { guest_name: "Siddharth Rao", phone_number: "+918544953527", lead_details: "Corporate stay for 3 days requiring high-speed wifi", status: "follow_up" },
        { guest_name: "Ananya Patel", phone_number: "+918544953527", lead_details: "Inquiry for pool facing villa with extra bed for child", status: "booked" }
      ];

      for (const lead of sampleGuests) {
        await fetch(`${BACKEND_URL}/api/v1/crm/leads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...lead, source: 'sample_import' }),
        });
      }
      showNotification('Successfully imported 7 test leads!');
      fetchLeads();
    } catch (err) {
      showNotification('Failed to import sample leads', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (leadId) => {
    if (!confirm('Are you sure you want to remove this lead?')) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/crm/leads/${leadId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Lead removed from CRM');
        fetchLeads();
      }
    } catch (err) {
      showNotification('Failed to delete lead', 'error');
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Banner / Notification */}
      {notification && (
        <div className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
          notification.type === 'error'
            ? 'bg-rose-500/10 border-rose-500/20 text-rose-300'
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
        }`}>
          <span>{notification.msg}</span>
          <button onClick={() => setNotification(null)} className="text-xs underline ml-4">Dismiss</button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 bg-indigo-600/15 border border-indigo-500/30 rounded-xl text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">CRM Leads & Guests</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {stats.total || leads.length} Total
            </span>
          </div>
          <p className="text-sm text-slate-400">
            Guest database connected with instant single-call confirmation and batch campaign triggers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {selectedLeads.size > 0 && (
            <button
              onClick={handleLaunchCampaign}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              Create Campaign ({selectedLeads.size})
            </button>
          )}

          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-semibold rounded-xl transition-all"
          >
            <Plus className="w-4 h-4 text-indigo-400" />
            Add Lead
          </button>

          <button
            onClick={fetchLeads}
            disabled={loading}
            className="p-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl transition-all"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Status Filter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { key: '', label: 'All Leads', count: stats.total || leads.length, icon: Users, accent: 'text-indigo-400' },
          { key: 'new', label: 'New Leads', count: stats.by_status?.new || 0, icon: Flame, accent: 'text-emerald-400' },
          { key: 'follow_up', label: 'Follow Up', count: stats.by_status?.follow_up || 0, icon: Clock, accent: 'text-amber-400' },
          { key: 'in_progress', label: 'In Progress', count: stats.by_status?.in_progress || 0, icon: Sparkles, accent: 'text-indigo-400' },
          { key: 'booked', label: 'Booked', count: stats.by_status?.booked || 0, icon: Award, accent: 'text-blue-400' },
          { key: 'cold', label: 'Cold / Lost', count: (stats.by_status?.cold || 0) + (stats.by_status?.lost || 0), icon: AlertCircle, accent: 'text-slate-400' },
        ].map((item) => {
          const isActive = selectedStatus === item.key;
          const IconComponent = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => setSelectedStatus(item.key)}
              className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                isActive
                  ? 'bg-gradient-to-b from-indigo-600/20 to-indigo-600/5 border-indigo-500/50 shadow-lg shadow-indigo-600/10'
                  : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/90'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-slate-400 font-medium">{item.label}</span>
                <IconComponent className={`w-3.5 h-3.5 ${item.accent} opacity-70 group-hover:opacity-100 transition-opacity`} />
              </div>
              <div className={`text-xl font-bold tracking-tight ${isActive ? 'text-white' : 'text-slate-200'}`}>
                {item.count}
              </div>
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 shadow-sm" />
              )}
            </button>
          );
        })}
      </div>

      {/* Filter & Search Bar */}
      <div className="p-3.5 bg-slate-900/70 border border-slate-800/80 rounded-2xl flex flex-col md:flex-row gap-3 items-center justify-between backdrop-blur-md">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by guest name, phone, or notes..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </form>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          {/* Custom Hotel Dropdown */}
          <div className="w-full md:w-56">
            <StandaloneSelect
              value={selectedHotel}
              onChange={(val) => setSelectedHotel(val)}
              placeholder="All Hotels"
              searchable={hotels.length > 4}
              options={[
                { value: '', label: 'All Hotels' },
                ...hotels.map((h) => ({
                  value: h.hotel_id,
                  label: h.name || h.hotel_name || 'Hotel Property',
                  subLabel: h.contact?.city || h.city || 'Hotel',
                })),
              ]}
            />
          </div>

          <button
            onClick={() => { setSearch(''); setSelectedHotel(''); setSelectedStatus(''); }}
            className="text-xs font-semibold text-slate-400 hover:text-white px-3.5 py-2.5 border border-slate-800 rounded-xl bg-slate-950/50 hover:bg-slate-800/60 transition-colors shrink-0"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/70 text-xs font-semibold text-slate-400 border-b border-slate-800/80 uppercase tracking-wider">
              <tr>
                <th className="p-4 w-12 text-center">
                  <button onClick={toggleSelectAll} className="text-slate-400 hover:text-white">
                    {selectedLeads.size > 0 && selectedLeads.size === leads.length ? (
                      <CheckSquare className="w-4 h-4 text-indigo-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-4">Guest</th>
                <th className="p-4">Hotel</th>
                <th className="p-4">Status</th>
                <th className="p-4">Lead Details</th>
                <th className="p-4">Calls</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    Loading CRM leads...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-16 text-center text-slate-500">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4">
                      <Users className="w-7 h-7" />
                    </div>
                    <div className="text-base font-semibold text-slate-200 mb-1">
                      No leads found in this view
                    </div>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
                      Add a prospective guest manually or load sample guest leads to start testing voice calls.
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={handleSeedSampleLeads}
                        disabled={actionLoading}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-all cursor-pointer"
                      >
                        {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-indigo-400" />}
                        Load 7 Sample Test Leads
                      </button>
                      <button
                        onClick={() => setAddModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        Add New Lead
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const isChecked = selectedLeads.has(lead.lead_id);
                  const st = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;
                  return (
                    <tr
                      key={lead.lead_id}
                      className={`hover:bg-slate-800/40 transition-colors ${isChecked ? 'bg-indigo-600/5' : ''}`}
                    >
                      <td className="p-4 text-center">
                        <button onClick={() => toggleSelectLead(lead.lead_id)} className="text-slate-400 hover:text-white">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-indigo-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="p-4 font-medium text-white">
                        <div>{lead.guest_name}</div>
                        <div className="text-xs text-slate-400 font-mono">{lead.phone_number}</div>
                      </td>
                      <td className="p-4 text-slate-300">
                        {lead.hotel_name || <span className="text-slate-500 italic">Unassigned</span>}
                      </td>
                      <td className="p-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${st.bg}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="p-4 max-w-xs truncate text-xs text-slate-400" title={lead.lead_details}>
                        {lead.lead_details || '—'}
                      </td>
                      <td className="p-4 text-xs">
                        <span className="font-semibold text-slate-200">{lead.call_count || 0}</span>
                        {lead.last_called_at && (
                          <div className="text-[10px] text-slate-500">
                            {new Date(lead.last_called_at).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => setCallModalLead(lead)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          Call
                        </button>
                        <button
                          onClick={() => handleDelete(lead.lead_id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                          title="Delete lead"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {callModalLead && (
        <ConfirmCallModal
          lead={callModalLead}
          hotels={hotels}
          onClose={() => setCallModalLead(null)}
          onCallTriggered={(res) => {
            setCallModalLead(null);
            showNotification(`Call triggered to ${callModalLead.guest_name}!`);
            fetchLeads();
          }}
        />
      )}

      {addModalOpen && (
        <AddLeadModal
          hotels={hotels}
          onClose={() => setAddModalOpen(false)}
          onLeadCreated={() => {
            setAddModalOpen(false);
            showNotification('New lead successfully added to CRM');
            fetchLeads();
          }}
        />
      )}
    </div>
  );
}
