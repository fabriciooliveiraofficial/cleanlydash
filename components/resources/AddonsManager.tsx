import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Tag, DollarSign, Package, Check, X, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();
import { toast } from 'sonner';

interface Addon {
    id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    is_standalone: boolean;
    active: boolean;
    service_ids?: string[]; // Virtual field for UI
}

interface Service {
    id: string;
    name: string;
}

export const AddonsManager: React.FC = () => {
    const [addons, setAddons] = useState<Addon[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAddon, setEditingAddon] = useState<Addon | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<Addon>>({
        name: '',
        description: '',
        price: 0,
        category: 'cleaning',
        is_standalone: true,
        active: true,
        service_ids: []
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch Services for linking
            const { data: servicesData } = await supabase
                .from('services')
                .select('id, name')
                .eq('tenant_id', user.id)
                .order('name');
            setServices(servicesData || []);

            // Fetch Addons
            const { data: addonsData, error } = await supabase
                .from('addons')
                .select('*')
                .eq('tenant_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Fetch Links
            const { data: links } = await supabase
                .from('service_addons')
                .select('*');

            // Merge links into addons
            // Merge links into addons
            const addonsWithLinks = (addonsData as any[])?.map(addon => ({
                ...addon,
                service_ids: (links as any[])?.filter(l => l.addon_id === addon.id).map(l => l.service_id) || []
            })) || [];

            setAddons(addonsWithLinks);
        } catch (error: any) {
            toast.error('Erro ao carregar add-ons');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            if (!formData.name || !formData.price) {
                toast.error('Nome e Preço são obrigatórios');
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            let addonId = editingAddon?.id;

            if (editingAddon) {
                // Update
                // Update
                const { error } = await (supabase
                    .from('addons') as any)
                    .update({
                        name: formData.name,
                        description: formData.description,
                        price: formData.price,
                        category: formData.category,
                        is_standalone: formData.is_standalone,
                        active: formData.active
                    } as any)
                    .eq('id', editingAddon.id);
                if (error) throw error;
            } else {
                // Create
                const { data, error } = await supabase
                    .from('addons')
                    .insert({
                        tenant_id: user.id,
                        name: formData.name,
                        description: formData.description,
                        price: formData.price,
                        category: formData.category,
                        is_standalone: formData.is_standalone,
                        active: formData.active
                    } as any)
                    .select()
                    .single();
                if (error) throw error;
                addonId = data?.id;
            }

            // Manage Service Links
            if (addonId) {
                // Delete existing links
                await supabase.from('service_addons').delete().eq('addon_id', addonId);

                // Insert new links if not standalone (or arguably even if standalone, but usually specifics matter more)
                // Logic: If standalone, it appears for everyone. If NOT standalone, it MUST be linked to appear?
                // Or: Linked = Recommended Upsell. Standalone = General List.
                // Let's support linking regardless of standalone status (Allow recommending standalone items specifically).

                if (formData.service_ids && formData.service_ids.length > 0) {
                    const links = formData.service_ids.map(sid => ({
                        service_id: sid,
                        addon_id: addonId
                    }));
                    await supabase.from('service_addons').insert(links);
                }
            }

            toast.success(editingAddon ? 'Add-on atualizado!' : 'Add-on criado!');
            closeModal();
            fetchData();
        } catch (error: any) {
            toast.error(`Erro: ${error.message}`);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este add-on?')) return;
        try {
            const { error } = await supabase.from('addons').delete().eq('id', id);
            if (error) throw error;
            toast.success('Add-on excluído');
            fetchData();
        } catch (error: any) {
            toast.error('Erro ao excluir');
        }
    };

    const openModal = (addon?: Addon) => {
        if (addon) {
            setEditingAddon(addon);
            setFormData({ ...addon });
        } else {
            setEditingAddon(null);
            setFormData({
                name: '',
                description: '',
                price: 0,
                category: 'cleaning',
                is_standalone: true,
                active: true,
                service_ids: []
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingAddon(null);
    };

    const filteredAddons = addons.filter(addon =>
        addon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        addon.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex justify-between items-center bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar add-ons..."
                        className="pl-10 pr-4 py-2 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none w-64 text-sm font-medium text-slate-600"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-2xl hover:bg-black transition-all shadow-lg shadow-slate-200 active:scale-95 font-bold text-sm"
                >
                    <Plus size={18} />
                    Novo Add-on
                </button>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full py-12 text-center text-slate-400">Carregando...</div>
                ) : filteredAddons.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                        <Package size={32} className="opacity-20" />
                        <p>Nenhum add-on encontrado.</p>
                    </div>
                ) : (
                    filteredAddons.map((addon) => (
                        <div key={addon.id} className="group bg-white p-5 rounded-3xl border border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                <button
                                    onClick={() => openModal(addon)}
                                    className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(addon.id)}
                                    className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div className="flex justify-between items-start mb-4">
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${addon.active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                                    }`}>
                                    <Tag size={20} />
                                </div>
                                <div className="text-right mt-1 mr-8 md:mr-0">
                                    <span className="block text-lg font-black text-slate-800">
                                        R$ {addon.price.toFixed(2)}
                                    </span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                                        {addon.category}
                                    </span>
                                </div>
                            </div>

                            <h3 className="font-bold text-slate-800 text-lg mb-1">{addon.name}</h3>
                            <p className="text-slate-500 text-sm leading-relaxed mb-4 line-clamp-2 min-h-[40px]">
                                {addon.description || 'Sem descrição.'}
                            </p>

                            <div className="flex flex-wrap gap-2 mt-auto">
                                {addon.is_standalone && (
                                    <span className="text-[10px] font-bold px-2 py-1 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                                        Standalone
                                    </span>
                                )}
                                {addon.service_ids && addon.service_ids.length > 0 && (
                                    <span className="text-[10px] font-bold px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100 flex items-center gap-1">
                                        <Package size={10} />
                                        {addon.service_ids.length} Serviços
                                    </span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <h2 className="font-black text-slate-800 text-xl">
                                {editingAddon ? 'Editar Add-on' : 'Novo Add-on'}
                            </h2>
                            <button onClick={closeModal} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Nome</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-slate-700"
                                        placeholder="Ex: Limpeza de Forno"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Preço (R$)</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-slate-700"
                                            value={formData.price}
                                            onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Descrição</label>
                                <textarea
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium text-slate-600 min-h-[80px]"
                                    placeholder="Descreva o que está incluso neste add-on..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Categoria</label>
                                <select
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-slate-700"
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                >
                                    <option value="cleaning">Limpeza</option>
                                    <option value="laundry">Lavanderia</option>
                                    <option value="organization">Organização</option>
                                    <option value="extra">Extra / Outros</option>
                                </select>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        checked={formData.is_standalone}
                                        onChange={e => setFormData({ ...formData, is_standalone: e.target.checked })}
                                    />
                                    <div>
                                        <span className="block text-sm font-bold text-slate-700">Item Standalone (Universal)</span>
                                        <span className="text-xs text-slate-400">Pode ser adicionado a qualquer serviço (ex: Taxa de Pet).</span>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 rounded-lg border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                        checked={formData.active}
                                        onChange={e => setFormData({ ...formData, active: e.target.checked })}
                                    />
                                    <div>
                                        <span className="block text-sm font-bold text-slate-700">Ativo</span>
                                        <span className="text-xs text-slate-400">Disponível para novos agendamentos.</span>
                                    </div>
                                </label>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1 block">Vincular a Serviços (Recomendação)</label>
                                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1">
                                    {services.map(service => (
                                        <label key={service.id} className={`
                                            flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all
                                            ${formData.service_ids?.includes(service.id)
                                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                                : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'
                                            }
                                        `}>
                                            <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={formData.service_ids?.includes(service.id)}
                                                onChange={(e) => {
                                                    const sids = formData.service_ids || [];
                                                    if (e.target.checked) {
                                                        setFormData({ ...formData, service_ids: [...sids, service.id] });
                                                    } else {
                                                        setFormData({ ...formData, service_ids: sids.filter(id => id !== service.id) });
                                                    }
                                                }}
                                            />
                                            <span className="text-xs font-bold truncate">{service.name}</span>
                                            {formData.service_ids?.includes(service.id) && <Check size={12} className="ml-auto" />}
                                        </label>
                                    ))}
                                </div>
                                <p className="text-[10px] text-slate-400 italic">
                                    <AlertTriangle size={10} className="inline mr-1" />
                                    Itens vinculados aparecem com destaque quando o serviço é selecionado.
                                </p>
                            </div>

                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
                            <button
                                onClick={closeModal}
                                className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-200 rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95"
                            >
                                Salvar Add-on
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
