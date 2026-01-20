import React, { useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import { Plus, Trash2, Home, Pencil, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';

interface Room {
    id: string;
    name: string;
    description: string | null;
}

export const RealEstateManager: React.FC = () => {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);
    const [formData, setFormData] = useState({ name: '', description: '' });

    const supabase = createClient();

    const fetchRooms = async () => {
        setIsLoading(true);
        const { data, error } = await supabase.from('rooms').select('*').order('name');
        if (error) {
            console.error(error);
            toast.error('Erro ao carregar cômodos');
        } else {
            setRooms(data || []);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchRooms();
    }, []);

    const openModal = (room?: Room) => {
        if (room) {
            setEditingRoom(room);
            setFormData({ name: room.name, description: room.description || '' });
        } else {
            setEditingRoom(null);
            setFormData({ name: '', description: '' });
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingRoom(null);
        setFormData({ name: '', description: '' });
    };

    const handleSave = async () => {
        if (!formData.name) return toast.error("O nome do cômodo é obrigatório");

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (editingRoom) {
            // Update
            const { error } = await supabase
                .from('rooms')
                .update({ name: formData.name, description: formData.description } as any)
                .eq('id', editingRoom.id);

            if (error) {
                console.error(error);
                toast.error(`Erro: ${error.message}`);
            } else {
                toast.success("Cômodo atualizado!");
                closeModal();
                fetchRooms();
            }
        } else {
            // Create
            const { error } = await supabase
                .from('rooms')
                .insert({ ...formData, tenant_id: user.id });

            if (error) {
                console.error(error);
                toast.error(`Erro: ${error.message}`);
            } else {
                toast.success("Cômodo cadastrado!");
                closeModal();
                fetchRooms();
            }
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Excluir este cômodo? Tarefas vinculadas ficarão sem vínculo.")) return;
        const { error } = await supabase.from('rooms').delete().eq('id', id);
        if (error) {
            toast.error("Erro ao deletar");
        } else {
            toast.success("Cômodo removido");
            setRooms(rooms.filter(r => r.id !== id));
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Home size={20} className="text-indigo-600" />
                        Gerenciamento de Imóvel (Real Estate)
                    </h2>
                    <p className="text-sm text-slate-500">Cadastre os cômodos para organizar suas tarefas e checklists.</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
                >
                    <Plus size={18} />Novo Cômodo
                </button>
            </div>

            {isLoading ? (
                <div className="text-center py-10">
                    <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
                </div>
            ) : rooms.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                    <LayoutGrid className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                    <p className="text-slate-500 font-medium">Nenhum cômodo cadastrado.</p>
                    <p className="text-xs text-slate-400 mt-1">Ex: "Kitchen", "Master Bedroom", "Basement", etc.</p>
                    <button
                        onClick={() => openModal()}
                        className="mt-4 text-indigo-600 text-sm font-bold hover:underline"
                    >
                        Criar meu primeiro cômodo
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rooms.map(room => (
                        <div
                            key={room.id}
                            className="group bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all flex justify-between items-center"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                    <Home size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">{room.name}</h3>
                                    {room.description && (
                                        <p className="text-xs text-slate-400 line-clamp-1">{room.description}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => openModal(room)}
                                    className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                                >
                                    <Pencil size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(room.id)}
                                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-bold text-lg text-slate-800">
                                {editingRoom ? 'Editar Cômodo' : 'Novo Cômodo'}
                            </h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1 text-left">Nome do Cômodo</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Kitchen, Master Bedroom..."
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1 text-left">Descrição (Opcional)</label>
                                <textarea
                                    placeholder="Detalhes adicionais..."
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none h-20 resize-none"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button onClick={closeModal} className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-200 rounded-lg">
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-all"
                            >
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
