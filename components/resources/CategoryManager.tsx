import React, { useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import { Plus, Trash2, Palette, Tag, Pencil } from 'lucide-react';
import { toast } from 'sonner';

interface Category {
    id: string;
    name: string;
    color: string;
    icon: string;
}

const PRESET_COLORS = [
    '#6366f1', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16',
];

export const CategoryManager: React.FC = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [formData, setFormData] = useState({ name: '', color: '#6366f1' });

    const supabase = createClient();

    const fetchCategories = async () => {
        setIsLoading(true);
        const { data, error } = await supabase.from('task_categories').select('*').order('name');
        if (error) { console.error(error); toast.error('Erro ao carregar categorias'); }
        else { setCategories(data || []); }
        setIsLoading(false);
    };

    useEffect(() => { fetchCategories(); }, []);

    const openModal = (cat?: Category) => {
        if (cat) {
            setEditingCategory(cat);
            setFormData({ name: cat.name, color: cat.color });
        } else {
            setEditingCategory(null);
            setFormData({ name: '', color: '#6366f1' });
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingCategory(null);
        setFormData({ name: '', color: '#6366f1' });
    };

    const handleSave = async () => {
        if (!formData.name) return toast.error("Nome é obrigatório");

        if (editingCategory) {
            // Update
            const { error } = await supabase
                .from('task_categories')
                .update({ name: formData.name, color: formData.color })
                .eq('id', editingCategory.id);

            if (error) { console.error(error); toast.error(`Erro: ${error.message}`); }
            else { toast.success("Categoria atualizada!"); closeModal(); fetchCategories(); }
        } else {
            // Create
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('task_categories')
                .insert({ ...formData, tenant_id: user.id });

            if (error) { console.error(error); toast.error(`Erro: ${error.message}`); }
            else { toast.success("Categoria criada!"); closeModal(); fetchCategories(); }
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Excluir categoria? Tarefas vinculadas ficarão sem categoria.")) return;
        const { error } = await supabase.from('task_categories').delete().eq('id', id);
        if (error) { toast.error("Erro ao deletar"); }
        else { toast.success("Categoria removida"); setCategories(categories.filter(c => c.id !== id)); }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Categorias de Tarefas</h2>
                    <p className="text-sm text-slate-500">Organize suas tarefas em grupos (Limpeza, Reposição, etc.)</p>
                </div>
                <button onClick={() => openModal()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20">
                    <Plus size={18} />Nova Categoria
                </button>
            </div>

            {isLoading ? (
                <div className="text-center py-10"><div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div></div>
            ) : categories.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    <Tag className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                    <p className="text-slate-500">Nenhuma categoria criada.</p>
                    <p className="text-xs text-slate-400">Ex: "Limpeza", "Reposição", "Inspeção"</p>
                </div>
            ) : (
                <div className="flex flex-wrap gap-3">
                    {categories.map(cat => (
                        <div key={cat.id} className="group flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-white hover:shadow-md transition-all" style={{ borderLeftColor: cat.color, borderLeftWidth: 4 }}>
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></span>
                            <span className="font-medium text-slate-700">{cat.name}</span>
                            <button onClick={() => openModal(cat)} className="ml-1 p-1 text-slate-300 hover:text-indigo-500 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                <Pencil size={14} />
                            </button>
                            <button onClick={() => handleDelete(cat.id)} className="p-1 text-slate-300 hover:text-rose-500 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-bold text-lg text-slate-800">{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Nome</label>
                                <input type="text" placeholder="Ex: Limpeza" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2"><Palette size={14} className="inline mr-1" />Cor</label>
                                <div className="flex gap-2 flex-wrap">
                                    {PRESET_COLORS.map(color => (
                                        <button key={color} onClick={() => setFormData({ ...formData, color })} className={`w-8 h-8 rounded-full border-2 transition-all ${formData.color === color ? 'border-slate-800 scale-110' : 'border-transparent'}`} style={{ backgroundColor: color }} />
                                    ))}
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
