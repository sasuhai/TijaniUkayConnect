
import React, { FC, useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabaseService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { IconTrash, IconPlus } from '../../components/icons';
import { formatDate, toYyyyMmDd, getErrorMessage } from '../../utils/helpers';

interface AdminPoll {
    id: string;
    question: string;
    end_date: string;
    created_at: string;
    options?: { id: string; text: string }[];
}

export const ManagePolls: FC = () => {
    const [polls, setPolls] = useState<AdminPoll[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [question, setQuestion] = useState('');
    const [endDate, setEndDate] = useState(toYyyyMmDd(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))); // Default 1 week
    const [options, setOptions] = useState<string[]>(['', '']); // Start with 2 empty options

    const fetchPolls = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('polls')
                .select('*, options:poll_options(*)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) setPolls(data as unknown as AdminPoll[]);
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
        setOptions([...options, '']);
    };

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const handleRemoveOption = (index: number) => {
        if (options.length <= 2) {
            alert("A poll must have at least 2 options.");
            return;
        }
        const newOptions = options.filter((_, i) => i !== index);
        setOptions(newOptions);
    };

    const resetForm = () => {
        setQuestion('');
        setEndDate(toYyyyMmDd(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)));
        setOptions(['', '']);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!question.trim()) {
            alert("Please enter a question.");
            return;
        }
        
        const validOptions = options.map(o => o.trim()).filter(o => o.length > 0);
        if (validOptions.length < 2) {
            alert("Please provide at least 2 valid options.");
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Create Poll
            const { data: pollData, error: pollError } = await supabase
                .from('polls')
                .insert({
                    question: question,
                    end_date: new Date(endDate).toISOString()
                })
                .select()
                .single();

            if (pollError) throw pollError;

            // 2. Create Options
            const optionsPayload = validOptions.map(text => ({
                poll_id: pollData.id,
                text: text
            }));

            const { error: optionsError } = await supabase
                .from('poll_options')
                .insert(optionsPayload);

            if (optionsError) throw optionsError;

            setModalOpen(false);
            resetForm();
            await fetchPolls();

        } catch (error) {
            console.error("Error creating poll:", error);
            alert(`Failed to create poll:\n${getErrorMessage(error)}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this poll? All votes will be lost.")) return;

        try {
            const { error } = await supabase.from('polls').delete().eq('id', id);
            if (error) throw error;
            await fetchPolls();
        } catch (error) {
            alert(`Failed to delete poll:\n${getErrorMessage(error)}`);
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
                                    <td className="px-6 py-4">
                                        <button onClick={() => handleDelete(poll.id)} className="text-red-600 hover:text-red-800">
                                            <IconTrash className="h-5 w-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title="Create New Poll">
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
                            {options.map((opt, idx) => (
                                <div key={idx} className="flex items-center space-x-2">
                                    <input
                                        type="text"
                                        value={opt}
                                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-green focus:border-brand-green sm:text-sm"
                                        placeholder={`Option ${idx + 1}`}
                                        required
                                    />
                                    {options.length > 2 && (
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
                            {isSubmitting ? <Spinner /> : 'Create Poll'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </Card>
    );
};
