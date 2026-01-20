import React, { useState, useEffect } from 'react';
import { createClient } from '../../lib/supabase/client';
import { usePermission, PERMISSIONS, PermissionKey } from '../../hooks/use-permission';
import { Shield, Plus, Trash2, Check, X, AlertTriangle, Lock, Smartphone, Monitor } from 'lucide-react';
import { toast } from 'sonner';

interface CustomRole {
    id: string;
    name: string;
    description: string;
    permissions: PermissionKey[];
    is_system: boolean;
    app_access: 'dashboard' | 'cleaner_app';
}

const MODULES = {
    'Financeiro': [PERMISSIONS.FINANCE_VIEW_BALANCE, PERMISSIONS.FINANCE_MANAGE_FUNDS],
    'Pagamentos': [PERMISSIONS.PAYROLL_VIEW, PERMISSIONS.PAYROLL_MANAGE],
    'Equipe': [PERMISSIONS.TEAM_VIEW, PERMISSIONS.TEAM_MANAGE],
    'Clientes': [PERMISSIONS.CUSTOMERS_VIEW, PERMISSIONS.CUSTOMERS_MANAGE],
    'Operacional': [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_MANAGE_ALL],
    'Configurações': [PERMISSIONS.SETTINGS_VIEW, PERMISSIONS.SETTINGS_MANAGE],
};

const PERMISSION_LABELS: Record<string, string> = {
    [PERMISSIONS.FINANCE_VIEW_BALANCE]: 'Ver Saldo e Extrato',
    [PERMISSIONS.FINANCE_MANAGE_FUNDS]: 'Adicionar/Sacar Fundos',
    [PERMISSIONS.PAYROLL_VIEW]: 'Ver Holerites',
    [PERMISSIONS.PAYROLL_MANAGE]: 'Gerenciar Pagamentos',
    [PERMISSIONS.TEAM_VIEW]: 'Ver Lista de Membros',
    [PERMISSIONS.TEAM_MANAGE]: 'Convidar/Editar Membros',
    [PERMISSIONS.CUSTOMERS_VIEW]: 'Ver Clientes',
    [PERMISSIONS.CUSTOMERS_MANAGE]: 'Criar/Editar Clientes',
    [PERMISSIONS.TASKS_VIEW]: 'Ver Tarefas',
    [PERMISSIONS.TASKS_MANAGE_ALL]: 'Gerenciar Todas Tarefas',
    [PERMISSIONS.SETTINGS_VIEW]: 'Ver Configurações',
    [PERMISSIONS.SETTINGS_MANAGE]: 'Editar Configurações Globais',
};

