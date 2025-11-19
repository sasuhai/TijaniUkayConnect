
import React, { FC, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminData } from '../../hooks/useAdminData';
import type { UserProfile, UserStatus } from '../../types';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { IconTrash } from '../../components/icons';
import { supabase } from '../../services/supabaseService';
import { formatDate } from '../../utils/helpers';

export const ManageResidents: FC = () => {
    const { user: currentUser } = useAuth();
    const searchCols = useMemo(() => ['full_name', 'email', 'address', 'phone', 'role'], []);
    const { items: users, loading, filter, setFilter, sort, handleSort, fetchData } = useAdminData<UserProfile>('profiles', searchCols, 'full_name');
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);

    const handleStatusChange = async (user: UserProfile, status: UserStatus) => {
        const approvalDate = status === 'Active' ? new Date().toISOString() : user.approval_date;
        await supabase.from('profiles').update({ status, approval_date: approvalDate }).eq('id', user.id);
        console.log(`Email notification sent to ${user.email} about status change to ${status}`);
        fetchData();
    };
    
    const handleRoleChange = async (user: UserProfile, role: 'resident' | 'admin') => {
        if (!currentUser || user.id === currentUser.id) return;
        await supabase.from('profiles').update({ role }).eq('id', user.id);
        console.log(`Role for ${user.email} changed to ${role}`);
        fetchData();
    };

    const openDeleteModal = (user: UserProfile) => {
        setUserToDelete(user);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;
        const { error } = await supabase.from('profiles').delete().eq('id', userToDelete.id);
        
        if (error) {
            alert(`Failed to delete resident: ${error.message}`);
        } else {
            await fetchData();
        }
        
        setDeleteModalOpen(false);
        setUserToDelete(null);
    };


    return (
        <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Manage Residents</h2>
                <Input label="" id="search-resident" placeholder="Search..." value={filter} onChange={e => setFilter(e.target.value)} />
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleSort('full_name')}>Name &amp; Address</th>
                            <th scope="col" className="px-6 py-3">Contact</th>
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleSort('status')}>Status</th>
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleSort('role')}>Role</th>
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleSort('created_at')}>Registered On</th>
                            <th scope="col" className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? <tr><td colSpan={6} className="text-center p-4"><Spinner /></td></tr> : users.map(user => (
                            <tr key={user.id} className="bg-white border-b">
                                <td className="px-6 py-4 font-medium text-gray-900">
                                    {user.full_name}
                                    <div className="font-normal text-gray-500">{user.address}</div>
                                </td>
                                <td className="px-6 py-4">{user.phone}<br/>{user.email}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                        user.status === 'Active' ? 'bg-green-100 text-green-800' :
                                        user.status === 'Pending Approval' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                    }`}>{user.status}</span>
                                </td>
                                <td className="px-6 py-4 capitalize">
                                    {currentUser?.id === user.id ? (
                                        <span className="font-semibold">{user.role}</span>
                                    ) : (
                                        <select
                                            value={user.role}
                                            onChange={(e) => handleRoleChange(user, e.target.value as 'resident' | 'admin')}
                                            className="block w-full px-2 py-1 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-brand-green focus:border-brand-green sm:text-sm"
                                        >
                                            <option value="resident">Resident</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    )}
                                </td>
                                <td className="px-6 py-4">{formatDate(user.created_at)}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center space-x-2">
                                        {user.status === 'Pending Approval' && <Button onClick={() => handleStatusChange(user, 'Active')} className="text-xs py-1 px-2">Approve</Button>}
                                        {user.status === 'Active' && <Button onClick={() => handleStatusChange(user, 'Not Active')} variant="danger" className="text-xs py-1 px-2">Deactivate</Button>}
                                        {user.status === 'Not Active' && <Button onClick={() => handleStatusChange(user, 'Active')} className="text-xs py-1 px-2">Activate</Button>}
                                        <button onClick={() => openDeleteModal(user)} className="text-red-600 hover:text-red-800 p-1 rounded-md hover:bg-red-100" title="Delete Resident">
                                            <IconTrash className="h-5 w-5"/>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <Modal isOpen={isDeleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Confirm Deletion">
                {userToDelete && (
                    <div>
                        <p className="mb-6">
                            Are you sure you want to delete the profile for <span className="font-semibold">{userToDelete.full_name}</span>? This action cannot be undone.
                        </p>
                        <div className="flex justify-end space-x-4">
                            <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button variant="danger" onClick={confirmDelete}>
                                Delete
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </Card>
    );
};
