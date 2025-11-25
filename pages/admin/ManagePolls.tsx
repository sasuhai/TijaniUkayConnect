
import React, { FC, useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabaseService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { IconTrash, IconPlus, IconPencil } from '../../components/icons';
import { formatDate, toYyyyMmDd, getErrorMessage } from '../../utils/helpers';

interface PollOption {
    id: string;
    text: string;
}

interface AdminPoll {
    id: string;
    question: string;
    end_date: string;
    created_at: string;
    options: PollOption[];
}

interface FormOption {
    id?: string; // id is present if it's an existing option being edited
    text: string;
}

export const ManagePolls: FC = () => {
    const [polls, setPolls] = useState<AdminPoll[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [pollToDelete, setPollToDelete] = useState<AdminPoll | null>(null);

    // Edit State
    const [editingPoll, setEditingPoll] = useState<AdminPoll | null>(null);

    // Form State
    const [question, setQuestion] = useState('');
    const [endDate, setEndDate] = useState(toYyyyMmDd(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))); // Default 1 week
    const [formOptions, setFormOptions] = useState<FormOption[]>([{ text: '' }, { text: '' }]);

    const fetchPolls = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('polls')
                .select('*, options:poll_options(*)')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Sort options by ID or creation order to keep them stable in the UI
            const formattedData = (data as any[]).map(poll => ({
                ...poll,
                options: (poll.options || []).sort((a: any, b: any) => a.id.localeCompare(b.id))
            }));

            if (data) setPolls(formattedData as AdminPoll[]);
        } catch (error) {
            alert(`Error fetching polls:\n${getErrorMessage(error)}`);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPolls();
    }, [fetchPolls]);

    const handleAddOption = () => {
        setFormOptions([...formOptions, { text: '' }]);
    };

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...formOptions];
        newOptions[index] = { ...newOptions[index], text: value };
        setFormOptions(newOptions);
    };

    const handleRemoveOption = (index: number) => {
        if (formOptions.length <= 2) {
            alert("A poll must have at least 2 options.");
            return;
        }
        const newOptions = formOptions.filter((_, i) => i !== index);
        setFormOptions(newOptions);
    };

    const resetForm = () => {
        setEditingPoll(null);
        setQuestion('');
        setEndDate(toYyyyMmDd(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)));
        setFormOptions([{ text: '' }, { text: '' }]);
    };

    const openEditModal = (poll: AdminPoll) => {
        setEditingPoll(poll);
        setQuestion(poll.question);
        setEndDate(toYyyyMmDd(new Date(poll.end_date)));

        // Map existing options to form options
        setFormOptions(poll.options.map(o => ({ id: o.id, text: o.text })));

        setModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!question.trim()) {
            alert("Please enter a question.");
            return;
        }

        const validOptions = formOptions.filter(o => o.text.trim().length > 0);
        if (validOptions.length < 2) {
            alert("Please provide at least 2 valid options.");
            return;
        }

        setIsSubmitting(true);
        try {
            let pollId = editingPoll?.id;

            if (editingPoll) {
                // --- UPDATE EXISTING POLL ---

                // 1. Update Poll Details
                const { error: pollError } = await supabase
                    .from('polls')
                    .update({
                        question: question,
                        end_date: new Date(endDate).toISOString()
                    })
                    .eq('id', editingPoll.id);

                if (pollError) throw pollError;

                // 2. Handle Options (Update, Insert, Delete)

                // Identify options to delete (existed in original but not in form)
                const originalIds = editingPoll.options.map(o => o.id);
                const currentIds = validOptions.map(o => o.id).filter(Boolean) as string[];
                const idsToDelete = originalIds.filter(id => !currentIds.includes(id));

                if (idsToDelete.length > 0) {
                    // Note: This might fail if foreign keys (votes) exist. 
                    // Ideally, we catch specific FK errors, but for now we alert generally if it fails.
                    const { error: deleteError } = await supabase
                        .from('poll_options')
                        .delete()
                        .in('id', idsToDelete);

                    if (deleteError) {
                        console.warn("Could not delete some options (likely due to existing votes):", deleteError);
                        alert("Some removed options could not be deleted because residents have already voted for them.");
                    }
                }

                // Upsert (Update existing or Insert new)
                for (const opt of validOptions) {
                    if (opt.id) {
                        // Update existing
                        await supabase.from('poll_options').update({ text: opt.text }).eq('id', opt.id);
                    } else {
                        // Insert new
                        await supabase.from('poll_options').insert({ poll_id: editingPoll.id, text: opt.text });
                    }
                }

            } else {
                // --- CREATE NEW POLL ---
                const { data: pollData, error: pollError } = await supabase
                    .from('polls')
                    .insert({
                        question: question,
                        end_date: new Date(endDate).toISOString()
                    })
                    .select()
                    .single();

                if (pollError) throw pollError;
                pollId = pollData.id;

                // Create Options
                const optionsPayload = validOptions.map(opt => ({
                    poll_id: pollId,
                    text: opt.text
                }));

                const { error: optionsError } = await supabase
                    .from('poll_options')
                    .insert(optionsPayload);

                if (optionsError) throw optionsError;
            }

            setModalOpen(false);
            resetForm();
            await fetchPolls();

        } catch (error) {
            console.error("Error saving poll:", error);
            alert(`Failed to save poll:\n${getErrorMessage(error)}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!pollToDelete) return;

        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('polls').delete().eq('id', pollToDelete.id);
            if (error) throw error;
            await fetchPolls();
            setDeleteModalOpen(false);
            setPollToDelete(null);
        } catch (error) {
            alert(`Failed to delete poll:\n${getErrorMessage(error)}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Manage Community Polls</h2>
                <Button onClick={() => { resetForm(); setModalOpen(true); }}>
                    <IconPlus className="h-5 w-5 mr-2" /> Create Poll
                </Button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th className="px-6 py-3">Question</th>
                            <th className="px-6 py-3">End Date</th>
                            <th className="px-6 py-3">Options</th>
                            <th className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={4} className="text-center p-4"><Spinner /></td></tr>
                        ) : polls.length === 0 ? (
                            <tr><td colSpan={4} className="text-center p-4">No polls found.</td></tr>
                        ) : (
                            polls.map(poll => (
                                <tr key={poll.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{poll.question}</td>
                                    <td className="px-6 py-4">{formatDate(poll.end_date)}</td>
                                    <td className="px-6 py-4 text-xs text-gray-500">
                                        <ul className="list-disc pl-4">
                                            {poll.options?.map(opt => (
                                                <li key={opt.id}>{opt.text}</li>
                                            ))}
                                        </ul>
                                    </td>
                                    <td className="px-6 py-4 flex space-x-2">
                                        <button onClick={() => openEditModal(poll)} className="text-blue-600 hover:text-blue-800" title="Edit Poll">
                                            <IconPencil className="h-5 w-5" />
                                        </button>
                                        <button onClick={() => { setPollToDelete(poll); setDeleteModalOpen(true); }} className="text-red-600 hover:text-red-800" title="Delete Poll">
                                            <IconTrash className="h-5 w-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={editingPoll ? "Edit Poll" : "Create New Poll"}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Question"
                        id="poll-question"
                        value={question}
                        onChange={e => setQuestion(e.target.value)}
                        required
                        placeholder="e.g., What new facility do you want?"
                    />

                    <Input
                        label="End Date"
                        id="poll-end-date"
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        required
                        min={toYyyyMmDd(new Date())}
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
                        <div className="space-y-2">
                            {formOptions.map((opt, idx) => (
                                <div key={idx} className="flex items-center space-x-2">
                                    <input
                                        type="text"
                                        value={opt.text}
                                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-green focus:border-brand-green sm:text-sm"
                                        placeholder={`Option ${idx + 1}`}
                                        required
                                    />
                                    {formOptions.length > 2 && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveOption(idx)}
                                            className="text-red-500 hover:text-red-700"
                                            title="Remove option"
                                        >
                                            <IconTrash className="h-5 w-5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={handleAddOption}
                            className="mt-2 text-sm text-brand-green font-semibold hover:text-green-700 flex items-center"
                        >
                            <IconPlus className="h-4 w-4 mr-1" /> Add Option
                        </button>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4 border-t mt-4">
                        <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Spinner /> : (editingPoll ? 'Update Poll' : 'Create Poll')}
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isDeleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Confirm Deletion">
                {pollToDelete && (
                    <div>
                        <p className="mb-6 text-gray-700">
                            Are you sure you want to delete the poll <span className="font-bold">"{pollToDelete.question}"</span>? All votes will be lost and this action cannot be undone.
                        </p>
                        <div className="flex justify-end space-x-4">
                            <Button variant="secondary" onClick={() => setDeleteModalOpen(false)} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button variant="danger" onClick={handleDelete} disabled={isSubmitting}>
                                {isSubmitting ? <Spinner /> : 'Yes, Delete'}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </Card>
    );
};
