import { useState, useEffect } from 'react';
import api from '../../services/api';
import { BarChart3, TrendingUp, Users, Activity, AlertTriangle } from 'lucide-react';

const AnalyticsPage = () => {
    const [overview, setOverview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const { data } = await api.get('/executive/analytics/overview');
                setOverview(data.data);
            } catch (err) {
                console.error('Analytics fetch error:', err);
                setError('Failed to load system analytics.');
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center h-64">
                <div className="flex flex-col items-center gap-3 mt-10">
                    <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
                    <p className="text-sm text-gray-500">Compiling statistics...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-600 flex items-center gap-4 max-w-lg mx-auto mt-10">
                <AlertTriangle size={24} />
                <div>
                    <p className="font-bold text-sm">Analytics Unavailable</p>
                    <p className="text-xs">{error}</p>
                </div>
            </div>
        );
    }

    const { bookings = {}, users = {}, revenue = {} } = overview || {};

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">System Analytics</h1>
                <p className="text-sm text-gray-500 mt-1">Booking trends, utilization rates, and overall platform metrics.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center mb-4">
                        <TrendingUp size={24} />
                    </div>
                    <p className="text-sm font-semibold text-gray-500">Total Bookings (This Month)</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">{bookings.monthlyTotal || 0}</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-brand-50 text-brand-500 rounded-xl flex items-center justify-center mb-4">
                        <Users size={24} />
                    </div>
                    <p className="text-sm font-semibold text-gray-500">Active Users</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">{users.activeMonthly || 0}</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center mb-4">
                        <Activity size={24} />
                    </div>
                    <p className="text-sm font-semibold text-gray-500">Peak Utilization Hour</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">{bookings.peakHour || '18:00'}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h2 className="text-base font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <BarChart3 size={18} className="text-gray-400" />
                        Facility Usage Comparison
                    </h2>
                    <div className="space-y-6">
                        {/* Simple CSS Bar Chart Simulation */}
                        {['Badminton Court', 'Basketball Court', 'Swimming Pool', 'Gymnasium'].map((facility, idx) => {
                            const width = [85, 60, 45, 90][idx]; // Placeholder logic
                            return (
                                <div key={facility}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-semibold text-gray-700">{facility}</span>
                                        <span className="text-gray-500">{width}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div className="bg-brand-500 h-2 rounded-full transition-all" style={{ width: `${width}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h2 className="text-base font-bold text-gray-800 mb-4 pb-4 border-b border-gray-50">Quick Insights</h2>
                    <ul className="space-y-4">
                        <li className="flex gap-4">
                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                            <p className="text-sm text-gray-600">Booking volume is <strong className="text-gray-800">12% higher</strong> than last month, driven primarily by badminton courts.</p>
                        </li>
                        <li className="flex gap-4">
                            <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                            <p className="text-sm text-gray-600">No-show rates have increased to <strong className="text-red-600">8%</strong> this week. Consider enforcing penalties more strictly.</p>
                        </li>
                        <li className="flex gap-4">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                            <p className="text-sm text-gray-600">The swimming pool has optimal utilization during early morning hours (06:00 - 09:00).</p>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsPage;
