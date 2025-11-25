
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../services/supabaseService';
import { getErrorMessage } from '../utils/helpers';

export const useAdminData = <T extends { id: string }>(tableName: string, textSearchColumns: string[], initialSortKey: string) => {
    const [items, setItems] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [sort, setSort] = useState<{ key: string; asc: boolean }>({ key: initialSortKey, asc: false }); // Changed to false for descending by default

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase.from(tableName).select('*');

            if (filter) {
                const searchFilters = textSearchColumns.map(col => `${String(col)}.ilike.%${filter}%`).join(',');
                query = query.or(searchFilters);
            }

            query = query.order(sort.key, { ascending: sort.asc });

            const { data, error } = await query;
            if (error) {
                // Gracefully handle missing table error (PGRST205 = relation not found)
                if (error.code === 'PGRST205' || error.code === '42P01') {
                    console.warn(`Table '${tableName}' not found in database. Defaulting to empty list.`);
                    setItems([]);
                } else {
                    console.error(`Error fetching ${tableName}:`, error);
                    alert(`Error fetching ${tableName}:\n${getErrorMessage(error)}`);
                }
            } else if (data) {
                setItems(data as T[]);
            }
        } catch (e: any) {
            console.error(`An unexpected error occurred while fetching ${tableName}`, e);
            alert(`An unexpected error occurred while fetching ${tableName}:\n${getErrorMessage(e)}`);
        } finally {
            setLoading(false);
        }
    }, [tableName, filter, sort.key, sort.asc, textSearchColumns]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const createItem = async (item: Partial<T>): Promise<boolean> => {
        try {
            const { error } = await supabase.from(tableName).insert([item]);
            if (error) {
                if (error.code === 'PGRST205' || error.code === '42P01') {
                    alert(`Unable to create item: The table '${tableName}' does not exist in the database.`);
                    return false;
                }
                console.error(`Error creating item in ${tableName}:`, error);
                alert(`Error creating item in ${tableName}:\n${getErrorMessage(error)}`);
                return false;
            } else {
                await fetchData();
                return true;
            }
        } catch (e) {
            console.error(`An unexpected exception occurred while creating an item in ${tableName}:`, e);
            alert(`An unexpected exception occurred while creating an item in ${tableName}:\n${getErrorMessage(e)}`);
            return false;
        }
    };

    const updateItem = async (id: string, item: Partial<T>): Promise<boolean> => {
        try {
            const cleanItem = { ...item };
            delete (cleanItem as any).id;
            delete (cleanItem as any).created_at;

            const { error } = await supabase.from(tableName).update(cleanItem).eq('id', id);
            if (error) {
                if (error.code === 'PGRST205' || error.code === '42P01') {
                    alert(`Unable to update item: The table '${tableName}' does not exist in the database.`);
                    return false;
                }
                console.error(`Error updating item in ${tableName}:`, error);
                alert(`Error updating item in ${tableName}:\n${getErrorMessage(error)}`);
                return false;
            } else {
                await fetchData();
                return true;
            }
        } catch (e) {
            console.error(`An unexpected exception occurred while updating an item in ${tableName}:`, e);
            alert(`An unexpected exception occurred while updating an item in ${tableName}:\n${getErrorMessage(e)}`);
            return false;
        }
    };

    const deleteItem = async (id: string): Promise<boolean> => {
        try {
            const { error } = await supabase.from(tableName).delete().eq('id', id);
            if (error) {
                console.error(`Error deleting item in ${tableName}:`, error);
                alert(`Error deleting item in ${tableName}:\n${getErrorMessage(error)}`);
                return false;
            } else {
                await fetchData();
                return true;
            }
        } catch (e) {
            console.error(`An unexpected exception occurred while deleting an item in ${tableName}:`, e);
            alert(`An unexpected exception occurred while deleting an item in ${tableName}:\n${getErrorMessage(e)}`);
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
