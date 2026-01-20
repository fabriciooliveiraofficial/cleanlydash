import React, { useState, useEffect } from 'react';
import { createClient } from '../lib/supabase/client';
import { useTranslation } from 'react-i18next';
import {
    Users,
    UserPlus,
    Shield,
    Mail,
    Trash2,
    MoreHorizontal,
    CheckCircle,
    Clock,
    Calendar,
    DollarSign,
    Edit,
    RefreshCw,
    X
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { TeamMemberModal } from './team/TeamMemberModal';
import { AvailabilityEditor } from './team/AvailabilityEditor';
import { CredentialsModal } from './team/CredentialsModal';
import { CrewModal } from './team/CrewModal';
import { TabType } from '../types';

interface TeamMember {
    id: string;
    name: string;
    email: string;
    phone: string;
    color: string;
    role: string;
    pay_type: string;
    pay_rate: number;
    status: string;
    user_id?: string;
}

interface PendingInvite {
    id: string;
    email: string;
    role: string;
    status: string;
    created_at: string;
    token: string;
}

interface CustomRole {
    id: string;
    name: string;
}

interface TeamProps {
    onNavigate?: (tab: TabType) => void;
}

export const Team: React.FC<TeamProps> = (props) => {
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeSubTab, setActiveSubTab] = useState<'members' | 'crews'>('members');
    const [crews, setCrews] = useState<any[]>([]);

    // Modals
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showMemberModal, setShowMemberModal] = useState(false);
    const [showCrewModal, setShowCrewModal] = useState(false);
    const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
    const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
    const [selectedCrew, setSelectedCrew] = useState<any | null>(null);
    const [showCredentialsModal, setShowCredentialsModal] = useState(false);
    const [newMemberCredentials, setNewMemberCredentials] = useState<any>(null);
    const [newMemberName, setNewMemberName] = useState('');

    // Invite Form
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState(''); // Default empty, wait for roles
    const [sendingInvite, setSendingInvite] = useState(false);
    const [roles, setRoles] = useState<CustomRole[]>([]);

    const supabase = createClient();
    const { t } = useTranslation();

    useEffect(() => {
        const fetchRoles = async () => {
            const { data } = await supabase.from('custom_roles').select('*');
            if (data && data.length > 0) {
                const typedRoles = data as CustomRole[];
                setRoles(typedRoles);
                const staff = typedRoles.find(r => r.name === 'Staff');
                setInviteRole(staff ? staff.id : typedRoles[0].id);
            }
        };
        fetchRoles();
    }, []);

    const fetchCrews = async () => {
        const { data, error } = await supabase
            .from('crews')
            .select('*, crew_members(member_id)');
        if (data) setCrews(data as any[]);
        if (error) console.error('Crews fetch error:', error);
    };

    const fetchTeam = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch team members with custom role join
            const { data: membersData, error: membersError } = await supabase
                .from('team_members')
                .select('*, custom_roles(name)')
                .eq('tenant_id', user.id)
                .order('name');

            if (membersError) {
                console.error('Members fetch error:', membersError);
            } else {
                setMembers((membersData || []) as TeamMember[]);
            }

            // Fetch pending invites
            const { data: invitesData, error: invitesError } = await supabase
                .from('team_invites')
                .select('*')
                .eq('tenant_id', user.id)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (invitesError) {
                console.error('Invites fetch error:', invitesError);
            } else {
                setPendingInvites((invitesData || []) as PendingInvite[]);
            }

            fetchCrews();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeam();
    }, []);

    const checkSmtpConfig = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { count } = await supabase
            .from('smtp_settings')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

        return count !== null && count > 0;
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();

        const hasSmtp = await checkSmtpConfig();
        if (!hasSmtp) {
            toast.error("Servidor de E-mail não configurado!", {
                description: "Você precisa configurar o SMTP para enviar convites.",
                action: {
                    label: "Configurar Agora",
                    onClick: () => {
                        setShowInviteModal(false);
                        if (props.onNavigate) props.onNavigate(TabType.SETTINGS);
                    }
                },
            });
            return;
        }

        setSendingInvite(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) throw new Error("Sessão expirada");

            const selectedRoleObj = roles.find(r => r.id === inviteRole);
            const roleName = selectedRoleObj ? selectedRoleObj.name : 'Staff'; // Fallback

            const { data, error } = await supabase.functions.invoke('send_invite', {
                body: {
                    email: inviteEmail,
                    role: roleName,     // Send Name (e.g. "Cleaner") for DB 'role' column
                    role_id: inviteRole // Send UUID for DB 'role_id' column
                } as any
            });

            // Log full response for debugging
            console.log('send_invite response:', { data, error });

            // Edge Functions may return error in data.error when status is 400
            if (error) {
                throw new Error(error.message || JSON.stringify(error));
            }
            if (data?.error && !data?.invite_code) {
                throw new Error(data.error);
            }

            // Show success with invite code as backup
            if (data?.email_sent) {
                toast.success(`Convite enviado para ${inviteEmail}!`, {
                    description: `Código de backup: ${data.invite_code}`,
                    duration: 10000
                });
            } else {
                // Email failed but we have the code
                toast.warning(`Email falhou. Use o código: ${data.invite_code}`, {
                    description: 'Compartilhe este código manualmente via WhatsApp ou SMS',
                    duration: 15000
                });
            }

            setShowInviteModal(false);
            setInviteEmail('');
            fetchTeam();
        } catch (err: any) {
            console.error('send_invite full error:', err);
            // Extract actual error from FunctionsHttpError
            let errorMessage = 'Erro ao enviar convite';
            if (err?.context) {
                try {
                    const body = await err.context.json();
                    console.error('send_invite error body:', body);
                    errorMessage = body?.error || errorMessage;
                } catch (e) {
                    errorMessage = err.message || errorMessage;
                }
            } else {
                errorMessage = err.message || errorMessage;
            }
            toast.error(errorMessage);
        } finally {
            setSendingInvite(false);
        }
    };

    const handleCancelInvite = async (inviteId: string) => {
        try {
            const { error } = await supabase
                .from('team_invites')
                .update({ status: 'cancelled' } as any)
                .eq('id', inviteId);

            if (error) throw error;
            toast.success('Convite cancelado');
            fetchTeam();
        } catch (err: any) {
            toast.error(err.message || 'Erro ao cancelar');
        }
    };

    const handleEditMember = (member: TeamMember) => {
        setSelectedMember(member);
        setShowMemberModal(true);
    };

    const handleAddMember = () => {
        setSelectedMember(null);
        setShowMemberModal(true);
    };

    const handleAddCrew = () => {
        setSelectedCrew(null);
        setShowCrewModal(true);
    };

    const handleEditCrew = (crew: any) => {
        setSelectedCrew(crew);
        setShowCrewModal(true);
    };

    const handleEditAvailability = (member: TeamMember) => {
        setSelectedMember(member);
        setShowAvailabilityModal(true);
    };

    const handleDeleteMember = async (memberId: string) => {
        if (!confirm('Tem certeza que deseja remover este membro?')) return;

        try {
            const { error } = await supabase
                .from('team_members')
                .delete()
                .eq('id', memberId);

            if (error) throw error;
            toast.success('Membro removido');
            fetchTeam();
        } catch (err: any) {
            toast.error(err.message || 'Erro ao remover');
        }
    };

    const handleDeleteCrew = async (crewId: string) => {
        if (!confirm('Tem certeza que deseja remover esta equipe?')) return;

        try {
            const { error } = await supabase
                .from('crews')
                .delete()
                .eq('id', crewId);

            if (error) throw error;
            toast.success('Equipe removida');
            fetchTeam();
        } catch (err: any) {
            toast.error(err.message || 'Erro ao remover');
        }
    };

    const getPayTypeLabel = (payType: string) => {
        const labels: Record<string, string> = {
            hourly: 'Por Hora',
            daily: 'Por Dia',
            per_job: 'Por Serviço',
            salary: 'Salário',
            commission: 'Comissão'
        };
        return labels[payType] || payType;
    };

    const getStatusBadge = (status: string) => {
        if (status === 'active') {
            return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-700"><CheckCircle size={12} /> Ativo</span>;
        }
        if (status === 'inactive') {
            return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600">Inativo</span>;
        }
        if (status === 'on_leave') {
            return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-700">Férias</span>;
        }
        return null;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{t('team.title', { defaultValue: 'Gerenciar Equipe' })}</h1>
                    <p className="text-slate-500">{t('team.subtitle', { defaultValue: 'Adicione e gerencie sua equipe.' })}</p>
                </div>
                <div className="flex gap-2">
                    {activeSubTab === 'members' ? (
                        <Button
                            onClick={handleAddMember}
                            className="gap-2 bg-indigo-600 hover:bg-indigo-700"
                        >
                            <UserPlus size={18} />
                            <span className="hidden sm:inline">Adicionar Membro</span>
                        </Button>
                    ) : (
                        <Button
                            onClick={handleAddCrew}
                            className="gap-2 bg-indigo-600 hover:bg-indigo-700"
                        >
                            <Users size={18} />
                            <span className="hidden sm:inline">Criar Equipe</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Sub-Tabs */}
            <div className="flex p-1 bg-slate-100 rounded-xl w-fit">
                <button
                    onClick={() => setActiveSubTab('members')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeSubTab === 'members' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    Membros
                </button>
                <button
                    onClick={() => setActiveSubTab('crews')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeSubTab === 'crews' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    Equipes
                </button>
            </div>

            {/* Content based on activeSubTab */}
            {activeSubTab === 'members' ? (
                <>
                    {/* Pending Invites */}
                    {pendingInvites.length > 0 && (
                        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                            <h3 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2">
                                <Clock size={16} /> Convites Pendentes ({pendingInvites.length})
                            </h3>
                            <div className="space-y-2">
                                {pendingInvites.map(invite => (
                                    <div key={invite.id} className="flex items-center justify-between bg-white rounded-xl p-3 border border-amber-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold text-sm">
                                                {invite.email[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">{invite.email}</p>
                                                <p className="text-xs text-slate-500 capitalize">{invite.role}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => handleCancelInvite(invite.id)} className="text-slate-400 hover:text-red-600">
                                                <X size={16} />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Team Members List */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="text-left py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Membro</th>
                                        <th className="text-left py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider hidden md:table-cell">Função</th>
                                        <th className="text-left py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Modelo Pagamento</th>
                                        <th className="text-left py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                                        <th className="text-right py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {members.map((member) => (
                                        <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold"
                                                        style={{ backgroundColor: member.color || '#6366f1' }}
                                                    >
                                                        {member.name?.[0]?.toUpperCase() || 'M'}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900">{member.name}</p>
                                                        <p className="text-xs text-slate-400">{member.email || member.phone || '—'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 hidden md:table-cell">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold
                                                    ${(member as any).custom_roles?.name === 'Super Admin' ? 'bg-purple-100 text-purple-700' :
                                                        (member as any).custom_roles?.name === 'Manager' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-emerald-100 text-emerald-700'}`}>
                                                    <Shield size={12} />
                                                    {(member as any).custom_roles?.name || member.role}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 hidden lg:table-cell">
                                                <div className="flex items-center gap-2">
                                                    <DollarSign size={14} className="text-slate-400" />
                                                    <span className="text-sm text-slate-600">{getPayTypeLabel(member.pay_type)}</span>
                                                    {member.pay_rate > 0 && (
                                                        <span className="text-xs text-slate-400">R$ {member.pay_rate.toFixed(2)}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                {getStatusBadge(member.status)}
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => handleEditAvailability(member)}
                                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                                        title="Disponibilidade"
                                                    >
                                                        <Calendar size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEditMember(member)}
                                                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                                                        title="Editar"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteMember(member.id)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                        title="Remover"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {members.length === 0 && !loading && (
                                        <tr>
                                            <td colSpan={5} className="py-12 text-center text-slate-400">
                                                <Users size={32} className="mx-auto mb-2 opacity-50" />
                                                <p>Nenhum membro da equipe.</p>
                                                <p className="text-sm">Adicione membros ou envie convites.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                /* Crews List */
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden text-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="text-left py-4 px-6 font-bold text-slate-400 uppercase tracking-wider">Equipe</th>
                                    <th className="text-left py-4 px-6 font-bold text-slate-400 uppercase tracking-wider">Membros</th>
                                    <th className="text-right py-4 px-6 font-bold text-slate-400 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {crews.map(crew => (
                                    <tr key={crew.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                    <Users size={20} />
                                                </div>
                                                <span className="font-bold text-slate-900">{crew.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="text-slate-500 font-medium">
                                                {crew.crew_members?.length || 0} membros atribuídos
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => handleEditCrew(crew)}
                                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                                                    title="Editar"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteCrew(crew.id)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                    title="Remover"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {crews.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={3} className="py-12 text-center text-slate-400">
                                            <Users size={32} className="mx-auto mb-2 opacity-50" />
                                            <p>Nenhuma equipe criada.</p>
                                            <p className="text-sm">Agrupe seus membros para facilitar a gestão.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {loading && !members.length && !crews.length && (
                <div className="py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="mx-auto mb-2 animate-spin" />
                    Carregando dados...
                </div>
            )}

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold text-slate-900 mb-4">Enviar Convite por Email</h2>
                        <form onSubmit={handleInvite} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={inviteEmail}
                                    onChange={e => setInviteEmail(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                    placeholder="joao@exemplo.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Função</label>
                                <div className="space-y-3">
                                    <select
                                        value={inviteRole}
                                        onChange={(e) => setInviteRole(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium bg-white"
                                    >
                                        {roles.map(role => (
                                            <option key={role.id} value={role.id}>{role.name}</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-slate-500">
                                        Selecione a função que este membro desempenhará.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowInviteModal(false)}
                                    className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={sendingInvite}
                                    className="flex-1 py-3 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-200 disabled:opacity-50"
                                >
                                    {sendingInvite ? 'Enviando...' : 'Enviar Convite'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Team Member Modal */}
            <TeamMemberModal
                member={selectedMember as any}
                isOpen={showMemberModal}
                onClose={() => setShowMemberModal(false)}
                onSave={fetchTeam}
                onMemberCreated={(credentials, name) => {
                    setNewMemberCredentials(credentials);
                    setNewMemberName(name);
                    setShowCredentialsModal(true);
                }}
            />

            {/* Crew Modal */}
            <CrewModal
                isOpen={showCrewModal}
                onClose={() => setShowCrewModal(false)}
                onSave={fetchTeam}
                crew={selectedCrew}
                members={members}
            />

            {/* Availability Editor */}
            {/* Credentials Modal */}
            <CredentialsModal
                isOpen={showCredentialsModal}
                onClose={() => setShowCredentialsModal(false)}
                credentials={newMemberCredentials || { app_url: '', email: '', password: '', expires_in: '' }}
                memberName={newMemberName}
            />

            {selectedMember && (
                <AvailabilityEditor
                    memberId={selectedMember.id}
                    memberName={selectedMember.name}
                    isOpen={showAvailabilityModal}
                    onClose={() => setShowAvailabilityModal(false)}
                />
            )}
        </div>
    );
};
