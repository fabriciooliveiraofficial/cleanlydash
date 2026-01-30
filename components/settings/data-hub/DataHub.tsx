
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileSpreadsheet, RotateCcw, Download, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Badge } from '../../ui/badge';
import { createClient } from '../../../lib/supabase/client';
import { toast } from 'sonner';
import { ImportWizard } from './ImportWizard';
import { ExportDialog } from './ExportDialog';
import { DataImport } from './types';
import { format } from 'date-fns';

export function DataHub() {
    const { t } = useTranslation();
    const [imports, setImports] = useState<DataImport[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchImports = async () => {
        setLoading(true);
        const supabase = createClient();
        const { data, error } = await supabase
            .from('data_imports')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error(error);
            // toast.error("Failed to load history"); // Suppress if table doesn't exist yet/RLS issues on first load
        } else {
            setImports(data as DataImport[]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchImports();
    }, []);

    const handleRollback = async (importId: string) => {
        if (!confirm("Are you sure you want to rollback this import? This will delete all records created by this import.")) return;

        const supabase = createClient();

        try {
            const importRecord = imports.find(i => i.id === importId);
            if (!importRecord) return;

            // Delete entities with this import_id
            const { error: deleteError, count } = await supabase
                .from(importRecord.entity_type)
                .delete()
                .eq('import_id', importId);

            if (deleteError) throw deleteError;

            // Update status
            await supabase
                .from('data_imports')
                .update({ status: 'rolled_back' })
                .eq('id', importId);

            toast.success(`Rollback successful. Records deleted.`);
            fetchImports();

        } catch (error: any) {
            toast.error("Rollback failed: " + error.message);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed': return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200">Completed</Badge>;
            case 'completed_with_errors': return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200">Partial</Badge>;
            case 'failed': return <Badge className="bg-red-100 text-red-700 hover:bg-red-200">Failed</Badge>;
            case 'processing': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">Processing</Badge>;
            case 'rolled_back': return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-200">Rolled Back</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <FileSpreadsheet className="text-indigo-600" />
                        Data Hub
                    </h2>
                    <p className="text-slate-500">Import customers, bookings, and team members from CSV or Excel.</p>
                </div>
                <div className="flex gap-2">
                    <ExportDialog />
                    <ImportWizard onImportComplete={fetchImports} />
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Import History</CardTitle>
                    <CardDescription>Track and manage your recent data uploads.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>File</TableHead>
                                    <TableHead>Records</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {imports.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                                            {loading ? "Loading..." : "No imports yet. Click 'Import Data' to get started."}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    imports.map((imp) => (
                                        <TableRow key={imp.id}>
                                            <TableCell className="font-medium text-slate-600">
                                                {format(new Date(imp.created_at), 'PPP p')}
                                            </TableCell>
                                            <TableCell className="capitalize">{imp.entity_type}</TableCell>
                                            <TableCell>{imp.file_name}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col text-xs">
                                                    <span className="text-emerald-600 font-medium">+{imp.successful_records}</span>
                                                    {imp.failed_records > 0 && <span className="text-red-500">-{imp.failed_records} failed</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell>{getStatusBadge(imp.status)}</TableCell>
                                            <TableCell className="text-right">
                                                {['completed', 'completed_with_errors'].includes(imp.status) && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-slate-400 hover:text-red-600"
                                                        onClick={() => handleRollback(imp.id)}
                                                        title="Rollback this import"
                                                    >
                                                        <RotateCcw size={16} />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
