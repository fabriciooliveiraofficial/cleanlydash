import React, { useEffect, useState } from 'react';
import { File, Upload, MoreVertical, Search, FolderOpen, ImageIcon, FileText, Plus, Loader2, FileSearch, ExternalLink } from 'lucide-react';
import { Button } from '../../../ui/button';
import { createClient } from '../../../../lib/supabase/client';
import { toast } from 'sonner';

export const VaultTab: React.FC<{ customerId: string }> = ({ customerId }) => {
    const [documents, setDocuments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const supabase = createClient();

    useEffect(() => {
        async function loadDocuments() {
            setLoading(true);
            const { data } = await supabase
                .from('job_evidence')
                .select(`
                    *,
                    bookings(customer_id)
                `)
                .or(`customer_id.eq.${customerId},bookings.customer_id.eq.${customerId}`)
                .order('created_at', { ascending: false });

            if (data) {
                setDocuments(data.map(d => ({
                    id: d.id,
                    name: d.notes || `Evidence_${d.id.slice(0, 4)}`,
                    url: d.url,
                    type: d.url.match(/\.(jpg|jpeg|png|webp)$/i) ? 'image' : 'doc',
                    date: d.created_at,
                    size: 'N/A'
                })));
            }
            setLoading(false);
        }
        loadDocuments();
    }, [customerId]);

    const filteredDocs = documents.filter(doc =>
        doc.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const toastId = toast.loading('Fazendo upload...');

        try {
            // 1. Get current user's tenant_id if possible, or use a generic path
            // For CRM, we structure as: customers/{customerId}/{timestamp}_{filename}
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = `customers/${customerId}/${fileName}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('attachments')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('attachments')
                .getPublicUrl(filePath);

            // 3. Insert into job_evidence
            const { error: insertError } = await supabase
                .from('job_evidence')
                .insert({
                    tenant_id: (await supabase.auth.getUser()).data.user?.user_metadata?.tenant_id || '00000000-0000-0000-0000-000000000000',
                    type: 'document',
                    url: publicUrl,
                    notes: file.name,
                    customer_id: customerId
                });

            if (insertError) throw insertError;

            toast.success('Arquivo enviado com sucesso!', { id: toastId });

            // Refresh list
            const { data } = await supabase
                .from('job_evidence')
                .select(`*, bookings(customer_id)`)
                .or(`customer_id.eq.${customerId},bookings.customer_id.eq.${customerId}`)
                .order('created_at', { ascending: false });

            if (data) {
                setDocuments(data.map(d => ({
                    id: d.id,
                    name: d.notes || `Evidence_${d.id.slice(0, 4)}`,
                    url: d.url,
                    type: d.url?.match(/\.(jpg|jpeg|png|webp)$/i) ? 'image' : 'doc',
                    date: d.created_at,
                    size: 'N/A'
                })));
            }

        } catch (error: any) {
            console.error('Upload error:', error);
            toast.error(`Erro ao enviar arquivo: ${error.message}`, { id: toastId });
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm flex-1 max-w-md">
                    <Search size={18} className="text-slate-400" />
                    <input
                        type="text"
                        placeholder="Pesquisar documentos..."
                        className="bg-transparent border-none outline-none text-sm w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 disabled:opacity-50"
                    onClick={handleUploadClick}
                    disabled={uploading}
                >
                    {uploading ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Upload size={18} className="mr-2" />}
                    {uploading ? 'Enviando...' : 'Upload File'}
                </Button>
                <input
                    type="file"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                />
            </div>

            {loading ? (
                <div className="flex items-center justify-center p-20">
                    <Loader2 className="animate-spin text-indigo-600" />
                </div>
            ) : filteredDocs.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 text-slate-400">
                    <FileSearch size={48} className="mb-4 text-slate-200" />
                    <p className="font-medium">Nenhum documento encontrado.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {filteredDocs.map((doc) => (
                        <div key={doc.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm group hover:border-indigo-200 transition-all hover:shadow-xl hover:shadow-indigo-50/50">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm ${doc.type === 'image' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                    doc.type === 'doc' ? 'bg-red-50 text-red-600 border border-red-100' :
                                        'bg-slate-50 text-slate-600 border border-slate-100'
                                    }`}>
                                    {doc.type === 'image' ? <ImageIcon size={24} /> :
                                        doc.type === 'doc' ? <FileText size={24} /> :
                                            <File size={24} />}
                                </div>
                                <button className="text-slate-300 hover:text-slate-600 transition-colors" onClick={() => window.open(doc.url, '_blank')}>
                                    <ExternalLink size={18} />
                                </button>
                            </div>
                            <h4 className="text-sm font-bold text-slate-900 truncate mb-1" title={doc.name}>{doc.name}</h4>
                            <div className="flex items-center justify-between mt-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{doc.size}</span>
                                <span className="text-[10px] font-medium text-slate-300">{new Date(doc.date).toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))}

                    <button className="border-2 border-dashed border-slate-100 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 text-slate-300 hover:border-indigo-200 hover:text-indigo-400 transition-all group">
                        <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 transition-all">
                            <Plus size={24} />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest">Add New File</span>
                    </button>
                </div>
            )}
        </div>
    );
};
