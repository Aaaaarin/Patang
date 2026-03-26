import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { Gavel, Search, CheckCircle2, ShieldAlert, AlertTriangle } from 'lucide-react';

const PenaltyManagementPage = () => {
    const [penalties, setPenalties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const limit = 10;

    // Clear Action Modal state
    const [selectedPenalty, setSelectedPenalty] = useState(null);
    const [clearing, setClearing] = useState(false);

    const fetchPenalties = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/executive/penalties');
            setPenalties(data.data?.penalties || data.data || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch penalties');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPenalties();
    }, []);

    const handleClearPenalty = async () => {
        setClearing(true);
        try {
            await api.patch(`/executive/penalties/${selectedPenalty._id}`, { status: 'cleared', action: 'clear' });
            setPenalties(prev => prev.map(p => p._id === selectedPenalty._id ? { ...p, status: 'cleared' } : p));
            setSelectedPenalty(null);
        } catch (err) {
            alert('Failed to clear penalty.');
            console.error(err);
        } finally {
            setClearing(false);
        }
    };

    const filteredData = useMemo(() => {
        let result = penalties;
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(p => p.user?.name?.toLowerCase().includes(q) || p.user?.email?.toLowerCase().includes(q) || p.reason?.toLowerCase().includes(q));
        }
        return result;
    }, [penalties, search]);

    const paginatedData = filteredData.slice((page - 1) * limit, page * limit);
    const totalPages = Math.ceil(filteredData.length / limit);

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Penalty Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage user suspensions, no-shows, and violations.</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by user or reason..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-10 text-center text-gray-500 flex flex-col items-center">
                        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin mb-3" />
                        Loading penalties...
                    </div>
                ) : error ? (
                    <div className="p-6 text-center text-red-500">{error}</div>
                ) : paginatedData.length === 0 ? (
                    <div className="p-10 text-center text-gray-500">
                        <Gavel size={32} className="mx-auto mb-3 text-gray-300" />
                        No penalties found.
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold">User</th>
                                        <th className="px-6 py-4 font-semibold">Violation Reason</th>
                                        <th className="px-6 py-4 font-semibold">Date Issued</th>
                                        <th className="px-6 py-4 font-semibold">Status</th>
                                        <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {paginatedData.map(penalty => (
                                        <tr key={penalty._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-gray-800">{penalty.user?.name || 'Unknown'}</p>
                                                <p className="text-xs text-gray-500">{penalty.user?.email}</p>
                                            </td>
                                            <td className="px-6 py-4 text-gray-700 truncate max-w-xs" title={penalty.reason}>
                                                {penalty.reason || 'No show / Rules violation'}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {new Date(penalty.createdAt || penalty.dateIssued).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                {penalty.status === 'active' ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600">
                                                        <ShieldAlert size={12} /> Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                                                        <CheckCircle2 size={12} /> Cleared
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {penalty.status === 'active' && (
                                                    <button
                                                        onClick={() => setSelectedPenalty(penalty)}
                                                        className="bg-brand-50 text-brand-600 hover:bg-brand-100 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                                                    >
                                                        Clear Penalty
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="p-4 border-t border-gray-50 flex items-center justify-between text-sm">
                                <span className="text-gray-500">Showing page {page} of {totalPages}</span>
                                <div className="flex gap-2">
                                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded bg-gray-50 hover:bg-gray-100 disabled:opacity-50 text-gray-600 font-medium">Prev</button>
                                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded bg-gray-50 hover:bg-gray-100 disabled:opacity-50 text-gray-600 font-medium">Next</button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {selectedPenalty && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                            <ShieldAlert className="text-amber-500" size={24} />
                            <h3 className="text-lg font-bold text-gray-800">Clear Penalty</h3>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-600">Are you sure you want to clear the penalty for <strong className="text-gray-900">{selectedPenalty.user?.name}</strong>? This will immediately restore their booking privileges.</p>
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                            <button disabled={clearing} onClick={() => setSelectedPenalty(null)} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800">Cancel</button>
                            <button disabled={clearing} onClick={handleClearPenalty} className="px-6 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl">
                                {clearing ? 'Clearing...' : 'Confirm Clear'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PenaltyManagementPage;
