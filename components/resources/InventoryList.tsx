import React, { useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import { Plus, Trash2, AlertTriangle, Package, Search, Pencil } from 'lucide-react';
import { toast } from 'sonner';

interface InventoryItem {
    id: string;
    name: string;
    type: 'consumable' | 'asset';
    unit: string;
    warning_level: number;
}

export const InventoryList: React.FC = () => {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        type: 'consumable' as 'consumable' | 'asset',
        unit: 'count',
        warning_level: 1
    });

    const supabase = createClient();

    const fetchItems = async () => {
        setIsLoading(true);
        const { data, error } = await supabase.from('inventory_items').select('*').order('name');
        if (error) { toast.error('Erro ao carregar inventário'); console.error(error); }
        else { setItems(data || []); }
        setIsLoading(false);
    };

    useEffect(() => { fetchItems(); }, []);

    const openModal = (item?: InventoryItem) => {
        if (item) {
            setEditingItem(item);
            setFormData({ name: item.name, type: item.type, unit: item.unit, warning_level: item.warning_level });
        } else {
            setEditingItem(null);
            setFormData({ name: '', type: 'consumable', unit: 'count', warning_level: 1 });
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingItem(null);
        setFormData({ name: '', type: 'consumable', unit: 'count', warning_level: 1 });
    };

    const handleSave = async () => {
        if (!formData.name) return toast.error("Nome é obrigatório");

        if (editingItem) {
            const { error } = await supabase
                .from('inventory_items')
                .update({ name: formData.name, type: formData.type, unit: formData.unit, warning_level: formData.warning_level })
                .eq('id', editingItem.id);

            if (error) { console.error(error); toast.error(`Erro: ${error.message}`); }
            else { toast.success("Item atualizado!"); closeModal(); fetchItems(); }
        } else {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('inventory_items')
                .insert({ ...formData, tenant_id: user.id });

            if (error) { console.error(error); toast.error(`Erro: ${error.message} (${error.details || ''})`); }
            else { toast.success("Item adicionado!"); closeModal(); fetchItems(); }
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza? Isso pode afetar serviços que usam este item.")) return;
        const { error } = await supabase.from('inventory_items').delete().eq('id', id);
        if (error) { toast.error("Erro ao deletar"); }
        else { toast.success("Item removido"); setItems(items.filter(i => i.id !== id)); }
    };

    const filteredItems = items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" placeholder="Buscar itens..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <button onClick={() => openModal()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20">
                    <Plus size={18} />Novo Item
                </button>
            </div>

            {isLoading ? (
                <div className="text-center py-20"><div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div></div>
            ) : filteredItems.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                    <Package className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                    <p className="text-slate-500 font-medium">Nenhum item encontrado.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredItems.map(item => (
                        <div key={item.id} className="group bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all relative">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.type === 'consumable' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                        <Package size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800">{item.name}</h3>
                                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-wide">
                                            {item.type === 'consumable' ? 'Consumível' : 'Ativo'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openModal(item)} className="p-2 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors">
                                        <Pencil size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-slate-500 mt-3 pt-3 border-t border-slate-50">
                                <div><span className="block font-semibold text-slate-700">Unidade</span>{item.unit}</div>
                                <div><span className="block font-semibold text-slate-700">Alerta Mín.</span><span className="flex items-center gap-1"><AlertTriangle size={12} className="text-amber-500" />{item.warning_level}</span></div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-bold text-lg text-slate-800">{editingItem ? 'Editar Item' : 'Novo Item de Estoque'}</h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Nome do Item</label>
                                <input type="text" placeholder="Ex: Papel Higiênico" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Tipo</label>
                                    <select className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })}>
                                        <option value="consumable">Consumível</option>
                                        <option value="asset">Ativo (Fixo)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Unidade</label>
                                    <select className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })}>
                                        <option value="count">Unidade (Count)</option>
                                        <option value="roll">Rolo</option>
                                        <option value="bottle">Garrafa/Frasco</option>
                                        <option value="box">Caixa</option>
                                        <option value="set">Kit/Jogo</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Nível de Alerta (Mínimo)</label>
                                <div className="flex items-center gap-3">
                                    <input type="number" min="1" className="w-24 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={formData.warning_level || ''} onChange={e => { const val = parseInt(e.target.value); setFormData({ ...formData, warning_level: isNaN(val) ? 0 : val }); }} />
                                    <span className="text-xs text-slate-500">Quando o estoque for menor que isso, o sistema alertará.</span>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button onClick={closeModal} className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-200 rounded-lg">Cancelar</button>
                            <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-500/20">Salvar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
