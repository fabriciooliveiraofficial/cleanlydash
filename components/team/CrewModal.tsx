import React, { useState, useEffect } from 'react';
import { X, Users, Check } from 'lucide-react';
import { createClient } from '../../lib/supabase/client';
import { Button } from '../ui/button';
import { toast } from 'sonner';

interface CrewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    crew?: any;
    members: any[];
}

export const CrewModal: React.FC<CrewModalProps> = ({ isOpen, onClose, onSave, crew, members }) => {
    const [name, setName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        if (crew) {
            setName(crew.name || '');
            setSelectedMembers(crew.crew_members?.map((cm: any) => cm.member_id) || []);
        } else {
            setName('');
            setSelectedMembers([]);
        }
    }, [crew, isOpen]);

    const handleToggleMember = (memberId: string) => {
        setSelectedMembers(prev =>
            prev.includes(memberId)
                ? prev.filter(id => id !== memberId)
                : [...prev, memberId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            if (crew) {
                // Update Crew
                const { error: crewError } = await supabase
                    .from('crews')
                    .update({ name, updated_at: new Date().toISOString() } as any)
                    .eq('id', crew.id);

                if (crewError) throw crewError;

                // Sync Members (Delete all then insert new)
                await supabase.from('crew_members').delete().eq('crew_id', crew.id);

                if (selectedMembers.length > 0) {
                    const { error: memberError } = await supabase
                        .from('crew_members')
                        .insert(selectedMembers.map(memberId => ({
                            crew_id: crew.id,
                            member_id: memberId
                        })) as any);
                    if (memberError) throw memberError;
                }

                toast.success('Equipe atualizada com sucesso');
            } else {
                // Create Crew
                const { data: newCrew, error: crewError } = await supabase
                    .from('crews')
                    .insert({ name, tenant_id: user.id } as any)
                    .select()
                    .single();

                if (crewError) throw crewError;

                if (selectedMembers.length > 0 && newCrew) {
                    const { error: memberError } = await supabase
                        .from('crew_members')
                        .insert(selectedMembers.map(memberId => ({
                            crew_id: (newCrew as any).id,
                            member_id: memberId
                        })) as any);
                    if (memberError) throw memberError;
                }

                toast.success('Equipe criada com sucesso');
            }

            onSave();
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Erro ao salvar equipe');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Users className="text-indigo-600" />
                        {crew ? 'Editar Equipe' : 'Criar Nova Equipe'}
                    </h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Nome da Equipe</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                            placeholder="Ex: Equipe de Limpeza Norte"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3">Selecionar Membros</label>
                        <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            {members.map(member => (
                                <button
                                    key={member.id}
                                    type="button"
                                    onClick={() => handleToggleMember(member.id)}
                                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${selectedMembers.includes(member.id)
                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                        : 'border-slate-100 hover:border-slate-200 text-slate-600'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: member.color || '#6366f1' }}>
                                            {member.name?.[0].toUpperCase()}
                                        </div>
                                        <span className="font-medium text-sm">{member.name}</span>
                                    </div>
                                    {selectedMembers.includes(member.id) && <Check size={18} />}
                                </button>
                            ))}
                            {members.length === 0 && (
                                <p className="text-center py-4 text-slate-400 text-sm">Nenhum membro disponível.</p>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                            {loading ? 'Salvando...' : 'Salvar Equipe'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
