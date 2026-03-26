import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Calendar as CalendarIcon, MapPin, Plus, Lock } from 'lucide-react';

const CalendarManagementPage = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // We mock existing events API fetch for now or use /api/events if available
        const fetchEvents = async () => {
            try {
                const { data } = await api.get('/events');
                setEvents(data.data || []);
            } catch (err) {
                console.error('Events fetch error, ignoring for UI mockup:', err);
                // Fallback dummy data for visualization
                setEvents([
                    { _id: '1', title: 'Inter-Hostel Badminton', date: new Date().toISOString(), type: 'sports', facility: { name: 'Badminton Court 1' }, startTime: '16:00', endTime: '19:00' },
                    { _id: '2', title: 'Maintenance Block', date: new Date(Date.now() + 86400000).toISOString(), type: 'block', facility: { name: 'Swimming Pool' }, startTime: '06:00', endTime: '12:00' }
                ]);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, []);

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Calendar Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage institute events and facility availability.</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 shadow-sm">
                        <Lock size={16} /> Block Slot
                    </button>
                    <button className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-brand-600 shadow-sm">
                        <Plus size={16} /> Create Event
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 min-h-[500px]">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                            <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                <CalendarIcon size={20} className="text-brand-500" /> Upcoming Schedule
                            </h2>
                            <select className="border-gray-200 rounded-lg text-sm bg-gray-50 py-1.5 px-3">
                                <option>All Facilities</option>
                                <option>Badminton Court</option>
                                <option>Swimming Pool</option>
                            </select>
                        </div>

                        <div className="space-y-4">
                            {events.map(ev => (
                                <div key={ev._id} className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-gray-100 hover:border-brand-200 transition-colors bg-gray-50/50">
                                    <div className="w-24 shrink-0 text-center sm:text-left sm:border-r border-gray-200 sm:pr-4">
                                        <p className="font-bold text-brand-600 text-xl">{new Date(ev.date).getDate()}</p>
                                        <p className="text-xs font-semibold text-gray-500 uppercase">{new Date(ev.date).toLocaleString('default', { month: 'short' })}</p>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-bold text-gray-800">{ev.title}</h3>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${ev.type === 'block' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                                {ev.type === 'block' ? 'Blocked' : 'Event'}
                                            </span>
                                        </div>
                                        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 font-medium">
                                            <span className="flex items-center gap-1.5"><MapPin size={14} /> {ev.facility?.name || 'Multiple Venues'}</span>
                                            <span className="flex items-center gap-1.5"><CalendarIcon size={14} /> {ev.startTime} - {ev.endTime}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {events.length === 0 && (
                            <p className="text-center text-gray-500 py-10">No upcoming events found.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CalendarManagementPage;
