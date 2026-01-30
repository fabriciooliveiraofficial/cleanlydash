
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { CSVRow, EntityType, ENTITY_COLUMNS, ImportError } from './types';

export const parseFile = (file: File): Promise<{ data: CSVRow[]; headers: string[] }> => {
    return new Promise((resolve, reject) => {
        const fileExt = file.name.split('.').pop()?.toLowerCase();

        if (fileExt === 'csv') {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    resolve({
                        data: results.data as CSVRow[],
                        headers: results.meta.fields || []
                    });
                },
                error: (error) => reject(error)
            });
        } else if (['xlsx', 'xls'].includes(fileExt || '')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (jsonData.length === 0) return resolve({ data: [], headers: [] });

                const headers = jsonData[0] as string[];
                const rows = jsonData.slice(1).map(row => {
                    const rowData: CSVRow = {};
                    headers.forEach((header, index) => {
                        rowData[header] = (row as any)[index];
                    });
                    return rowData;
                });

                resolve({ data: rows, headers });
            };
            reader.onerror = (error) => reject(error);
            reader.readAsBinaryString(file);
        } else {
            reject(new Error('Unsupported file format'));
        }
    });
};

export const validateData = (
    data: CSVRow[],
    entityType: EntityType,
    mapping: Record<string, string>
): { validData: CSVRow[]; errors: ImportError[] } => {
    const validData: CSVRow[] = [];
    const errors: ImportError[] = [];
    const requiredFields = ENTITY_COLUMNS[entityType].filter(c => c.required).map(c => c.key);

    data.forEach((row, index) => {
        const mappedRow: CSVRow = {};
        const missingFields: string[] = [];

        // Apply mapping
        Object.entries(mapping).forEach(([csvHeader, dbColumn]) => {
            if (dbColumn) {
                mappedRow[dbColumn] = row[csvHeader];
            }
        });

        // Check required fields
        requiredFields.forEach(field => {
            if (!mappedRow[field] || mappedRow[field].toString().trim() === '') {
                missingFields.push(ENTITY_COLUMNS[entityType].find(c => c.key === field)?.label || field);
            }
        });

        if (missingFields.length > 0) {
            errors.push({
                row: index + 2, // +1 for header, +1 for 0-index
                error: `Missing required fields: ${missingFields.join(', ')}`,
                data: row
            });
        } else {
            // Additional Validations
            if (entityType === 'customers' && mappedRow.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mappedRow.email)) {
                errors.push({ row: index + 2, error: 'Invalid email format', data: row });
            } else {
                validData.push(mappedRow);
            }
        }
    });

    return { validData, errors };
};

export const autoMapColumns = (headers: string[], entityType: EntityType): Record<string, string> => {
    const mapping: Record<string, string> = {};
    const dbColumns = ENTITY_COLUMNS[entityType];

    headers.forEach(header => {
        const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');

        const match = dbColumns.find(col => {
            const normalizedCol = col.label.toLowerCase().replace(/[^a-z0-9]/g, '');
            const normalizedKey = col.key.toLowerCase().replace(/[^a-z0-9]/g, '');
            return normalizedHeader === normalizedCol || normalizedHeader === normalizedKey || normalizedHeader.includes(normalizedKey);
        });

        if (match) {
            mapping[header] = match.key;
        }
    });

    return mapping;
};
