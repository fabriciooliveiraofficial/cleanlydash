import React, { useState, useEffect } from 'react';
import { X, User, Clock, DollarSign, Calendar, Save, Trash2 } from 'lucide-react';
import { createClient } from '../../lib/supabase/client';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { InternationalPhoneInput } from '../ui/InternationalPhoneInput';
import { InlineAvailabilityEditor, getDefaultSlots, AvailabilitySlot } from './InlineAvailabilityEditor';

interface TeamMember {
    id?: string;
    name: string;
    email: string;
    phone: string;
    photo_url?: string;
    color: string;
    role_id?: string;
    role: string;
    pay_type: 'hourly' | 'daily' | 'per_job' | 'salary' | 'commission';
    pay_rate: number;
    commission_percent: number;
    salary_period: 'weekly' | 'biweekly' | 'monthly';
    status: 'active' | 'inactive' | 'on_leave';
    notes: string;
}

interface TeamMemberModalProps {
    member: TeamMember | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    onMemberCreated?: (credentials: any, memberName: string) => void;
}

const defaultMember: TeamMember = {
    name: '',
    email: '',
    phone: '',
    color: '#6366f1',
    role: 'staff',
    pay_type: 'hourly',
    pay_rate: 0,
    commission_percent: 0,
    salary_period: 'biweekly',
    status: 'active',
    notes: ''
};

const PAY_TYPES = [
    { value: 'hourly', label: 'Por Hora', description: 'Paga por horas trabalhadas', icon: '⏱️' },
    { value: 'daily', label: 'Por Dia', description: 'Valor fixo por dia', icon: '📅' },
    { value: 'per_job', label: 'Por Serviço', description: 'Valor fixo por job', icon: '🧹' },
    { value: 'salary', label: 'Salário', description: 'Valor fixo mensal', icon: '💰' },
    { value: 'commission', label: 'Comissão', description: '% do valor do serviço', icon: '📊' },
];

const COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
    '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'
];

