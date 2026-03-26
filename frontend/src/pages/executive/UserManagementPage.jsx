import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { Users, Search, Edit2, Check, X, Shield } from 'lucide-react';

const UserManagementPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [page, setPage] = useState(1);
    const limit = 10;

    // Edit Role Modal
    const [editingUser, setEditingUser] = useState(null);
    const [newRoles, setNewRoles] = useState([]);
    const [saving, setSaving] = useState(false);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/executive/users');
            setUsers(data.data?.users || data.data || []);
        } catch (err) {
            setError('Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleOpenEdit = (user) => {
        setEditingUser(user);
        setNewRoles(user.roles || ['student']);
    };

    const handleSaveRoles = async () => {
        setSaving(true);
        try {
            await api.patch(`/executive/users/${editingUser._id}/roles`, { roles: newRoles });
            setUsers(users.map(u => u._id === editingUser._id ? { ...u, roles: newRoles } : u));
            setEditingUser(null);
        } catch (err) {
            alert('Failed to update roles');
        } finally {
            setSaving(false);
        }
    };

    const filteredData = useMemo(() => {
        let result = users;
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(u => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
        }
        if (roleFilter !== 'all') {
            result = result.filter(u => u.roles?.includes(roleFilter));
        }
        return result;
    }, [users, search, roleFilter]);

    const paginatedData = filteredData.slice((page - 1) * limit, page * limit);
    const totalPages = Math.ceil(filteredData.length / limit);

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">User Management</h1>

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-brand-500"
                    />
                </div>
                <select
                    value={roleFilter}
                    onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
                    className="border border-gray-200 py-2 px-4 rounded-lg text-sm"
                >
                    <option value="all">All Roles</option>
                    <option value="student">Student</option>
                    <option value="coordinator">Coordinator</option>
                    <option value="executive">Executive</option>
                </select>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden text-sm w-full">
                {loading ? (
                    <div className="p-10 text-center text-gray-500">Loading...</div>
                ) : (
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
                            <tr>
                                <th className="px-6 py-4 font-semibold">User Details</th>
                                <th className="px-6 py-4 font-semibold">Roles</th>
                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {paginatedData.map(user => (
                                <tr key={user._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <p className="font-semibold text-gray-800">{user.name}</p>
                                        <p className="text-xs text-gray-500">{user.email}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-1.5 flex-wrap">
                                            {user.roles?.map(r => (
                                                <span key={r} className={`px-2 py-1 rounded text-xs font-semibold uppercase ${r === 'executive' ? 'bg-purple-100 text-purple-700' : r === 'coordinator' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{r}</span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleOpenEdit(user)} className="text-brand-500 hover:bg-brand-50 p-2 rounded-lg transition-colors">
                                            <Edit2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {editingUser && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                        <div className="flex items-center gap-2 mb-4">
                            <Shield className="text-brand-500" />
                            <h3 className="text-lg font-bold">Edit Roles: {editingUser.name}</h3>
                        </div>
                        <div className="space-y-3 mb-6">
                            {['student', 'coordinator', 'executive'].map(r => (
                                <label key={r} className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-gray-50">
                                    <input
                                        type="checkbox"
                                        checked={newRoles.includes(r)}
                                        onChange={(e) => {
                                            if (e.target.checked) setNewRoles([...newRoles, r]);
                                            else setNewRoles(newRoles.filter(role => role !== r));
                                        }}
                                        className="w-4 h-4 text-brand-500 rounded focus:ring-brand-500"
                                    />
                                    <span className="capitalize text-sm font-semibold">{r}</span>
                                </label>
                            ))}
                        </div>
                        <div className="flex justify-end gap-3 border-t pt-4">
                            <button onClick={() => setEditingUser(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                            <button onClick={handleSaveRoles} disabled={saving} className="px-6 py-2 bg-brand-500 text-white text-sm font-semibold rounded-xl hover:bg-brand-600">
                                {saving ? 'Saving...' : 'Save Roles'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default UserManagementPage;
