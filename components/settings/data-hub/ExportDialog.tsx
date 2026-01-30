
import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText, CheckCircle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { toast } from 'sonner';
import { EntityType } from './types';
import { exportData, ExportFormat } from './export-logic';
import { Label } from '../../ui/label';

export function ExportDialog() {
    const [open, setOpen] = useState(false);
    const [entityType, setEntityType] = useState<EntityType>('customers');
    const [format, setFormat] = useState<ExportFormat>('xlsx');
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        setExporting(true);
        try {
            const result = await exportData(entityType, format);

            if (result.success) {
                toast.success(`Exported ${result.count} records successfully.`);
                setOpen(false);
            } else {
                toast.warning(result.message || "Export failed");
            }
        } catch (error) {
            toast.error("An unexpected error occurred.");
        } finally {
            setExporting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                    <Download size={16} /> Export Data
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Export Data</DialogTitle>
                    <DialogDescription>
                        Select the data type and format you wish to export.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">
                            Data Type
                        </Label>
                        <Select value={entityType} onValueChange={(v: EntityType) => setEntityType(v)}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="customers">Customers</SelectItem>
                                <SelectItem value="bookings">Bookings</SelectItem>
                                <SelectItem value="properties">Properties</SelectItem>
                                <SelectItem value="team">Team Members</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="format" className="text-right">
                            Format
                        </Label>
                        <div className="col-span-3 flex gap-2">
                            <Button
                                variant={format === 'xlsx' ? 'default' : 'outline'}
                                onClick={() => setFormat('xlsx')}
                                className="flex-1"
                            >
                                <FileSpreadsheet size={16} className="mr-2" /> Excel
                            </Button>
                            <Button
                                variant={format === 'csv' ? 'default' : 'outline'}
                                onClick={() => setFormat('csv')}
                                className="flex-1"
                            >
                                <FileText size={16} className="mr-2" /> CSV
                            </Button>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleExport} disabled={exporting}>
                        {exporting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Exporting...
                            </>
                        ) : (
                            'Export'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
