import React, { useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import { Plus, Trash2, ClipboardList, Clock, DollarSign, GripVertical, Check, Pencil } from 'lucide-react';
import { toast } from 'sonner';

interface Service {
    id: string;
    name: string;
    description: string;
    price_default: number;
    duration_minutes: number;
    category_id: string | null;
}

interface Task {
    id: string;
    title: string;
    category_id: string | null;
    room_id: string | null;
}

interface Category {
    id: string;
    name: string;
    color: string;
}

interface Room {
    id: string;
    name: string;
}

export const ServiceCatalog: React.FC = () => {
    const [services, setServices] = useState<Service[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showDrawer, setShowDrawer] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price_default: 0,
        duration_minutes: 60,
        category_id: '' as string | null
    });

    const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

    const [filterCategory, setFilterCategory] = useState<string>('');

    const supabase = createClient();

    const fetchData = async () => {
        setIsLoading(true);
        const { data: svcData } = await supabase.from('services').select('*').order('name');
        if (svcData) setServices(svcData);

        const { data: taskData } = await supabase.from('tasks').select('id, title, category_id, room_id, price').order('title');
        if (taskData) setAvailableTasks(taskData);

        const { data: catData } = await supabase.from('task_categories').select('id, name, color').order('name');
        if (catData) setCategories(catData);

        const { data: roomData } = await supabase.from('rooms').select('id, name').order('name');
        if (roomData) setRooms(roomData);

        setIsLoading(false);
    };

    const fetchServiceTasks = async (serviceId: string) => {
        const { data } = await supabase.from('service_def_tasks').select('task_id').eq('service_id', serviceId).order('order');
        if (data) setSelectedTaskIds((data as any).map((d: any) => d.task_id));
    };

    useEffect(() => { fetchData(); }, []);

    const openModal = async (service?: Service) => {
        if (service) {
            setEditingService(service);
            setFormData({
                name: service.name,
                description: service.description || '',
                price_default: service.price_default || 0,
                duration_minutes: service.duration_minutes || 60,
                category_id: service.category_id || ''
            });
            await fetchServiceTasks(service.id);
        } else {
            setEditingService(null);
            setFormData({ name: '', description: '', price_default: 0, duration_minutes: 60, category_id: '' });
            setSelectedTaskIds([]);
        }
        setFilterCategory('');
        setShowModal(true);
        setShowDrawer(false);
    };

    const closeModal = () => {
        setShowModal(false);
        setShowDrawer(false);
        setEditingService(null);
        setFormData({ name: '', description: '', price_default: 0, duration_minutes: 60, category_id: '' });
        setSelectedTaskIds([]);
        setFilterCategory('');
    };

    const handleSave = async () => {
        if (!formData.name) return toast.error("Nome é obrigatório");

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (editingService) {
            // Update service
            const { error } = await supabase.from('services').update(formData as any).eq('id', editingService.id);
            if (error) { console.error(error); toast.error(`Erro: ${error.message}`); return; }

            // Update task links: delete old, insert new
            await supabase.from('service_def_tasks').delete().eq('service_id', editingService.id);
            if (selectedTaskIds.length > 0) {
                await supabase.from('service_def_tasks').insert(
                    selectedTaskIds.map((taskId, index) => ({
                        service_id: editingService.id,
                        task_id: taskId,
                        order: index,
                        is_mandatory: true
                    })) as any
                );
            }
            toast.success("Serviço atualizado!");
        } else {
            // Create service
            const { data: service, error } = await supabase
                .from('services')
                .insert({ ...formData, tenant_id: user.id } as any)
                .select()
                .single();

            if (error || !service) { toast.error("Erro ao criar serviço"); return; }

            if (selectedTaskIds.length > 0) {
                await supabase.from('service_def_tasks').insert(
                    selectedTaskIds.map((taskId, index) => ({
                        service_id: (service as any).id,
                        task_id: taskId,
                        order: index,
                        is_mandatory: true
                    })) as any
                );
            }
            toast.success("Serviço criado com sucesso!");
        }

        closeModal();
        fetchData();
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Deletar este serviço?")) return;
        const { error } = await supabase.from('services').delete().eq('id', id);
        if (error) toast.error("Erro ao deletar");
        else { toast.success("Serviço deletado"); setServices(services.filter(s => (s as any).id !== id)); }
    };

    const toggleTaskSelection = (taskId: string) => {
        if (selectedTaskIds.includes(taskId)) {
            setSelectedTaskIds(selectedTaskIds.filter(id => id !== taskId));
        } else {
            setSelectedTaskIds([...selectedTaskIds, taskId]);
        }
    };

    const toggleRoomSelection = (roomId: string) => {
        if (!filterCategory) return toast.error("Selecione uma categoria primeiro");

        const targetTasks = availableTasks.filter(t => t.category_id === filterCategory && t.room_id === roomId);
        const targetIds = targetTasks.map(t => t.id);

        if (targetIds.length === 0) return toast.error("Nenhuma tarefa para esta combinação");

        const allSelected = targetIds.every(id => selectedTaskIds.includes(id));

        if (allSelected) {
            // Unselect all
            setSelectedTaskIds(selectedTaskIds.filter(id => !targetIds.includes(id)));
        } else {
            // Select all
            const newIds = [...new Set([...selectedTaskIds, ...targetIds])];
            setSelectedTaskIds(newIds);
        }
    };

    const roomsWithTasks = rooms.filter(room =>
        availableTasks.some(task => task.room_id === room.id && (!filterCategory || task.category_id === filterCategory))
    );

    const filteredTasks = availableTasks.filter(t =>
        (!filterCategory || t.category_id === filterCategory)
    );

    const totalSelectedPrice = availableTasks
        .filter(t => selectedTaskIds.includes(t.id))
        .reduce((sum, t) => sum + (t.price || 0), 0);

    const totalPrice = formData.price_default + totalSelectedPrice;

    const selectedRooms = rooms.filter(room =>
        availableTasks.some(task => task.room_id === room.id && selectedTaskIds.includes(task.id))
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Meus Serviços</h2>
                    <p className="text-sm text-slate-500">Pacotes de limpeza e manutenção oferecidos.</p>
                </div>
                <button onClick={() => openModal()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20">
                    <Plus size={18} />Novo Serviço
                </button>
            </div>

            {isLoading ? (
                <div className="text-center py-20"><div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div></div>
            ) : services.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                    <ClipboardList className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                    <p className="text-slate-500 font-medium">Nenhum serviço definido.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {services.map(service => (
                        <div key={service.id} className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all overflow-hidden flex flex-col">
                            <div className="p-5 flex-1">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-lg text-slate-900">{service.name}</h3>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openModal(service)} className="p-1.5 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors">
                                            <Pencil size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(service.id)} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-500 mb-4 line-clamp-2">{service.description || "Sem descrição"}</p>
                                <div className="flex items-center gap-4 text-sm font-medium text-slate-600">
                                    <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md">
                                        <Clock size={14} className="text-indigo-500" />{service.duration_minutes} min
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md">
                                        <DollarSign size={14} className="text-emerald-500" />R$ {service.price_default}
                                    </div>
                                </div>
                            </div>
                            <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                <span>ID: {service.id.slice(0, 8)}...</span>
                                <span className="font-semibold text-indigo-600 cursor-pointer hover:underline" onClick={() => openModal(service)}>Ver Detalhes</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl shrink-0">
                            <h3 className="font-bold text-lg text-slate-800">{editingService ? 'Editar Serviço' : 'Criar Novo Serviço'}</h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                            {/* Basics */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wider"><ClipboardList size={16} /> Detalhes Gerais</h4>
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Nome do Serviço</label>
                                        <input type="text" placeholder="Ex: Faxina Completa" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Descrição</label>
                                        <textarea placeholder="O que está incluso..." className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none h-20 resize-none" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Categoria do Serviço</label>
                                        <select
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                            value={formData.category_id || ''}
                                            onChange={e => setFormData({ ...formData, category_id: e.target.value || null })}
                                        >
                                            <option value="">Sem Categoria</option>
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1">Preço Base (R$)</label>
                                            <input type="number" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={formData.price_default} onChange={e => setFormData({ ...formData, price_default: parseFloat(e.target.value) || 0 })} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1">Duração (Min)</label>
                                            <input type="number" step="15" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={formData.duration_minutes} onChange={e => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Checklist Summary Section */}
                            <div className="pt-4 border-t border-slate-100">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wider"><GripVertical size={16} /> Checklist</h4>
                                    <button
                                        type="button"
                                        onClick={() => setShowDrawer(true)}
                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-full transition-colors"
                                    >
                                        {selectedTaskIds.length > 0 ? 'Editar Checklist' : 'Configurar Checklist'}
                                    </button>
                                </div>

                                {selectedTaskIds.length > 0 ? (
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                        <div className="flex items-center gap-4 mb-3">
                                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-sm">
                                                {selectedTaskIds.length}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-700 leading-tight">Tarefas Selecionadas</p>
                                                <p className="text-xs text-slate-400">Distribuídas em {selectedRooms.length} cômodos</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {selectedRooms.map(room => (
                                                <span key={room.id} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-500 uppercase">
                                                    {room.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => setShowDrawer(true)}
                                        className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-300 hover:bg-slate-50 transition-all group"
                                    >
                                        <Plus className="mx-auto text-slate-300 group-hover:text-indigo-400 mb-2" size={24} />
                                        <p className="text-sm font-medium text-slate-400 group-hover:text-indigo-600">Nenhuma tarefa selecionada</p>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold mt-1">Clique para começar a montar o checklist</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between rounded-b-2xl shrink-0">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total do Serviço</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-500 line-through">R$ {formData.price_default}</span>
                                    <span className="text-xl font-black text-indigo-700">R$ {totalPrice.toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={closeModal} className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-200 rounded-lg transition-colors">Cancelar</button>
                                <button onClick={handleSave} className="px-8 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-all active:scale-95">{editingService ? 'Salvar Alterações' : 'Criar Serviço'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Checklist Drawer (Slide-over) */}
            {showDrawer && (
                <div className="fixed inset-0 z-[60] flex justify-end">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in" onClick={() => setShowDrawer(false)}></div>

                    {/* Drawer Content */}
                    <div className="relative w-full max-w-xl bg-white shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="font-black text-slate-800 uppercase tracking-tight text-lg">Configurar Checklist</h3>
                                <p className="text-xs text-slate-500 font-medium leading-none mt-1">Selecione as tarefas que compõem este serviço</p>
                            </div>
                            <button onClick={() => setShowDrawer(false)} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-600 shadow-sm transition-all active:scale-95">✕</button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                            {/* Step 1: Category */}
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase mb-2 tracking-widest flex items-center gap-2 italic">
                                    <span className="bg-slate-800 text-white h-4 w-4 rounded-full flex items-center justify-center not-italic text-[10px]">1</span>
                                    Filtre por Categoria
                                </label>
                                <select
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold bg-indigo-50/30 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    value={filterCategory}
                                    onChange={(e) => setFilterCategory(e.target.value)}
                                >
                                    <option value="">Todas as Categorias</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Step 2: Rooms */}
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase mb-3 tracking-widest flex items-center gap-2 italic">
                                    <span className="bg-slate-800 text-white h-4 w-4 rounded-full flex items-center justify-center not-italic text-[10px]">2</span>
                                    Seleção por Cômodo
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {roomsWithTasks.length === 0 ? (
                                        <p className="col-span-full text-xs text-slate-400 italic bg-slate-50 p-4 rounded-xl text-center border border-dashed">Nenhum cômodo disponível para esta categoria.</p>
                                    ) : (
                                        roomsWithTasks.map(room => {
                                            const roomTaskIds = availableTasks.filter(t => t.room_id === room.id && (!filterCategory || t.category_id === filterCategory)).map(t => t.id);
                                            const isSelected = roomTaskIds.every(id => selectedTaskIds.includes(id)) && roomTaskIds.length > 0;
                                            const hasSome = roomTaskIds.some(id => selectedTaskIds.includes(id));

                                            return (
                                                <button
                                                    key={room.id}
                                                    type="button"
                                                    onClick={() => toggleRoomSelection(room.id)}
                                                    className={`px-3 py-3 rounded-xl text-[10px] font-black uppercase transition-all border text-center flex flex-col items-center justify-center gap-1 ${isSelected
                                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200'
                                                        : hasSome
                                                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                                                            : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'
                                                        }`}
                                                >
                                                    {room.name}
                                                    <span className={`text-[10px] font-medium opacity-60 ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                                                        {roomTaskIds.length} itens
                                                    </span>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Step 3: Tasks */}
                            <div className="flex flex-col flex-1 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                                <div className="px-4 py-3 bg-slate-800 text-white flex justify-between items-center italic">
                                    <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 not-italic">
                                        <span className="bg-white text-slate-800 h-4 w-4 rounded-full flex items-center justify-center text-[10px]">3</span>
                                        Ajuste Fino
                                    </span>
                                    <span className="text-[10px] font-bold opacity-75 uppercase">{filterCategory ? categories.find(c => c.id === filterCategory)?.name : 'Todas'}</span>
                                </div>
                                <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto custom-scrollbar">
                                    {filteredTasks.length === 0 ? (
                                        <p className="text-center text-slate-400 text-xs py-12 px-6">Escolha uma categoria para listar as tarefas.</p>
                                    ) : (
                                        filteredTasks.map(task => (
                                            <div key={task.id} onClick={() => toggleTaskSelection(task.id)} className={`p-4 cursor-pointer flex items-center justify-between group transition-all ${selectedTaskIds.includes(task.id) ? 'bg-indigo-50/30' : 'hover:bg-slate-50'}`}>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className={`text-sm font-bold transition-colors ${selectedTaskIds.includes(task.id) ? 'text-indigo-900' : 'text-slate-700 group-hover:text-indigo-600'}`}>
                                                        {task.title}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                                                            {rooms.find(r => r.id === task.room_id)?.name || 'Geral'}
                                                        </span>
                                                        {task.price > 0 && (
                                                            <span className="text-[9px] font-black text-emerald-600 uppercase">
                                                                + R$ {task.price}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className={`h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all ${selectedTaskIds.includes(task.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200 group-hover:border-indigo-400 bg-white'}`}>
                                                    {selectedTaskIds.includes(task.id) && <Check size={14} strokeWidth={4} />}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                    <span>{selectedTaskIds.length} tarefas selecionadas</span>
                                    <span className="text-indigo-600">+ R$ {totalSelectedPrice.toFixed(2)} acumulado</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0">
                            <button
                                onClick={() => setShowDrawer(false)}
                                className="w-full py-4 bg-slate-800 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-slate-900 transition-all shadow-xl shadow-slate-200 active:scale-[0.98]"
                            >
                                Concluído
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