export const TeamMemberModal: React.FC<TeamMemberModalProps> = ({
    member,
    isOpen,
    onClose,
    onSave,
    onMemberCreated
}) => {
    const [formData, setFormData] = useState<TeamMember>(defaultMember);
    const [activeTab, setActiveTab] = useState<'profile' | 'pay' | 'availability'>('profile');
    const [saving, setSaving] = useState(false);
    const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>(getDefaultSlots());
    const supabase = createClient();

    const [roles, setRoles] = useState<any[]>([]);

    useEffect(() => {
        const fetchRoles = async () => {
            const { data } = await supabase.from('custom_roles').select('*');
            if (data) setRoles(data);
        };
        fetchRoles();
    }, []);

    useEffect(() => {
        if (member) {
            setFormData(member);
        } else {
            // Set default role if available
            const defaultRole = roles.find(r => r.name === 'Staff') || roles[0];
            setFormData({
                ...defaultMember,
                role_id: defaultRole?.id,
                role: defaultRole?.name || 'staff'
            });
        }
    }, [member, isOpen, roles]);

    const handleChange = (field: keyof TeamMember, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            toast.error('Nome é obrigatório');
            return;
        }

        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            if (member?.id) {
                // Update existing member
                const { id, ...memberFields } = formData;

                // Sanitize payload to only include database columns
                // Remove joined objects like 'custom_roles' which cause PGRST204
                const payload = {
                    ...memberFields,
                    tenant_id: user.id,
                    updated_at: new Date().toISOString()
                };

                // Remove non-column fields that might exist in formData from joins
                delete (payload as any).custom_roles;

                const { error } = await supabase
                    .from('team_members')
                    .update(payload as any)
                    .eq('id', member.id);

                if (error) throw error;

                // Save availability slots
                await supabase
                    .from('team_availability')
                    .delete()
                    .eq('member_id', member.id);

                const availabilityToInsert = availabilitySlots.map(slot => ({
                    member_id: member.id,
                    day_of_week: slot.day_of_week,
                    start_time: slot.start_time,
                    end_time: slot.end_time,
                    is_available: slot.is_available
                }));

                await supabase
                    .from('team_availability')
                    .insert(availabilityToInsert as any);

                toast.success('Membro atualizado!');
                onSave();
                onClose();
            } else {
                // Create new member via Edge Function
                if (!formData.email) {
                    toast.error('Email é obrigatório para criar conta de acesso');
                    return;
                }

                const { data, error } = await supabase.functions.invoke('create-team-member', {
                    body: {
                        name: formData.name,
                        email: formData.email,
                        phone: formData.phone,
                        role_id: formData.role_id
                    }
                });

                // Handle errors - check both error object and data.error
                if (error) {
                    // Try to extract message from the response
                    const errorMessage = data?.error || error.message || 'Erro ao criar membro';
                    throw new Error(errorMessage);
                }
                if (data?.error) {
                    throw new Error(data.error);
                }

                // Show credentials modal
                if (onMemberCreated && data?.credentials) {
                    onMemberCreated(data.credentials, formData.name);
                }

                toast.success('Membro criado com sucesso!');
                onSave();
                onClose();
            }
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || 'Erro ao salvar');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/80">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: formData.color }}
                        >
                            {formData.name?.[0]?.toUpperCase() || 'N'}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">
                                {member?.id ? 'Editar Membro' : 'Novo Membro'}
                            </h2>
                            <p className="text-xs text-slate-500">Configure perfil e pagamento</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100">
                    {[
                        { id: 'profile', label: 'Perfil', icon: User },
                        { id: 'pay', label: 'Pagamento', icon: DollarSign },
                        { id: 'availability', label: 'Disponibilidade', icon: Calendar }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === tab.id
                                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[50vh]">
                    {/* Profile Tab */}
                    {activeTab === 'profile' && (
                        <div className="space-y-4">
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nome *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => handleChange('name', e.target.value)}
                                    placeholder="Nome do funcionário"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                            </div>

                            {/* Email & Phone */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={e => handleChange('email', e.target.value)}
                                        placeholder="email@exemplo.com"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Telefone</label>
                                    <InternationalPhoneInput
                                        value={formData.phone}
                                        onChange={(val) => handleChange('phone', val)}
                                        placeholder="Phone number"
                                        defaultCountry="US"
                                    />
                                </div>
                            </div>

                            {/* Role & Status */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Função</label>
                                    <select
                                        value={formData.role_id || ''}
                                        onChange={e => {
                                            const roleId = e.target.value;
                                            const role = roles.find(r => r.id === roleId);
                                            handleChange('role_id', roleId);
                                            handleChange('role', role?.name || 'staff'); // Fallback/Sync for legacy
                                        }}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                                    >
                                        <option value="" disabled>Selecione uma função</option>
                                        {roles.map(role => (
                                            <option key={role.id} value={role.id}>
                                                {role.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={e => handleChange('status', e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                                    >
                                        <option value="active">Ativo</option>
                                        <option value="inactive">Inativo</option>
                                        <option value="on_leave">Férias/Licença</option>
                                    </select>
                                </div>
                            </div>

                            {/* Color Picker */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Cor no Calendário</label>
                                <div className="flex gap-2 flex-wrap">
                                    {COLORS.map(color => (
                                        <button
                                            key={color}
                                            onClick={() => handleChange('color', color)}
                                            className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${formData.color === color ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''
                                                }`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notas Internas</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={e => handleChange('notes', e.target.value)}
                                    placeholder="Observações, especialidades, etc..."
                                    rows={3}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* Pay Tab */}
                    {activeTab === 'pay' && (
                        <div className="space-y-5">
                            {/* Pay Type Selection */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-3">Modelo de Compensação</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {PAY_TYPES.map(type => (
                                        <button
                                            key={type.value}
                                            onClick={() => handleChange('pay_type', type.value)}
                                            className={`p-4 rounded-xl border-2 text-left transition-all ${formData.pay_type === type.value
                                                ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/20'
                                                : 'border-slate-200 hover:border-slate-300'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">{type.icon}</span>
                                                <div>
                                                    <p className="font-semibold text-slate-900">{type.label}</p>
                                                    <p className="text-xs text-slate-500">{type.description}</p>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Pay Rate based on type */}
                            <div className="p-4 bg-slate-50 rounded-xl space-y-4">
                                {formData.pay_type === 'commission' ? (
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                            Porcentagem de Comissão (%)
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={formData.commission_percent}
                                                onChange={e => handleChange('commission_percent', parseFloat(e.target.value) || 0)}
                                                placeholder="15"
                                                min="0"
                                                max="100"
                                                className="w-full px-4 py-3 pr-10 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">%</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1.5">Ex: 15% de um serviço de R$200 = R$30</p>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                            {formData.pay_type === 'hourly' && 'Valor por Hora'}
                                            {formData.pay_type === 'daily' && 'Valor por Dia'}
                                            {formData.pay_type === 'per_job' && 'Valor por Serviço'}
                                            {formData.pay_type === 'salary' && 'Salário'}
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">R$</span>
                                            <input
                                                type="number"
                                                value={formData.pay_rate}
                                                onChange={e => handleChange('pay_rate', parseFloat(e.target.value) || 0)}
                                                placeholder="0.00"
                                                min="0"
                                                step="0.01"
                                                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                            />
                                        </div>
                                    </div>
                                )}

                                {formData.pay_type === 'salary' && (
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Período do Salário</label>
                                        <select
                                            value={formData.salary_period}
                                            onChange={e => handleChange('salary_period', e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                                        >
                                            <option value="weekly">Semanal</option>
                                            <option value="biweekly">Quinzenal</option>
                                            <option value="monthly">Mensal</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Pay Summary */}
                            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                                <p className="text-sm font-semibold text-emerald-800 mb-1">Resumo da Compensação</p>
                                <p className="text-xs text-emerald-600">
                                    {formData.pay_type === 'hourly' && `R$ ${formData.pay_rate.toFixed(2)} por hora trabalhada`}
                                    {formData.pay_type === 'daily' && `R$ ${formData.pay_rate.toFixed(2)} por dia com serviços`}
                                    {formData.pay_type === 'per_job' && `R$ ${formData.pay_rate.toFixed(2)} por serviço concluído`}
                                    {formData.pay_type === 'salary' && `R$ ${formData.pay_rate.toFixed(2)} ${formData.salary_period === 'weekly' ? 'por semana' : formData.salary_period === 'biweekly' ? 'a cada 15 dias' : 'por mês'}`}
                                    {formData.pay_type === 'commission' && `${formData.commission_percent}% do valor de cada serviço`}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Availability Tab */}
                    {activeTab === 'availability' && (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-500">
                                Defina os horários de trabalho semanais para este membro.
                            </p>
                            <InlineAvailabilityEditor
                                memberId={member?.id}
                                value={availabilitySlots}
                                onChange={setAvailabilitySlots}
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/50">
                    {member?.id ? (
                        <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                            <Trash2 size={16} className="mr-2" />
                            Remover
                        </Button>
                    ) : (
                        <div></div>
                    )}
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                            <Save size={16} className="mr-2" />
                            {saving ? 'Salvando...' : 'Salvar'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
