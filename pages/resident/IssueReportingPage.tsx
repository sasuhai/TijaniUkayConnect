
import React, { FC, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabaseService';
import type { Issue, IssueCategory, IssueStatus } from '../../types';
import { getErrorMessage, formatDate } from '../../utils/helpers';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Spinner, FullPageSpinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';

const StatusBadge: FC<{ status: IssueStatus }> = ({ status }) => {
    const statusClasses = {
        'New': 'bg-blue-100 text-blue-800',
        'In Progress': 'bg-yellow-100 text-yellow-800',
        'Resolved': 'bg-green-100 text-green-800',
        'Closed': 'bg-gray-100 text-gray-800',
    };
    return (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClasses[status]}`}>
            {status}
        </span>
    );
};

export const IssueReportingPage: FC = () => {
    const { user } = useAuth();
    const [issues, setIssues] = useState<Issue[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isModalOpen, setModalOpen] = useState(false);
    const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

    const categories: IssueCategory[] = ['Maintenance', 'Security', 'Landscaping', 'Facilities', 'Other'];
    const initialFormState = {
        title: '',
        category: 'Maintenance' as IssueCategory,
        description: '',
    };
    const [formData, setFormData] = useState(initialFormState);

    const fetchIssues = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('issues')
                .select('*')
                .eq('resident_id', user.id)
                .order('created_at', { ascending: false });
            
            if (error) {
                if (error.code === 'PGRST205' || error.code === '42P01') {
                    console.warn("Issues table not found. Feature unavailable.");
                    setIssues([]); 
                    return;
                }
                throw error;
            }
            if (data) setIssues(data as Issue[]);
        } catch (error) {
            alert(`Error fetching your issues:\n${getErrorMessage(error)}`);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchIssues();
    }, [fetchIssues]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user) {
            alert("Authentication error.");
            return;
        }
        setIsSubmitting(true);
        try {
            const issueData = {
                resident_id: user.id,
                resident_name: user.full_name,
                title: formData.title,
                category: formData.category,
                description: formData.description,
                status: 'New' as IssueStatus,
            };
            const { error } = await supabase.from('issues').insert(issueData);
            
            if (error) {
                if (error.code === 'PGRST205' || error.code === '42P01') {
                    alert("System Update Required: The database table for 'issues' is missing. Please run the provided setup SQL in Supabase.");
                    return;
                }
                throw error;
            }
            
            await fetchIssues();
            setFormData(initialFormState);
        } catch (error) {
            alert(`Failed to submit issue:\n${getErrorMessage(error)}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const viewIssueDetails = (issue: Issue) => {
        setSelectedIssue(issue);
        setModalOpen(true);
    };

    if (loading) {
        return <FullPageSpinner message="Loading your reported issues..." />;
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-brand-dark mb-6">Report an Issue</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <Card className="p-6">
                        <h2 className="text-xl font-semibold mb-4">New Issue Report</h2>
                        <form onSubmit={handleFormSubmit} className="space-y-4">
                            <Input label="Subject / Title" name="title" value={formData.title} onChange={handleInputChange} required />
                            <Select label="Category" name="category" value={formData.category} onChange={handleInputChange} required>
                                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </Select>
                            <Textarea label="Describe the Issue" name="description" value={formData.description} onChange={handleInputChange} required rows={5} />
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? <Spinner /> : 'Submit Report'}
                            </Button>
                        </form>
                    </Card>
                </div>
                <div className="lg:col-span-2">
                    <h2 className="text-xl font-semibold mb-4">My Submitted Issues</h2>
                    <div className="space-y-4">
                        {issues.length === 0 ? (
                             <Card className="p-6 text-center text-gray-500">
                                 <p>You have not reported any issues yet.</p>
                             </Card>
                        ) : issues.map(issue => (
                            <Card key={issue.id} className="p-4 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => viewIssueDetails(issue)}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm text-gray-500">{issue.category}</p>
                                        <p className="font-bold text-lg text-brand-dark">{issue.title}</p>
                                        <p className="text-sm text-gray-600 mt-1">Submitted on: {formatDate(issue.created_at)}</p>
                                    </div>
                                    <StatusBadge status={issue.status} />
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title="Issue Details">
                {selectedIssue && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-brand-dark">{selectedIssue.title}</h3>
                            <StatusBadge status={selectedIssue.status} />
                        </div>
                        <p><span className="font-semibold">Category:</span> {selectedIssue.category}</p>
                        <p><span className="font-semibold">Submitted:</span> {formatDate(selectedIssue.created_at)}</p>
                        <div>
                            <p className="font-semibold">Description:</p>
                            <p className="whitespace-pre-wrap bg-gray-50 p-3 rounded-md mt-1">{selectedIssue.description}</p>
                        </div>
                         {selectedIssue.admin_notes && (
                            <div>
                                <p className="font-semibold">Admin Notes:</p>
                                <p className="whitespace-pre-wrap bg-yellow-50 p-3 rounded-md mt-1">{selectedIssue.admin_notes}</p>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
};
