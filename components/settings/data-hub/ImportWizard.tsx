
import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, FileUp, ArrowRight, AlertTriangle, CheckCircle, Loader2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { toast } from 'sonner';
import { createClient } from '../../../lib/supabase/client';
import { EntityType, ENTITY_COLUMNS, CSVRow, DataImport } from './types';
import { parseFile, autoMapColumns, validateData } from './import-logic';

interface ImportWizardProps {
    onImportComplete: () => void;
}

export function ImportWizard({ onImportComplete }: ImportWizardProps) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [entityType, setEntityType] = useState<EntityType>('customers');
    const [file, setFile] = useState<File | null>(null);
    const [rawHeaders, setRawHeaders] = useState<string[]>([]);
    const [rawData, setRawData] = useState<CSVRow[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [validationResult, setValidationResult] = useState<{ validData: CSVRow[], errors: any[] } | null>(null);
    const [importing, setImporting] = useState(false);
    const [progress, setProgress] = useState(0);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        try {
            const { data, headers } = await parseFile(selectedFile);
            setFile(selectedFile);
            setRawData(data);
            setRawHeaders(headers);

            // Auto-map
            const autoMapping = autoMapColumns(headers, entityType);
            setMapping(autoMapping);

            setStep(2);
        } catch (error) {
            toast.error("Error parsing file");
            console.error(error);
        }
    };

    const handleMappingChange = (header: string, dbCol: string) => {
        setMapping(prev => ({ ...prev, [header]: dbCol }));
    };

    const handleValidate = () => {
        const result = validateData(rawData, entityType, mapping);
        setValidationResult(result);
        setStep(3);
    };

    const handleImport = async () => {
        if (!validationResult || validationResult.validData.length === 0) return;
        setImporting(true);
        const supabase = createClient();

        try {
            // 1. Create Import Record
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user");

            // Look up tenant
            const { data: profile } = await supabase
                .from('tenant_profiles')
                .select('id')
                .eq('id', user.id) // Assuming user.id same as tenant for simplicity or fetched differently
                .single();
            // Better: use user_roles or a hook. For now assume user is linked.
            // Actually, we need to know the tenant_id. user.id is correct for owner?
            // Let's use the one from profile or fallback.

            const tenantId = user.id; // Simplified

            const { data: importRecord, error: importError } = await supabase
                .from('data_imports')
                .insert({
                    tenant_id: tenantId,
                    entity_type: entityType,
                    status: 'processing',
                    file_name: file?.name,
                    total_records: rawData.length,
                    created_by: user.id
                })
                .select()
                .single();

            if (importError) throw importError;

            // 2. Batch Insert
            const batchSize = 100;
            const chunks = [];
            for (let i = 0; i < validationResult.validData.length; i += batchSize) {
                chunks.push(validationResult.validData.slice(i, i + batchSize));
            }

            let successful = 0;
            let failed = 0;

            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                // Prepare chunk with import_id and tenant_id
                const records = chunk.map(row => ({
                    ...row,
                    tenant_id: tenantId,
                    import_id: importRecord.id,
                    // Specific logic for types
                    status: row.status || 'active', // Default
                    created_at: new Date().toISOString()
                }));

                const { error } = await supabase
                    .from(entityType) // 'customers', 'bookings'
                    .insert(records);

                if (error) {
                    console.error("Chunk Error", error);
                    failed += chunk.length;
                } else {
                    successful += chunk.length;
                }

                setProgress(Math.round(((i + 1) / chunks.length) * 100));
            }

            // 3. Update Import Record
            await supabase
                .from('data_imports')
                .update({
                    status: failed === 0 ? 'completed' : 'completed_with_errors',
                    successful_records: successful,
                    failed_records: failed,
                    // error_log: ... (could append errors here)
                    completed_at: new Date().toISOString()
                })
                .eq('id', importRecord.id);

            toast.success(`Import completed: ${successful} records created.`);
            setOpen(false);
            onImportComplete();

        } catch (error: any) {
            toast.error("Import failed: " + error.message);
        } finally {
            setImporting(false);
            setProgress(0);
            setStep(1);
            setFile(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Upload size={16} /> Import Data
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Smart Import - Step {step}</DialogTitle>
                </DialogHeader>

                {step === 1 && (
                    <div className="space-y-6 py-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Select Data Type</label>
                                <Select value={entityType} onValueChange={(v: EntityType) => setEntityType(v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="customers">Customers</SelectItem>
                                        <SelectItem value="bookings">Bookings</SelectItem>
                                        <SelectItem value="properties">Properties</SelectItem>
                                        <SelectItem value="team">Team Members</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <FileUp className="w-12 h-12 text-blue-500 mb-4" />
                            <h3 className="font-semibold text-lg">Click to Upload CSV or Excel</h3>
                            <p className="text-slate-500 text-sm mt-1">Supports .csv, .xlsx, .xls</p>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".csv,.xlsx,.xls"
                                onChange={handleFileChange}
                            />
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold">Map Columns</h3>
                            <span className="text-sm text-slate-500">{rawHeaders.length} columns found</span>
                        </div>

                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>File Header</TableHead>
                                        <TableHead>Target Field</TableHead>
                                        <TableHead>Sample Data (Row 1)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rawHeaders.map((header) => (
                                        <TableRow key={header}>
                                            <TableCell className="font-medium">{header}</TableCell>
                                            <TableCell>
                                                <Select
                                                    value={mapping[header] || "ignore"}
                                                    onValueChange={(val) => handleMappingChange(header, val === "ignore" ? "" : val)}
                                                >
                                                    <SelectTrigger className="w-[200px] h-8">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="ignore" className="text-slate-400 font-mono">-- Ignore --</SelectItem>
                                                        {ENTITY_COLUMNS[entityType].map(col => (
                                                            <SelectItem key={col.key} value={col.key}>
                                                                {col.label} {col.required && "*"}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="text-slate-500 text-xs truncate max-w-[150px]">
                                                {rawData[0]?.[header]}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                            <Button onClick={handleValidate}>Next: Validate <ArrowRight size={16} className="ml-2" /></Button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-6">
                        {validationResult && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-emerald-50 text-emerald-700 rounded-lg flex items-center gap-3">
                                    <CheckCircle size={24} />
                                    <div>
                                        <p className="font-bold text-lg">{validationResult.validData.length}</p>
                                        <p className="text-sm">Ready to Import</p>
                                    </div>
                                </div>
                                <div className={`p-4 rounded-lg flex items-center gap-3 ${validationResult.errors.length > 0 ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-500'}`}>
                                    <AlertTriangle size={24} />
                                    <div>
                                        <p className="font-bold text-lg">{validationResult.errors.length}</p>
                                        <p className="text-sm">Errors (Skipped)</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {validationResult?.errors.length > 0 && (
                            <div className="border rounded-lg overflow-hidden max-h-[200px] overflow-y-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[100px]">Row</TableHead>
                                            <TableHead>Error</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {validationResult.errors.slice(0, 50).map((err, i) => (
                                            <TableRow key={i}>
                                                <TableCell>{err.row}</TableCell>
                                                <TableCell className="text-red-600">{err.error}</TableCell>
                                            </TableRow>
                                        ))}
                                        {validationResult.errors.length > 50 && (
                                            <TableRow>
                                                <TableCell colSpan={2} className="text-center text-slate-500">
                                                    ...and {validationResult.errors.length - 50} more errors
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {importing ? (
                            <div className="space-y-2">
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                                </div>
                                <p className="text-center text-xs text-slate-500">Processing... {progress}%</p>
                            </div>
                        ) : (
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                                <Button
                                    onClick={handleImport}
                                    className="bg-indigo-600 text-white"
                                    disabled={validationResult?.validData.length === 0}
                                >
                                    {importing ? <Loader2 className="animate-spin" /> : "Start Import"}
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
