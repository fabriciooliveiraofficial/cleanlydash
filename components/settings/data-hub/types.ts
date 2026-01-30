
export type EntityType = 'customers' | 'bookings' | 'properties' | 'team';

export interface ImportConfig {
    entityType: EntityType;
    fileName: string;
    fileSize: number;
    totalRows: number;
    mappedColumns: Record<string, string>; // CSV Header -> DB Column
}

export interface CSVRow {
    [key: string]: any;
}

export interface ImportError {
    row: number;
    error: string;
    data: CSVRow;
}

export interface DataImport {
    id: string;
    tenant_id: string;
    entity_type: EntityType;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'rolled_back';
    file_name: string;
    total_records: number;
    successful_records: number;
    failed_records: number;
    error_log: ImportError[];
    created_at: string;
    completed_at?: string;
}

export const ENTITY_COLUMNS: Record<EntityType, { key: string; label: string; required?: boolean }[]> = {
    customers: [
        { key: 'name', label: 'Full Name', required: true },
        { key: 'email', label: 'Email', required: true },
        { key: 'phone', label: 'Phone Number' },
        { key: 'address', label: 'Address' }
    ],
    bookings: [
        { key: 'customer_email', label: 'Customer Email', required: true }, // To link
        { key: 'start_date', label: 'Start Date (ISO)', required: true },
        { key: 'end_date', label: 'End Date (ISO)' },
        { key: 'status', label: 'Status' }
    ],
    properties: [
        { key: 'name', label: 'Property Name', required: true },
        { key: 'address', label: 'Address', required: true }
    ],
    team: [
        { key: 'name', label: 'Name', required: true },
        { key: 'email', label: 'Email', required: true },
        { key: 'role', label: 'Role' }
    ]
};
