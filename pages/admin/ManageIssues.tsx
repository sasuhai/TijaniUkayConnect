
import React, { FC, useState, useMemo } from 'react';
import type { Issue, IssueStatus, IssuePriority } from '../../types';
import { useAdminData } from '../../hooks/useAdminData';
import { formatDate } from '../../utils/helpers';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { IconPencil, IconTrash, IconDocument } from '../../components/icons';

const StatusBadge: FC<{ status: IssueStatus }> = ({ status }) => {
    const statusClasses = {
        'New': 'bg-blue-100 text-blue-800',
        'In Progress': 'bg-yellow-100 text-yellow-800',
        'Resolved': 'bg-green-100 text-green-800',
        'Closed': 'bg-gray-100 text-gray-800',
    };
    return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClasses[status]}`}>{status}</span>;
};

const PriorityBadge: FC<{ priority: IssuePriority }> = ({ priority }) => {
    const priorityClasses = {
        'Low': 'bg-gray-100 text-gray-700',
        'Medium': 'bg-blue-100 text-blue-700',
        'High': 'bg-orange-100 text-orange-700',
        'Critical': 'bg-red-100 text-red-700',
    };
    return (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${priorityClasses[priority || 'Medium']}`}>
            {priority || 'Medium'}
        </span>
    );
};

export const ManageIssues: FC = () => {
    const textSearchColumns = useMemo(() => ['title', 'resident_name', 'description', 'category'], []);
    const { items: issues, loading, filter, setFilter, sort, handleSort, updateItem, deleteItem } = useAdminData<Issue>('issues', textSearchColumns, 'created_at');

    const [isModalOpen, setModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<Issue | null>(null);
    const [formData, setFormData] = useState<{ status: IssueStatus; admin_notes: string }>({ status: 'New', admin_notes: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const statuses: IssueStatus[] = ['New', 'In Progress', 'Resolved', 'Closed'];

    const openModal = (item: Issue) => {
        setCurrentItem(item);
        setFormData({
            status: item.status,
            admin_notes: item.admin_notes || '',
        });
        setModalOpen(true);
    };

    const closeModal = () => {
        setCurrentItem(null);
        setModalOpen(false);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!currentItem) return;
        setIsSubmitting(true);

        const updateData: Partial<Issue> = {
            status: formData.status,
            admin_notes: formData.admin_notes,
        };

        if (currentItem.status !== 'Resolved' && formData.status === 'Resolved') {
            updateData.resolved_at = new Date().toISOString();
        }

        const success = await updateItem(currentItem.id, updateData);
        setIsSubmitting(false);
        if (success) {
            closeModal();
        }
    };

    return (
        <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Manage Resident Issues</h2>
                <Input label="" id="search-issues" placeholder="Search..." value={filter} onChange={e => setFilter(e.target.value)} />
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleSort('title')}>Issue / Resident</th>
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleSort('category')}>Category</th>
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleSort('priority')}>Priority</th>
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleSort('status')}>Status</th>
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleSort('created_at')}>Reported</th>
                            <th scope="col" className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? <tr><td colSpan={6} className="text-center p-4"><Spinner /></td></tr> : issues.map(issue => (
                            <tr key={issue.id} className="bg-white border-b">
                                <td className="px-6 py-4 font-medium text-gray-900">
                                    <div className="flex items-center">
                                        {issue.photo_url && <IconDocument className="h-4 w-4 text-gray-400 mr-2" />}
                                        <div>
                                            {issue.title}
                                            <div className="font-normal text-gray-500">{issue.resident_name}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">{issue.category}</td>
                                <td className="px-6 py-4"><PriorityBadge priority={issue.priority} /></td>
                                <td className="px-6 py-4"><StatusBadge status={issue.status} /></td>
                                <td className="px-6 py-4">{formatDate(issue.created_at)}</td>
                                <td className="px-6 py-4 flex space-x-2">
                                    <button onClick={() => openModal(issue)} className="text-blue-600 hover:text-blue-800"><IconPencil className="h-5 w-5" /></button>
                                    <button onClick={() => deleteItem(issue.id)} className="text-red-600 hover:text-red-800"><IconTrash className="h-5 w-5" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={closeModal} title="Update Issue">
                {currentItem && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-semibold text-lg">{currentItem.title}</h3>
                                <p className="text-sm text-gray-500">Reported by {currentItem.resident_name} on {formatDate(currentItem.created_at)}</p>
                            </div>
                            <PriorityBadge priority={currentItem.priority} />
                        </div>

                        {currentItem.photo_url && (
                            <div>
                                <p className="font-semibold mb-1">Attached Photo:</p>
                                <a href={currentItem.photo_url} target="_blank" rel="noopener noreferrer">
                                    <img src={currentItem.photo_url} alt="Issue" className="w-full max-h-60 object-contain rounded-lg border bg-gray-50" />
                                </a>
                            </div>
                        )}

                        <div>
                            <p className="font-semibold">Description:</p>
                            <p className="whitespace-pre-wrap bg-gray-50 p-3 rounded-md mt-1 max-h-40 overflow-y-auto">{currentItem.description}</p>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t">
                            <Select label="Update Status" name="status" value={formData.status} onChange={handleFormChange}>
                                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                            </Select>
                            <Textarea label="Admin Notes (visible to resident)" name="admin_notes" value={formData.admin_notes} onChange={handleFormChange} rows={4} />
                            <div className="flex justify-end space-x-2 pt-4">
                                <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? <Spinner /> : 'Update Issue'}
                                </Button>
                            </div>
                        </form>
                    </div>
                )}
            </Modal>
        </Card>
    );
};
