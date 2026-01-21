
import { useState, useCallback, useEffect } from 'react';
import { db } from '../services/firebaseService';
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { getErrorMessage } from '../utils/helpers';

export const useAdminData = <T extends { id: string }>(tableName: string, textSearchColumns: string[], initialSortKey: string) => {
    const [items, setItems] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [sort, setSort] = useState<{ key: string; asc: boolean }>({ key: initialSortKey, asc: false });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const collectionRef = collection(db, tableName);

            // Get all documents
            const querySnapshot = await getDocs(collectionRef);
            let data = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as T[];

            // Client-side filtering (since Firebase doesn't support OR queries easily)
            if (filter) {
                const lowerFilter = filter.toLowerCase();
                data = data.filter(item => {
                    return textSearchColumns.some(col => {
                        const value = (item as any)[col];
                        return value && String(value).toLowerCase().includes(lowerFilter);
                    });
                });
            }

            // Client-side sorting
            data.sort((a, b) => {
                const aVal = (a as any)[sort.key];
                const bVal = (b as any)[sort.key];

                if (aVal === bVal) return 0;
                if (aVal === null || aVal === undefined) return 1;
                if (bVal === null || bVal === undefined) return -1;

                const comparison = aVal < bVal ? -1 : 1;
                return sort.asc ? comparison : -comparison;
            });

            setItems(data);
        } catch (e: any) {
            console.error(`Error fetching ${tableName}:`, e);
            alert(`Error fetching ${tableName}:\n${getErrorMessage(e)}`);
        } finally {
            setLoading(false);
        }
    }, [tableName, filter, sort.key, sort.asc, textSearchColumns]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const createItem = async (item: Partial<T>): Promise<boolean> => {
        try {
            const collectionRef = collection(db, tableName);
            await addDoc(collectionRef, {
                ...item,
                created_at: new Date().toISOString()
            });
            await fetchData();
            return true;
        } catch (e) {
            console.error(`Error creating item in ${tableName}:`, e);
            alert(`Error creating item in ${tableName}:\n${getErrorMessage(e)}`);
            return false;
        }
    };

    const updateItem = async (id: string, item: Partial<T>): Promise<boolean> => {
        try {
            const cleanItem = { ...item };
            delete (cleanItem as any).id;
            delete (cleanItem as any).created_at;

            const docRef = doc(db, tableName, id);
            await updateDoc(docRef, cleanItem as any);
            await fetchData();
            return true;
        } catch (e) {
            console.error(`Error updating item in ${tableName}:`, e);
            alert(`Error updating item in ${tableName}:\n${getErrorMessage(e)}`);
            return false;
        }
    };

    const deleteItem = async (id: string): Promise<boolean> => {
        try {
            const docRef = doc(db, tableName, id);
            await deleteDoc(docRef);
            await fetchData();
            return true;
        } catch (e) {
            console.error(`Error deleting item in ${tableName}:`, e);
            alert(`Error deleting item in ${tableName}:\n${getErrorMessage(e)}`);
            return false;
        }
    };

    const handleSort = (key: string) => {
        setSort(prevSort => ({
            key,
            asc: prevSort.key === key ? !prevSort.asc : true
        }));
    };

    return { items, loading, filter, setFilter, sort, handleSort, createItem, updateItem, deleteItem, fetchData };
};
