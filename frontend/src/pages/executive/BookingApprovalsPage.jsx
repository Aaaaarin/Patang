import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import {
    AlertTriangle,
    Calendar,
    Clock,
    User,
    FileText,
    Search,
    Check,
    X,
    Building2,
    AlertCircle
} from 'lucide-react';

const BookingApprovalsPage = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filtering & Sorting
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState('newest'); // 'newest', 'oldest', 'date-asc', 'date-desc'

    // Modal State
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [actionType, setActionType] = useState(null); // 'approve' | 'reject'
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [actionError, setActionError] = useState('');

    const fetchRequests = async () => {
        setLoading(true);
        setError('');
        try {
            const { data } = await api.get('/executive/venues/pending');
            setRequests(data.data?.requests || data.data || []);
        } catch (err) {
            console.error('Fetch pending requests error:', err);
            setError(err.response?.data?.message || 'Failed to load pending requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleOpenModal = (request, type) => {
        setSelectedRequest(request);
        setActionType(type);
        setReason('');
        setActionError('');
    };

    const handleCloseModal = () => {
        setSelectedRequest(null);
        setActionType(null);
        setReason('');
        setActionError('');
    };

    const handleSubmitAction = async () => {
        if (actionType === 'reject' && !reason.trim()) {
            setActionError('A reason is required when rejecting a request.');
            return;
        }

        setSubmitting(true);
        setActionError('');

        try {
            await api.patch(`/executive/venues/${selectedRequest._id}/review`, {
                action: actionType,
                reason: reason.trim()
            });

            // Optimistic update
            setRequests((prev) => prev.filter((r) => r._id !== selectedRequest._id));
            handleCloseModal();
        } catch (err) {
            console.error(`${actionType} error:`, err);
            setActionError(err.response?.data?.message || `Failed to ${actionType} request`);
        } finally {
            setSubmitting(false);
        }
    };

    // Process data (filter + sort)
    const filteredAndSortedRequests = useMemo(() => {
        let result = [...requests];

        // Search filter
        if (searchQuery.trim()) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter((r) => {
                const facilityName = r.facility?.name?.toLowerCase() || '';
                const requesterName = r.requester?.name?.toLowerCase() || '';
                const purpose = r.purpose?.toLowerCase() || '';
                return (
                    facilityName.includes(lowerQuery) ||
                    requesterName.includes(lowerQuery) ||
                    purpose.includes(lowerQuery)
                );
            });
        }

        // Sorting
        result.sort((a, b) => {
            switch (sortOrder) {
                case 'oldest':
                    return new Date(a.createdAt) - new Date(b.createdAt);
                case 'newest':
                    return new Date(b.createdAt) - new Date(a.createdAt);
                case 'date-asc':
                    return new Date(a.date) - new Date(b.date);
                case 'date-desc':
                    return new Date(b.date) - new Date(a.date);
                default:
                    return 0;
            }
        });

        return result;
    }, [requests, searchQuery, sortOrder]);

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-IN', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* ── Header ──────────────────────────────────────── */}
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Booking Approvals</h1>
                <p className="text-sm text-gray-500 mt-1">Review and manage pending facility and venue requests.</p>
            </div>

            {/* ── Toolbar ─────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="relative w-full sm:w-96">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by venue, requester, or purpose..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                    />
                </div>
                <div className="w-full sm:w-auto flex items-center gap-3">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sort By</span>
                    <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                    >
                        <option value="newest">Newly Requested</option>
                        <option value="oldest">Oldest Requested</option>
                        <option value="date-asc">Event Date (Soonest)</option>
                        <option value="date-desc">Event Date (Latest)</option>
                    </select>
                </div>
            </div>

            {/* ── Content ─────────────────────────────────────── */}
            {loading ? (
                <div className="flex items-center justify-center h-64 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
                        <p className="text-sm text-gray-500">Loading pending requests...</p>
                    </div>
                </div>
            ) : error ? (
                <div className="flex items-center justify-center h-64 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-4 text-red-600 text-sm max-w-md text-center">
                        <AlertTriangle size={24} className="mx-auto mb-2" />
                        {error}
                    </div>
                </div>
            ) : filteredAndSortedRequests.length === 0 ? (
                <div className="flex items-center justify-center h-64 bg-white rounded-2xl border border-gray-100 shadow-sm text-center">
                    <div>
                        <ClipboardList size={48} className="text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm font-semibold">No Pending Requests</p>
                        <p className="text-xs text-gray-400 mt-1">
                            {searchQuery ? 'No requests match your search criteria.' : 'All caught up! There are no pending approvals.'}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <p className="text-sm font-semibold text-gray-500">
                        {filteredAndSortedRequests.length} Pending Approval{filteredAndSortedRequests.length !== 1 && 's'}
                    </p>
                    {filteredAndSortedRequests.map((request) => (
                        <div key={request._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
                            <div className="flex flex-col lg:flex-row justify-between gap-6">

                                {/* Left Side: Info */}
                                <div className="flex-1 space-y-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                                            <Building2 size={24} className="text-brand-500" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-800">{request.facility?.name || 'Unknown Facility'}</h3>
                                            <p className="text-sm font-medium text-amber-600 uppercase tracking-wider mt-0.5">Pending Review</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex items-start gap-3 text-sm text-gray-600">
                                            <User size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                            <div>
                                                <p className="font-semibold text-gray-800">{request.requester?.name || 'Unknown User'}</p>
                                                <p className="text-xs text-gray-400">{request.requester?.email || 'No email provided'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3 text-sm text-gray-600">
                                            <Calendar size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                            <div>
                                                <p className="font-semibold text-gray-800">{formatDate(request.date)}</p>
                                                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                                    <Clock size={12} />
                                                    {request.startTime} — {request.endTime}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        <FileText size={16} className="text-gray-400 shrink-0" />
                                        <div>
                                            <span className="font-semibold text-gray-800 mr-2">Purpose:</span>
                                            {request.purpose || 'No purpose specified'}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Actions */}
                                <div className="flex flex-col sm:flex-row lg:flex-col justify-end gap-3 shrink-0 pt-2 lg:pt-0">
                                    <button
                                        onClick={() => handleOpenModal(request, 'approve')}
                                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 transition-colors shadow-sm"
                                    >
                                        <Check size={18} />
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => handleOpenModal(request, 'reject')}
                                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-red-200 text-red-600 font-semibold rounded-xl hover:bg-red-50 hover:border-red-300 transition-colors"
                                    >
                                        <X size={18} />
                                        Reject
                                    </button>
                                </div>

                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Action Modal ────────────────────────────────── */}
            {selectedRequest && (
                <>
                    <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={handleCloseModal} />
                    <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-xl z-50 overflow-hidden">
                        <div className={`p-6 border-b ${actionType === 'approve' ? 'border-brand-100 bg-brand-50' : 'border-red-100 bg-red-50'}`}>
                            <div className="flex items-center gap-3">
                                {actionType === 'approve' ? (
                                    <Check className="text-brand-600" size={24} />
                                ) : (
                                    <AlertCircle className="text-red-600" size={24} />
                                )}
                                <h3 className={`text-lg font-bold ${actionType === 'approve' ? 'text-brand-800' : 'text-red-800'}`}>
                                    {actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
                                </h3>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <p className="text-sm text-gray-600">
                                You are about to <strong className={actionType === 'approve' ? 'text-brand-600' : 'text-red-600'}>{actionType}</strong> the venue request for <strong>{selectedRequest.facility?.name}</strong> on {formatDate(selectedRequest.date)}.
                            </p>

                            <div>
                                <label className="block text-sm font-semibold text-gray-800 mb-2">
                                    Reason / Comments {actionType === 'reject' && <span className="text-red-500">*</span>}
                                </label>
                                <textarea
                                    rows={3}
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder={actionType === 'approve' ? 'Optional comments for the requester...' : 'Provide a reason for rejection...'}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none"
                                />
                            </div>

                            {actionError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs font-semibold flex items-center gap-2">
                                    <AlertCircle size={14} />
                                    {actionError}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={handleCloseModal}
                                disabled={submitting}
                                className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitAction}
                                disabled={submitting}
                                className={`flex items-center gap-2 px-6 py-2.5 text-white font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-50 ${actionType === 'approve'
                                        ? 'bg-brand-500 hover:bg-brand-600'
                                        : 'bg-red-500 hover:bg-red-600'
                                    }`}
                            >
                                {submitting ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <span>Confirm {actionType === 'approve' ? 'Approval' : 'Rejection'}</span>
                                )}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default BookingApprovalsPage;
