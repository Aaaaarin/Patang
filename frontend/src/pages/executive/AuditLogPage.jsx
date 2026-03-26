import { useState, useEffect } from 'react';
import api from '../../services/api';
import { FileText, Search, Activity, ChevronRight, Filter } from 'lucide-react';

const AuditLogPage = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [selectedLog, setSelectedLog] = useState(null);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/executive/audit-log?page=${page}&limit=15&search=${search}`);
            setLogs(data.data?.logs || data.data || []);
            setTotalPages(data.data?.totalPages || 1);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, search]);

    return (
        <div className="max-w-6xl mx-auto flex flex-col h-[calc(100vh-120px)] overflow-hidden">
            <div className="shrink-0 mb-6">
                <h1 className="text-2xl font-bold text-gray-800">System Audit Log</h1>
                <p className="text-sm text-gray-500">Immutable trail of all executive actions.</p>
            </div>

            <div className="bg-white px-4 py-3 rounded-t-2xl border border-gray-100 shadow-sm shrink-0">
                <div className="relative w-full md:w-80">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by user or action..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-brand-500"
                    />
                </div>
            </div>

            <div className="flex-1 min-h-0 flex bg-white border border-gray-100 border-t-0 rounded-b-2xl shadow-sm text-sm overflow-hidden">

                {/* Log List */}
                <div className="flex-1 border-r border-gray-100 flex flex-col">
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="p-10 text-center flex items-center justify-center h-full">
                                <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
                            </div>
                        ) : logs.length === 0 ? (
                            <div className="p-10 text-center text-gray-500">No logs found.</div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {logs.map((log) => (
                                    <div
                                        key={log._id}
                                        onClick={() => setSelectedLog(log)}
                                        className={`p-4 hover:bg-brand-50 cursor-pointer flex items-center gap-4 transition-colors ${selectedLog?._id === log._id ? 'bg-brand-50' : ''}`}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                                            <Activity size={14} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-800 truncate">{log.actor?.name || 'Unknown User'}</p>
                                            <p className="text-xs text-brand-600 font-medium truncate">{log.action}</p>
                                        </div>
                                        <div className="text-right shrink-0 pr-2">
                                            <p className="text-[11px] text-gray-400">{new Date(log.createdAt).toLocaleDateString()}</p>
                                            <p className="text-[11px] text-gray-400">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                        <ChevronRight size={16} className="text-gray-300" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    <div className="p-3 border-t border-gray-100 bg-gray-50 shrink-0 flex justify-between items-center text-xs">
                        <span className="font-semibold text-gray-500">Page {page} of {totalPages}</span>
                        <div className="flex gap-2">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 bg-white border rounded hover:bg-gray-50 disabled:opacity-50">Prev</button>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 bg-white border rounded hover:bg-gray-50 disabled:opacity-50">Next</button>
                        </div>
                    </div>
                </div>

                {/* Detail Panel */}
                <div className="w-96 hidden md:block bg-gray-50 overflow-y-auto">
                    {selectedLog ? (
                        <div className="p-6">
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Log Details</h3>
                            <div className="bg-white border text-sm border-gray-200 rounded-xl p-4 space-y-4 shadow-sm">
                                <div>
                                    <p className="text-xs text-gray-400 font-semibold mb-1">ACTOR</p>
                                    <p className="font-medium text-gray-800">{selectedLog.actor?.name}</p>
                                    <p className="text-xs text-gray-500">{selectedLog.actor?.email}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-semibold mb-1">ACTION</p>
                                    <span className="inline-block px-2 py-1 bg-brand-100 text-brand-700 text-xs font-bold rounded">{selectedLog.action}</span>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-semibold mb-1">TIMESTAMP</p>
                                    <p className="font-medium text-gray-800">{new Date(selectedLog.createdAt).toLocaleString()}</p>
                                </div>
                                {selectedLog.metadata && (
                                    <div>
                                        <p className="text-xs text-gray-400 font-semibold mb-2">METADATA</p>
                                        <pre className="text-[10px] bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto">
                                            {JSON.stringify(selectedLog.metadata, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-400 flex-col gap-3 p-6 text-center">
                            <FileText size={48} className="text-gray-200" />
                            <p className="text-sm font-medium">Select an audit log entry to view detailed metadata and context.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default AuditLogPage;
