
import React, { useState, useMemo, FC } from 'react';
import { useAdminData } from '../../hooks/useAdminData';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import { Textarea } from '../../components/ui/Textarea';
import { IconPlus, IconPencil, IconTrash } from '../../components/icons';
import { RenderWithLinks } from '../../utils/helpers';

interface ManageGenericProps<T extends { id: string }> {
    tableName: string;
    title: string;
    columns: { key: string; label: string }[];
    formFields: { id: string; label: string; type: string; optional?: boolean }[];
    textSearchColumns: string[];
}

export const ManageGeneric = <T extends { id: string }>({
    tableName,
    title,
    columns,
    formFields,
    textSearchColumns,
}: ManageGenericProps<T>) => {
    const initialSortKey = columns[0]?.key;
    if (!initialSortKey) {
        return <div className="p-4 bg-red-100 text-red-800 rounded-lg">Configuration Error: The "{title}" table has no columns defined.</div>;
    }
    const { items, loading, filter, setFilter, sort, handleSort, createItem, updateItem, deleteItem } = useAdminData<T>(tableName, textSearchColumns, initialSortKey);
    const [isModalOpen, setModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<T | null>(null);
    const [formData, setFormData] = useState<{ [key: string]: any }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<T | null>(null);

    const openModal = (item: T | null = null) => {
        setCurrentItem(item);
        const dataForForm = formFields.reduce((acc, field) => {
            acc[field.id] = item ? (item as any)[field.id] || '' : '';
            return acc;
        }, {} as { [key: string]: any });

        setFormData(dataForForm);
        setModalOpen(true);
    };

    const closeModal = () => {
        setCurrentItem(null);
        setModalOpen(false);
        setFormData({});
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);

        const dataToSubmit = { ...formData };

        if (tableName === 'video_albums' && 'description' in dataToSubmit) {
            const getYouTubeThumbnail = (text: string): string | null => {
                if (!text) return null;
                const urlRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})(?:\S+)?/;
                const match = text.match(urlRegex);
                return match && match[1] ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
            };

            const thumbnailUrl = getYouTubeThumbnail(dataToSubmit.description);
            dataToSubmit.thumbnail_url = thumbnailUrl || `https://placehold.co/480x360/1f2937/white?text=No+Preview`;

            if (!thumbnailUrl && dataToSubmit.description) {
                setTimeout(() => alert("Could not generate a thumbnail from the URL in the description. A placeholder image will be used. Please provide a valid YouTube 'watch' or 'youtu.be' link for automatic thumbnails."), 100);
            }
        }

        if (tableName === 'photo_albums') {
            if (!dataToSubmit.cover_image_url) {
                dataToSubmit.cover_image_url = `https://placehold.co/480x360/6366f1/white?text=No+Cover`;
            }
        }

        let success = false;
        if (currentItem) {
            success = await updateItem(currentItem.id, dataToSubmit as Partial<T>);
        } else {
            success = await createItem(dataToSubmit as Partial<T>);
        }

        setIsSubmitting(false);
        if (success) {
            closeModal();
        }
    };

    return (
        <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">{title}</h2>
                <div className="flex items-center space-x-4">
                    <Input label="" id="search" placeholder="Search..." value={filter} onChange={e => setFilter(e.target.value)} />
                    <Button onClick={() => openModal()}><IconPlus className="h-5 w-5 mr-1" /> Add New</Button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            {columns.map(col => <th key={col.key} scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleSort(col.key)}>{col.label}</th>)}
                            <th scope="col" className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? <tr><td colSpan={columns.length + 1} className="text-center p-4"><Spinner /></td></tr> : items.map((item) => (
                            <tr key={item.id} className="bg-white border-b">
                                {columns.map(col => (
                                    <td key={col.key} className="px-6 py-4 break-words">
                                        {col.key.includes('url') ? (
                                            <a href={(item as any)[col.key]} target="_blank" rel="noopener noreferrer" className="text-brand-green hover:underline truncate max-w-xs block" onClick={e => e.stopPropagation()}>Link</a>
                                        ) : col.key === 'description' && (tableName === 'photo_albums' || tableName === 'video_albums') ? (
                                            <RenderWithLinks text={(item as any)[col.key]} />
                                        ) : (
                                            (item as any)[col.key]
                                        )}
                                    </td>
                                ))}
                                <td className="px-6 py-4 flex space-x-2">
                                    <button onClick={() => openModal(item)} className="text-blue-600 hover:text-blue-800"><IconPencil className="h-5 w-5" /></button>
                                    <button onClick={() => { setItemToDelete(item); setDeleteModalOpen(true); }} className="text-red-600 hover:text-red-800"><IconTrash className="h-5 w-5" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Modal isOpen={isModalOpen} onClose={closeModal} title={currentItem ? `Edit ${title}` : `Add ${title}`}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {formFields.map(field => {
                        const C = field.type === 'textarea' ? Textarea : Input;
                        return <C
                            key={field.id}
                            id={field.id}
                            name={field.id}
                            label={field.label}
                            type={field.type}
                            value={formData[field.id] || ''}
                            onChange={handleFormChange}
                            required={!field.optional}
                        />
                    })}
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Spinner /> : (currentItem ? 'Update' : 'Create')}
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isDeleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Confirm Deletion">
                {itemToDelete && (
                    <div>
                        <p className="mb-6 text-gray-700">
                            Are you sure you want to delete <span className="font-bold">"{(itemToDelete as any).title || (itemToDelete as any).name || (itemToDelete as any).question || 'this item'}"</span>? This action cannot be undone.
                        </p>
                        <div className="flex justify-end space-x-4">
                            <Button variant="secondary" onClick={() => setDeleteModalOpen(false)} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button variant="danger" onClick={async () => {
                                setIsSubmitting(true);
                                const success = await deleteItem(itemToDelete.id);
                                setIsSubmitting(false);
                                if (success) {
                                    setDeleteModalOpen(false);
                                    setItemToDelete(null);
                                }
                            }} disabled={isSubmitting}>
                                {isSubmitting ? <Spinner /> : 'Yes, Delete'}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </Card>
    );
};
