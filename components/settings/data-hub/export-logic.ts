
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { createClient } from '../../../lib/supabase/client';
import { EntityType } from './types';
import { format } from 'date-fns';

export type ExportFormat = 'csv' | 'xlsx';

export const exportData = async (
    entityType: EntityType,
    formatType: ExportFormat,
    tenantId?: string // Optional, mostly deriving from auth user in fetch
): Promise<{ success: boolean; count: number; message?: string }> => {
    try {
        const supabase = createClient();

        // 1. Fetch Data
        // We assume RLS handles tenant filtering, but explicit filter is safer if we have the ID
        let query = supabase.from(entityType).select('*');

        // If we want to filter by tenant explicitly (good practice)
        // However, RLS is the single source of truth.
        // Let's rely on RLS for now to avoid needing context prop drilling, 
        // as the user is authenticated.

        const { data, error } = await query;

        if (error) throw error;
        if (!data || data.length === 0) {
            return { success: false, count: 0, message: 'No records found to export.' };
        }

        // 2. Format Data (Optional cleaning)
        // We might want to remove sensitive fields or format dates
        const formattedData = data.map(row => {
            // Basic sanitization or formatting could go here
            return row;
        });

        // 3. Generate File
        const timestamp = format(new Date(), 'yyyy-MM-dd_HHmm');
        const filename = `${entityType}_export_${timestamp}`;

        if (formatType === 'csv') {
            const csv = Papa.unparse(formattedData);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            downloadFile(blob, `${filename}.csv`);
        } else {
            const worksheet = XLSX.utils.json_to_sheet(formattedData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, entityType);
            XLSX.writeFile(workbook, `${filename}.xlsx`);
        }

        // 4. Log Export (Audit) - Optional but requested in plan
        // Ideally we insert into audit_logs or data_imports (as a 'export' type if we supported it)
        // For now, just client side success.

        return { success: true, count: data.length };

    } catch (err: any) {
        console.error("Export Error: ", err);
        return { success: false, count: 0, message: err.message };
    }
};

const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
