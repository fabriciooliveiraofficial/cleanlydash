import React, { useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import { Plus, Trash2, Settings2, Search, CheckSquare, Package, Minus, DollarSign, Clock, Tag, Pencil, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';

interface Task {
    id: string;
    title: string;
    description: string;
    is_global: boolean;
    category_id: string | null;
    room_id: string | null;
    price: number;
    duration_minutes: number;
}

interface Room {
    id: string;
    name: string;
}

interface Category {
    id: string;
    name: string;
    color: string;
}

interface InventoryItem {
    id: string;
    name: string;
    unit: string;
    type: string;
}

interface InventoryRequirement {
    item_id: string;
    quantity_needed: number;
    action_type: 'consume' | 'check' | 'install';
}

export const TasksList: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [selectedRequirements, setSelectedRequirements] = useState<InventoryRequirement[]>([]);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category_id: '',
        room_id: '',
        price: 0,
        duration_minutes: 15
    });

    const supabase = createClient();

    const fetchTasks = async () => {
        setIsLoading(true);
        const { data, error } = await supabase.from('tasks').select('*').order('title');
        if (error) { toast.error('Erro ao carregar tarefas'); console.error(error); }
        else { setTasks(data || []); }
        setIsLoading(false);
    };

    const fetchCategories = async () => {
        const { data } = await supabase.from('task_categories').select('id, name, color').order('name');
        setCategories(data || []);
    };

    const fetchInventoryItems = async () => {
        const { data } = await supabase.from('inventory_items').select('id, name, unit, type').order('name');
        setInventoryItems(data || []);
    };

    const fetchRooms = async () => {
        const { data } = await supabase.from('rooms').select('id, name').order('name');
        setRooms(data || []);
    };

    const fetchTaskRequirements = async (taskId: string) => {
        const { data } = await supabase.from('task_inventory_requirements').select('*').eq('task_id', taskId);
        if (data) {
            setSelectedRequirements(data.map(r => ({
                item_id: r.item_id,
                quantity_needed: r.quantity_needed,
                action_type: r.action_type
            })));
        }
    };

    useEffect(() => {
        fetchTasks();
        fetchCategories();
        fetchInventoryItems();
        fetchRooms();
    }, []);

    const openModal = async (task?: Task) => {
        if (task) {
            setEditingTask(task);
            setFormData({
                title: task.title,
                description: task.description || '',
                category_id: task.category_id || '',
                room_id: task.room_id || '',
                price: task.price || 0,
                duration_minutes: task.duration_minutes || 15
            });
            await fetchTaskRequirements(task.id);
        } else {
            setEditingTask(null);
            setFormData({ title: '', description: '', category_id: '', room_id: '', price: 0, duration_minutes: 15 });
            setSelectedRequirements([]);
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingTask(null);
        setFormData({ title: '', description: '', category_id: '', price: 0, duration_minutes: 15 });
        setSelectedRequirements([]);
    };

    const handleSave = async () => {
        if (!formData.title) return toast.error("Título é obrigatório");

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (editingTask) {
            // Update task
            const { error } = await supabase
                .from('tasks')
                .update({
                    title: formData.title,
                    description: formData.description,
                    category_id: formData.category_id || null,
                    room_id: formData.room_id || null,
                    price: formData.price,
                    duration_minutes: formData.duration_minutes
                } as any)
                .eq('id', editingTask.id);

            if (error) { console.error(error); toast.error(`Erro: ${error.message}`); return; }

            // Update inventory requirements: delete old, insert new
            await supabase.from('task_inventory_requirements').delete().eq('task_id', editingTask.id);
            if (selectedRequirements.length > 0) {
                await supabase.from('task_inventory_requirements').insert(
                    selectedRequirements.map(req => ({ task_id: editingTask.id, ...req }))
                );
            }

            toast.success("Tarefa atualizada!");
        } else {
            // Create task
            const { data: taskData, error: taskError } = await supabase
                .from('tasks')
                .insert({
                    title: formData.title,
                    description: formData.description,
                    category_id: formData.category_id || null,
                    room_id: formData.room_id || null,
                    price: formData.price,
                    duration_minutes: formData.duration_minutes,
                    tenant_id: user.id,
                    is_global: false
                } as any)
                .select()
                .single();

            if (taskError || !taskData) { console.error(taskError); toast.error(`Erro: ${taskError?.message}`); return; }

            if (selectedRequirements.length > 0) {
                const { error: reqError } = await supabase.from('task_inventory_requirements').insert(
                    selectedRequirements.map(req => ({ task_id: taskData.id, ...req }))
                );
                if (reqError) { console.error(reqError); toast.error("Tarefa criada, mas falhou ao vincular inventário."); }
            }

            toast.success("Tarefa criada!");
        }

        closeModal();
        fetchTasks();
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza? Esta tarefa será removida de todos os serviços.")) return;
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        if (error) { toast.error("Erro ao deletar"); }
        else { toast.success("Tarefa removida"); setTasks(tasks.filter(t => t.id !== id)); }
    };

    const addRequirement = (itemId: string) => {
        if (selectedRequirements.find(r => r.item_id === itemId)) return;
        setSelectedRequirements([...selectedRequirements, { item_id: itemId, quantity_needed: 1, action_type: 'consume' }]);
    };

    const removeRequirement = (itemId: string) => {
        setSelectedRequirements(selectedRequirements.filter(r => r.item_id !== itemId));
    };

    const updateRequirementQty = (itemId: string, qty: number) => {
        setSelectedRequirements(selectedRequirements.map(r => r.item_id === itemId ? { ...r, quantity_needed: Math.max(1, qty) } : r));
    };

    const updateRequirementAction = (itemId: string, action: 'consume' | 'check' | 'install') => {
        setSelectedRequirements(selectedRequirements.map(r => r.item_id === itemId ? { ...r, action_type: action } : r));
    };

    const getCategoryById = (id: string | null) => categories.find(c => c.id === id);

    const filteredTasks = tasks.filter(t => {
        const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'all' || t.category_id === filterCategory || (filterCategory === 'none' && !t.category_id);
        return matchesSearch && matchesCategory;
    });

    const availableItems = inventoryItems.filter(i => !selectedRequirements.find(r => r.item_id === i.id));

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" placeholder="Buscar tarefas..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="all">Todas Categorias</option>
                        <option value="none">Sem Categoria</option>
                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                </div>
                <button onClick={() => openModal()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20">
                    <Plus size={18} />Nova Tarefa
                </button>
            </div>

            {isLoading ? (
                <div className="text-center py-20"><div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div></div>
            ) : filteredTasks.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                    <CheckSquare className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                    <p className="text-slate-500 font-medium">Nenhuma tarefa encontrada.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTasks.map(task => {
                        const category = getCategoryById(task.category_id);
                        return (
                            <div key={task.id} className="group bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all relative">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: category ? `${category.color}20` : '#f1f5f9', color: category?.color || '#64748b' }}>
                                            <CheckSquare size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800">{task.title}</h3>
                                            <p className="text-xs text-slate-500 line-clamp-1">{task.description || "Sem descrição"}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openModal(task)} className="p-2 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors">
                                            <Pencil size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(task.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-50 text-xs">
                                    {category && <span className="px-2 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: category.color }}>{category.name}</span>}
                                    {task.price > 0 && <span className="flex items-center gap-1 text-emerald-600"><DollarSign size={12} />R${task.price.toFixed(2)}</span>}
                                    <span className="flex items-center gap-1 text-slate-400"><Clock size={12} />{task.duration_minutes}min</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-bold text-lg text-slate-800">{editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}</h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto flex-1">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Título da Tarefa</label>
                                <input type="text" placeholder="Ex: Lavar Roupas de Cama" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1"><Tag size={14} className="inline mr-1" />Categoria</label>
                                    <select className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={formData.category_id} onChange={e => setFormData({ ...formData, category_id: e.target.value })}>
                                        <option value="">Sem categoria</option>
                                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1"><LayoutGrid size={14} className="inline mr-1" />Cômodo (Room)</label>
                                    <select className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={formData.room_id} onChange={e => setFormData({ ...formData, room_id: e.target.value })}>
                                        <option value="">Todo o imóvel / Outro</option>
                                        {rooms.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1"><DollarSign size={14} className="inline mr-1" />Preço (Avulso)</label>
                                    <input type="number" step="0.01" min="0" placeholder="0.00" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={formData.price || ''} onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1"><Clock size={14} className="inline mr-1" />Duração (min)</label>
                                <input type="number" min="1" className="w-24 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={formData.duration_minutes} onChange={e => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 15 })} />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Descrição</label>
                                <textarea placeholder="Instruções..." className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none h-16 resize-none" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                            </div>

                            {/* Inventory */}
                            <div className="border-t border-slate-100 pt-4">
                                <label className="block text-sm font-semibold text-slate-700 mb-2"><Package size={14} className="inline mr-1" />Inventário (Opcional)</label>
                                {selectedRequirements.length > 0 && (
                                    <div className="space-y-2 mb-3">
                                        {selectedRequirements.map(req => {
                                            const item = inventoryItems.find(i => i.id === req.item_id);
                                            if (!item) return null;
                                            return (
                                                <div key={req.item_id} className="flex items-center gap-2 bg-indigo-50 p-2 rounded-lg">
                                                    <span className="flex-1 text-sm font-medium text-slate-700">{item.name}</span>
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => updateRequirementQty(req.item_id, req.quantity_needed - 1)} className="p-1 text-slate-500 hover:bg-white rounded"><Minus size={14} /></button>
                                                        <input type="number" value={req.quantity_needed} onChange={e => updateRequirementQty(req.item_id, parseInt(e.target.value) || 1)} className="w-12 text-center border border-slate-200 rounded text-sm" />
                                                        <button onClick={() => updateRequirementQty(req.item_id, req.quantity_needed + 1)} className="p-1 text-slate-500 hover:bg-white rounded"><Plus size={14} /></button>
                                                    </div>
                                                    <select value={req.action_type} onChange={e => updateRequirementAction(req.item_id, e.target.value as any)} className="text-xs border border-slate-200 rounded px-1 py-0.5">
                                                        <option value="consume">Consome</option>
                                                        <option value="check">Checa</option>
                                                        <option value="install">Instala</option>
                                                    </select>
                                                    <button onClick={() => removeRequirement(req.item_id)} className="p-1 text-rose-400 hover:text-rose-600"><Trash2 size={14} /></button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                {availableItems.length > 0 && (
                                    <select onChange={e => { if (e.target.value) addRequirement(e.target.value); e.target.value = ''; }} className="w-full px-3 py-2 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" defaultValue="">
                                        <option value="" disabled>+ Adicionar item...</option>
                                        {availableItems.map(item => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}
                                    </select>
                                )}
                            </div>

                            <div className="bg-blue-50 p-3 rounded-lg flex items-start gap-2">
                                <Settings2 className="text-blue-600 mt-0.5" size={16} />
                                <p className="text-xs text-blue-800">Preço = valor cobrado se cliente comprar avulso. Deixe 0 se só for vendida em pacotes.</p>
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