export const RolesAndPermissions: React.FC = () => {
    const [roles, setRoles] = useState<CustomRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRole, setSelectedRole] = useState<CustomRole | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const supabase = createClient();
    const { can } = usePermission();

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('custom_roles')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) {
            toast.error('Erro ao carregar funções');
            console.error(error);
        } else {
            setRoles(data as any[]); // Temporary cast until types generated
            if (data && data.length > 0 && !selectedRole) {
                setSelectedRole(data[0] as any);
            }
        }
        setLoading(false);
    };

    const updateAppAccess = async (role: CustomRole, access: 'dashboard' | 'cleaner_app') => {
        if (!can(PERMISSIONS.SETTINGS_MANAGE)) {
            toast.error("Sem permissão para editar funções.");
            return;
        }

        // Optimistic Update
        const updatedRole = { ...role, app_access: access };
        setRoles(roles.map(r => r.id === role.id ? updatedRole : r));
        if (selectedRole?.id === role.id) setSelectedRole(updatedRole);

        // Server Update
        const { error } = await supabase
            .from('custom_roles')
            .update({ app_access: access })
            .eq('id', role.id);

        if (error) {
            toast.error("Falha ao salvar tipo de acesso");
            setRoles(roles.map(r => r.id === role.id ? role : r));
        }
    };

    const togglePermission = async (role: CustomRole, permission: PermissionKey) => {
        if (!can(PERMISSIONS.SETTINGS_MANAGE)) {
            toast.error("Sem permissão para editar funções.");
            return;
        }

        const hasPermission = role.permissions.includes(permission);
        let newPermissions: PermissionKey[];

        if (hasPermission) {
            newPermissions = role.permissions.filter(p => p !== permission);
        } else {
            newPermissions = [...role.permissions, permission];
        }

        // Optimistic Update
        const updatedRole = { ...role, permissions: newPermissions };
        setRoles(roles.map(r => r.id === role.id ? updatedRole : r));
        if (selectedRole?.id === role.id) setSelectedRole(updatedRole);

        // Server Update
        const { error } = await supabase
            .from('custom_roles')
            .update({ permissions: newPermissions })
            .eq('id', role.id);

        if (error) {
            toast.error("Falha ao salvar permissões");
            // Revert
            setRoles(roles.map(r => r.id === role.id ? role : r));
        }
    };

    const openCreateModal = () => {
        setNewRoleName('');
        setIsCreateModalOpen(true);
    }

    const handleCreateRole = async () => {
        if (!newRoleName.trim()) return;
        setIsCreateModalOpen(false);

        const { data, error } = await supabase
            .from('custom_roles')
            .insert([{
                name: newRoleName,
                description: 'Função customizada',
                permissions: [] as PermissionKey[],
                app_access: 'dashboard',
                tenant_id: (await supabase.auth.getUser()).data.user?.id
            }] as any)
            .select()
            .single();

        if (error) {
            toast.error("Erro ao criar função");
        } else {
            setRoles([...roles, data as any]);
            setSelectedRole(data as any);
            toast.success("Função criada com sucesso!");
        }
    };

    const deleteRole = async (roleId: string) => {
        if (!confirm("Tem certeza? Membros com esta função perderão acesso.")) return;
        const { error } = await supabase.from('custom_roles').delete().eq('id', roleId);
        if (error) {
            toast.error("Erro ao excluir função");
        } else {
            setRoles(roles.filter(r => r.id !== roleId));
            if (selectedRole?.id === roleId) setSelectedRole(roles[0] || null);
            toast.success("Função removida.");
        }
    }

    if (loading) return <div className="p-8 text-center">Carregando permissões...</div>;

    return (
        <div className="flex flex-col md:flex-row h-[calc(100vh-140px)] gap-6">
            {/* Left Sidebar: Roles List */}
            <div className="w-full md:w-64 flex flex-col gap-2">
                <div className="flex items-center justify-between mb-2 px-2">
                    <h3 className="font-bold text-slate-700">Funções</h3>
                    <button onClick={openCreateModal} className="p-1.5 rounded-lg hover:bg-slate-200 text-indigo-600 transition-colors">
                        <Plus size={18} />
                    </button>
                </div>

                <div className="space-y-1">
                    {roles.map(role => (
                        <button
                            key={role.id}
                            onClick={() => setSelectedRole(role)}
                            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-between group
                                ${selectedRole?.id === role.id
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'}`}
                        >
                            <span>{role.name}</span>
                            {role.is_system && <Lock size={12} className="opacity-50" />}
                            {!role.is_system && (
                                <div onClick={(e) => { e.stopPropagation(); deleteRole(role.id); }} className="opacity-0 group-hover:opacity-100 hover:text-red-300 p-1">
                                    <Trash2 size={14} />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Area: Permission Matrix */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                {selectedRole ? (
                    <>
                        <div className="p-6 border-b border-slate-100">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Shield className="text-indigo-600" size={24} />
                                Permissões: {selectedRole.name}
                            </h2>
                            <p className="text-slate-500 text-sm mt-1">{selectedRole.description}</p>

                            <div className="mt-6 flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div className="flex-1">
                                    <h4 className="font-bold text-slate-800 text-sm">Tipo de Acesso</h4>
                                    <p className="text-xs text-slate-500">Define qual plataforma este membro irá utilizar.</p>
                                </div>
                                <div className="flex bg-white rounded-lg p-1 border border-slate-200">
                                    <button
                                        onClick={() => updateAppAccess(selectedRole, 'dashboard')}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all
                                            ${selectedRole.app_access !== 'cleaner_app'
                                                ? 'bg-indigo-100 text-indigo-700 shadow-sm'
                                                : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <Monitor size={14} />
                                        Dashboard
                                    </button>
                                    <button
                                        onClick={() => updateAppAccess(selectedRole, 'cleaner_app')}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all
                                            ${selectedRole.app_access === 'cleaner_app'
                                                ? 'bg-indigo-100 text-indigo-700 shadow-sm'
                                                : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <Smartphone size={14} />
                                        App Cleaner
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {Object.entries(MODULES).map(([moduleName, permissions]) => (
                                    <div key={moduleName} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                        <h4 className="font-bold text-indigo-900 mb-3 text-sm uppercase tracking-wider">{moduleName}</h4>
                                        <div className="space-y-3">
                                            {permissions.map(permissionKey => {
                                                const isEnabled = selectedRole.permissions.includes(permissionKey);
                                                return (
                                                    <div key={permissionKey} className="flex items-center justify-between">
                                                        <span className="text-sm text-slate-700 font-medium">
                                                            {PERMISSION_LABELS[permissionKey] || permissionKey}
                                                        </span>
                                                        <button
                                                            onClick={() => togglePermission(selectedRole, permissionKey)}
                                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                                                                ${isEnabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                                        >
                                                            <span
                                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                                                                    ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                                                            />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-400">
                        Selecione uma função para editar
                    </div>
                )}
                {/* Create Role Modal */}
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
                            <h3 className="text-lg font-bold text-slate-800 mb-1">Nova Função</h3>
                            <p className="text-sm text-slate-500 mb-4">Dê um nome para a nova função da equipe.</p>

                            <input
                                autoFocus
                                type="text"
                                placeholder="Ex: Gerente Financeiro"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all text-sm mb-6"
                                value={newRoleName}
                                onChange={(e) => setNewRoleName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateRole()}
                            />

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleCreateRole}
                                    className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                                    disabled={!newRoleName.trim()}
                                >
                                    Criar Função
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
