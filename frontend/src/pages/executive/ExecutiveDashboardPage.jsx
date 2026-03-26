import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
    AlertTriangle,
    ClipboardList,
    CalendarDays,
    CreditCard,
    Users,
    Activity,
    MessageSquare,
    ShieldAlert,
    ChevronRight,
    TrendingUp,
    Settings,
    Plus
} from 'lucide-react';

const MetricTile = ({ title, value, icon: Icon, colorClass, linkTo }) => (
    <Link to={linkTo} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-brand-200 transition-colors block group">
        <div className="flex items-start justify-between">
            <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
                <p className={`text-2xl font-bold mt-2 ${colorClass || 'text-gray-800'}`}>{value}</p>
            </div>
            <div className={`p-2 rounded-xl bg-gray-50 group-hover:bg-brand-50 transition-colors`}>
                <Icon size={20} className="text-gray-400 group-hover:text-brand-500" />
            </div>
        </div>
    </Link>
);

const ExecutiveDashboardPage = () => {
    const { user } = useAuth();
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const { data } = await api.get('/executive/dashboard');
                setDashboard(data.data);
            } catch (err) {
                console.error('Executive dashboard fetch error:', err);
                setError(err.response?.data?.message || 'Failed to load executive dashboard');
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
                    <p className="text-sm text-gray-500">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-4 text-red-600 text-sm max-w-md text-center">
                    <AlertTriangle size={24} className="mx-auto mb-2" />
                    {error}
                </div>
            </div>
        );
    }

    const {
        pendingCounts = {},
        systemHealth = {},
        feedbackSummary = {},
        recentActions = []
    } = dashboard || {};

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ═══════════════════════════════════════════════
          LEFT COLUMN (2/3)
          ═══════════════════════════════════════════════ */}
            <div className="lg:col-span-2 space-y-6">

                {/* ── Pending Approvals Summary ─────────────────── */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-bold text-gray-800">Pending Approvals</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <MetricTile
                            title="Venues & Practices"
                            value={pendingCounts.venues || 0}
                            icon={ClipboardList}
                            colorClass={pendingCounts.venues > 0 ? "text-amber-500" : "text-gray-800"}
                            linkTo="/executive/approvals"
                        />
                        <MetricTile
                            title="Event Requests"
                            value={pendingCounts.events || 0}
                            icon={CalendarDays}
                            colorClass={pendingCounts.events > 0 ? "text-amber-500" : "text-gray-800"}
                            linkTo="/executive/calendar"
                        />
                        <MetricTile
                            title="Subscriptions"
                            value={pendingCounts.subscriptions || 0}
                            icon={CreditCard}
                            colorClass={pendingCounts.subscriptions > 0 ? "text-amber-500" : "text-gray-800"}
                            linkTo="/executive/approvals"
                        />
                    </div>
                </div>

                {/* ── System Health & KPIs ──────────────────────── */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h2 className="text-base font-bold text-gray-800 mb-4">System Overview</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-50 rounded-xl px-4 py-3">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Today's Bookings</p>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-lg font-bold text-gray-800">{systemHealth.todayBookingCount || 0}</p>
                                <TrendingUp size={14} className="text-brand-500" />
                            </div>
                        </div>
                        <div className="bg-gray-50 rounded-xl px-4 py-3">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total Users</p>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-lg font-bold text-gray-800">{systemHealth.totalRegisteredUsers || 0}</p>
                                <Users size={14} className="text-brand-500" />
                            </div>
                        </div>
                        <div className="bg-gray-50 rounded-xl px-4 py-3">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Gym Capacity</p>
                            <p className="text-lg font-bold text-gray-800 mt-1">
                                {systemHealth.gymOccupancy?.currentOccupancy || 0} / {systemHealth.gymOccupancy?.totalCapacity || 0}
                            </p>
                        </div>
                        <div className="bg-gray-50 rounded-xl px-4 py-3">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Pool Capacity</p>
                            <p className="text-lg font-bold text-gray-800 mt-1">
                                {systemHealth.poolOccupancy?.currentOccupancy || 0} / {systemHealth.poolOccupancy?.totalCapacity || 0}
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── Recent Activity List ──────────────────────── */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-bold text-gray-800">Recent Admin Actions</h2>
                        <Link to="/executive/audit-log" className="text-xs font-semibold text-brand-500 hover:text-brand-600 transition-colors">
                            View Audit Log
                        </Link>
                    </div>

                    {recentActions.length > 0 ? (
                        <div className="space-y-4">
                            {recentActions.slice(0, 5).map((action, i) => (
                                <div key={action._id || i} className="flex items-start gap-4 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                                    <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <Activity size={14} className="text-brand-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 truncate">
                                            {action.actor?.name || 'System Admin'}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {action.action?.replace(/_/g, ' ')} <span className="text-gray-400">• {action.targetType}</span>
                                        </p>
                                    </div>
                                    <div className="text-[10px] text-gray-400 whitespace-nowrap">
                                        {action.createdAt ? new Date(action.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6">
                            <Activity size={24} className="text-gray-300 mx-auto mb-2" />
                            <p className="text-xs text-gray-400">No recent actions found in audit log</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ═══════════════════════════════════════════════
          RIGHT COLUMN (1/3)
          ═══════════════════════════════════════════════ */}
            <div className="space-y-6">

                {/* ── Quick Actions ────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-sm font-bold text-gray-800 mb-4">Quick Actions</h3>
                    <div className="space-y-2">
                        <Link to="/executive/coordinators" className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50 transition-colors group">
                            <div className="flex items-center gap-3">
                                <Plus size={16} className="text-brand-500" />
                                <span className="text-sm font-semibold text-gray-700 group-hover:text-brand-700">Assign Coordinator</span>
                            </div>
                            <ChevronRight size={16} className="text-gray-400 group-hover:text-brand-500" />
                        </Link>
                        <Link to="/executive/calendar" className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50 transition-colors group">
                            <div className="flex items-center gap-3">
                                <CalendarDays size={16} className="text-brand-500" />
                                <span className="text-sm font-semibold text-gray-700 group-hover:text-brand-700">Manage Calendar</span>
                            </div>
                            <ChevronRight size={16} className="text-gray-400 group-hover:text-brand-500" />
                        </Link>
                        <Link to="/executive/settings" className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50 transition-colors group">
                            <div className="flex items-center gap-3">
                                <Settings size={16} className="text-brand-500" />
                                <span className="text-sm font-semibold text-gray-700 group-hover:text-brand-700">Portal Settings</span>
                            </div>
                            <ChevronRight size={16} className="text-gray-400 group-hover:text-brand-500" />
                        </Link>
                    </div>
                </div>

                {/* ── Alerts & Issues Panel ────────────────────── */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-gray-800">Alerts & Issues</h3>
                        <ShieldAlert size={16} className="text-red-500" />
                    </div>

                    <div className="space-y-3">
                        {/* Feedback Alert */}
                        <div className={`p-3 rounded-xl border ${feedbackSummary.unresolved > 0 ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100'}`}>
                            <div className="flex items-start gap-3">
                                <MessageSquare size={16} className={feedbackSummary.unresolved > 0 ? 'text-amber-500 mt-0.5' : 'text-gray-400 mt-0.5'} />
                                <div>
                                    <p className={`text-sm font-bold ${feedbackSummary.unresolved > 0 ? 'text-amber-800' : 'text-gray-700'}`}>
                                        {feedbackSummary.unresolved || 0} Unresolved Tickets
                                    </p>
                                    <p className={`text-xs mt-0.5 ${feedbackSummary.unresolved > 0 ? 'text-amber-600' : 'text-gray-500'}`}>
                                        {feedbackSummary.resolvedThisWeek || 0} issues resolved this week.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Penalties Alert */}
                        <div className={`p-3 rounded-xl border ${systemHealth.activePenaltyCount > 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                            <div className="flex items-start gap-3">
                                <AlertTriangle size={16} className={systemHealth.activePenaltyCount > 0 ? 'text-red-500 mt-0.5' : 'text-emerald-500 mt-0.5'} />
                                <div>
                                    <p className={`text-sm font-bold ${systemHealth.activePenaltyCount > 0 ? 'text-red-800' : 'text-emerald-800'}`}>
                                        {systemHealth.activePenaltyCount || 0} Active Penalties
                                    </p>
                                    <p className={`text-xs mt-0.5 ${systemHealth.activePenaltyCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                        {systemHealth.activeSuspensionCount || 0} strict suspensions currently enforced.
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>

                    {systemHealth.activePenaltyCount > 0 && (
                        <div className="mt-4 text-center">
                            <Link to="/executive/penalties" className="text-xs font-semibold text-brand-500 hover:text-brand-600 transition-colors">
                                Manage Penalties
                            </Link>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default ExecutiveDashboardPage;
