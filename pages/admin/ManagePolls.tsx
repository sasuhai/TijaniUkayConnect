
import React, { FC, useState, useEffect } from 'react';
import * as firebase from '../../services/firebaseService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { IconTrash } from '../../components/icons';
import { formatDate } from '../../utils/helpers';

interface PollOption {
    id: string;
    text: string;
}

interface PollWithOptions {
    id: string;
    question: string;
    options: PollOption[];
    end_date: string;
    created_at?: string;
}

export const ManagePolls: FC = () => {
    const [polls, setPolls] = useState<PollWithOptions[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setModalOpen] = useState(false);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [editingPoll, setEditingPoll] = useState<PollWithOptions | null>(null);
    const [pollToDelete, setPollToDelete] = useState<PollWithOptions | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        question: '',
        end_date: '',
        options: ['', '']
    });

    useEffect(() => {
        fetchPolls();
    }, []);

    const fetchPolls = async () => {
        setLoading(true);
        try {
            const { data, error } = await firebase.getPolls();
            if (error) throw error;
            if (data) {
                // Ensure options exist for each poll
                const pollsWithOptions = data.map((poll: any) => ({
                    ...poll,
                    options: poll.options || []
                }));
                setPolls(pollsWithOptions as PollWithOptions[]);
            }
        } catch (error) {
            console.error('Error fetching polls:', error);
            alert('Failed to fetch polls');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (poll?: PollWithOptions) => {
        if (poll) {
            setEditingPoll(poll);
            setFormData({
                question: poll.question,
                end_date: poll.end_date.split('T')[0], // Extract date part
                options: poll.options.map(opt => opt.text)
            });
        } else {
            setEditingPoll(null);
            setFormData({
                question: '',
                end_date: '',
                options: ['', '']
            });
        }
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setEditingPoll(null);
        setFormData({ question: '', end_date: '', options: ['', ''] });
    };

    const handleAddOption = () => {
        setFormData(prev => ({
            ...prev,
            options: [...prev.options, '']
        }));
    };

    const handleRemoveOption = (index: number) => {
        if (formData.options.length > 2) {
            setFormData(prev => ({
                ...prev,
                options: prev.options.filter((_, i) => i !== index)
            }));
        }
    };

    const handleOptionChange = (index: number, value: string) => {
        setFormData(prev => ({
            ...prev,
            options: prev.options.map((opt, i) => i === index ? value : opt)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!formData.question.trim()) {
            alert('Please enter a question');
            return;
        }
        if (!formData.end_date) {
            alert('Please select an end date');
            return;
        }
        const validOptions = formData.options.filter(opt => opt.trim());
        if (validOptions.length < 2) {
            alert('Please provide at least 2 options');
            return;
        }

        try {
            const pollData = {
                question: formData.question,
                end_date: new Date(formData.end_date).toISOString(),
                options: validOptions.map((text, index) => ({
                    id: editingPoll?.options[index]?.id || `opt-${Date.now()}-${index}`,
                    text
                })),
                created_at: editingPoll?.created_at || new Date().toISOString()
            };

            if (editingPoll) {
                const { error } = await firebase.updatePoll(editingPoll.id, pollData);
                if (error) throw error;
            } else {
                const { error } = await firebase.createPoll(pollData);
                if (error) throw error;
            }

            await fetchPolls();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving poll:', error);
            alert('Failed to save poll');
        }
    };

    const handleDelete = async () => {
        if (!pollToDelete) return;

        try {
            const { error } = await firebase.deletePoll(pollToDelete.id);
            if (error) throw error;

            await fetchPolls();
            setDeleteModalOpen(false);
            setPollToDelete(null);
        } catch (error) {
            console.error('Error deleting poll:', error);
            alert('Failed to delete poll');
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-brand-dark">Manage Polls</h2>
                <Button onClick={() => handleOpenModal()}>
                    Create New Poll
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Spinner />
                </div>
            ) : polls.length === 0 ? (
                <Card className="p-8 text-center text-gray-500">
                    <p className="text-lg">No polls created yet.</p>
                    <p className="text-sm mt-2">Click "Create New Poll" to get started.</p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {polls.map(poll => (
                        <Card key={poll.id} className="p-6">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-brand-dark mb-2">
                                        {poll.question}
                                    </h3>
                                    <div className="text-sm text-gray-600 space-y-1">
                                        <p>Options: {poll.options.map(opt => opt.text).join(', ')}</p>
                                        <p>Ends: {formatDate(poll.end_date)}</p>
                                        {poll.created_at && <p>Created: {formatDate(poll.created_at)}</p>}
                                    </div>
                                </div>
                                <div className="flex space-x-2 ml-4">
                                    <Button
                                        variant="secondary"
                                        onClick={() => handleOpenModal(poll)}
                                        className="text-xs py-1 px-3"
                                    >
                                        Edit
                                    </Button>
                                    <button
                                        onClick={() => {
                                            setPollToDelete(poll);
                                            setDeleteModalOpen(true);
                                        }}
                                        className="text-red-600 hover:text-red-800 p-1 rounded-md hover:bg-red-100"
                                        title="Delete Poll"
                                    >
                                        <IconTrash className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingPoll ? 'Edit Poll' : 'Create New Poll'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Textarea
                        label="Question"
                        value={formData.question}
                        onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                        required
                        rows={2}
                        placeholder="What would you like to ask the community?"
                    />

                    <Input
                        label="End Date"
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        required
                        min={new Date().toISOString().split('T')[0]}
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Options (minimum 2)
                        </label>
                        <div className="space-y-2">
                            {formData.options.map((option, index) => (
                                <div key={index} className="flex space-x-2">
                                    <Input
                                        label=""
                                        value={option}
                                        onChange={(e) => handleOptionChange(index, e.target.value)}
                                        placeholder={`Option ${index + 1}`}
                                        required
                                    />
                                    {formData.options.length > 2 && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveOption(index)}
                                            className="text-red-600 hover:text-red-800 px-2"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleAddOption}
                            className="mt-2 text-xs"
                        >
                            + Add Option
                        </Button>
                    </div>

                    <div className="flex justify-end space-x-4 pt-4">
                        <Button type="button" variant="secondary" onClick={handleCloseModal}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            {editingPoll ? 'Update Poll' : 'Create Poll'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                title="Confirm Deletion"
            >
                {pollToDelete && (
                    <div>
                        <p className="mb-6">
                            Are you sure you want to delete the poll "{pollToDelete.question}"?
                            This action cannot be undone.
                        </p>
                        <div className="flex justify-end space-x-4">
                            <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button variant="danger" onClick={handleDelete}>
                                Delete
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};
