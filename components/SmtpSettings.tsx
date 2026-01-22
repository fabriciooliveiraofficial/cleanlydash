import React, { useState, useEffect } from 'react';
import { createClient } from '../lib/supabase/client';
import { useTranslation } from 'react-i18next';
import { Mail, Server, Save, CheckCircle, AlertTriangle, RefreshCw, Lock, ShieldCheck, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export const SmtpSettings: React.FC = () => {
    const { t } = useTranslation();
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [testing, setTesting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Form State
    const [config, setConfig] = useState({
        host: '',
        port: 587,
        username: '',
        password: '',
        encryption: 'tls', // 'ssl' | 'tls' | 'none'
        from_email: '',
        from_name: ''
    });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('smtp_settings')
            .select('*')
            .eq('user_id', user.id)
            .single<any>();

        if (data) {
            // Determine encryption mode from new column or legacy secure bool
            let encMode = data.encryption || 'tls';

            // Backward compatibility if new column is empty but secure was set
            if (!data.encryption) {
                if (data.secure && data.port === 465) encMode = 'ssl';
                else if (data.secure === false) encMode = 'none';
                else encMode = 'tls'; // Default safer bet for 587
            }

            setConfig({
                host: data.host,
                port: data.port,
                username: data.username,
                password: data.password, // Ideally masked
                encryption: encMode,
                from_email: data.from_email,
                from_name: data.from_name
            });
        }
        setLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            toast.error("User not authenticated.");
            setSaving(false);
            return;
        }

        const { error } = await supabase
            .from('smtp_settings')
            .upsert({
                user_id: user.id,
                ...config,
                // Legacy field for older clients
                secure: config.encryption === 'ssl',
                is_active: true,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        if (error) {
            toast.error("Failed to save SMTP settings: " + error.message);
        } else {
            toast.success("SMTP Configuration saved successfully!");
        }
        setSaving(false);
    };

    const handleTestConnection = async () => {
        setTesting(true);

        try {
            const { error } = await supabase.functions.invoke('test_smtp', {
                body: {
                    host: config.host,
                    port: config.port,
                    username: config.username,
                    password: config.password,
                    encryption: config.encryption
                }
            });

            if (error) {
                let msg = error.message || "Falha na conexão";
                // Tenta extrair a mensagem real do corpo da resposta (Edge Function)
                if (typeof error === 'object' && error !== null && 'context' in error) {
                    try {
                        const body = await (error as any).context.json();
                        if (body && body.error) msg = body.error;
                    } catch (e) {
                        console.error("Erro ao fazer parse do corpo do erro:", e);
                    }
                }
                throw new Error(msg);
            }

            toast.success("Conexão Bem-sucedida!", {
                description: `Autenticado com criptografia ${config.encryption.toUpperCase()}`
            });

        } catch (err: any) {
            let msg = err.message;
            toast.error("Falha na Conexão", {
                description: `Erro: ${msg}`
            });
        }

        setTesting(false);
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Loading Configuration...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                        <Server size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Configuração de Servidor de E-mail (SMTP)</h2>
                        <p className="text-slate-500">Configure o envio de e-mails transacionais.</p>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Servidor SMTP (Host)</label>
                            <input
                                type="text"
                                value={config.host}
                                onChange={e => setConfig({ ...config, host: e.target.value })}
                                placeholder="smtp.gmail.com"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Porta</label>
                            <input
                                type="number"
                                value={config.port}
                                onChange={e => setConfig({ ...config, port: parseInt(e.target.value) })}
                                placeholder="587"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Usuário</label>
                            <input
                                type="text"
                                value={config.username}
                                onChange={e => setConfig({ ...config, username: e.target.value })}
                                placeholder="usuario"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Senha</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={config.password}
                                    onChange={e => setConfig({ ...config, password: e.target.value })}
                                    placeholder="••••••••"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none pr-10"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-3 text-slate-400 hover:text-indigo-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100 my-6"></div>

                    {/* Encryption Selection */}
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700">Tipo de Criptografia</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <button
                                type="button"
                                onClick={() => setConfig({ ...config, encryption: 'ssl', port: 465 })}
                                className={`p-4 rounded-xl border-2 text-left transition-all ${config.encryption === 'ssl' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 hover:border-slate-200'}`}
                            >
                                <div className="flex items-center gap-2 font-bold text-indigo-900 mb-1">
                                    <Lock size={18} />
                                    SSL / TLS Implícito
                                </div>
                                <p className="text-xs text-slate-500">Mais comum na porta 465. A conexão já nasce segura.</p>
                            </button>

                            <button
                                type="button"
                                onClick={() => setConfig({ ...config, encryption: 'tls', port: 587 })}
                                className={`p-4 rounded-xl border-2 text-left transition-all ${config.encryption === 'tls' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 hover:border-slate-200'}`}
                            >
                                <div className="flex items-center gap-2 font-bold text-indigo-900 mb-1">
                                    <ShieldCheck size={18} />
                                    STARTTLS
                                </div>
                                <p className="text-xs text-slate-500">Recomendado (Porta 587). Inicia inseguro e faz upgrade.</p>
                            </button>

                            <button
                                type="button"
                                onClick={() => setConfig({ ...config, encryption: 'none', port: 25 })}
                                className={`p-4 rounded-xl border-2 text-left transition-all ${config.encryption === 'none' ? 'border-red-200 bg-red-50' : 'border-slate-100 hover:border-slate-200'}`}
                            >
                                <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                                    <ShieldAlert size={18} />
                                    Nenhuma (Inseguro)
                                </div>
                                <p className="text-xs text-slate-500">Apenas para servidores internos ou testes locais.</p>
                            </button>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100 my-6"></div>

                    {config.host.includes('gmail') && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800 text-sm">
                            <AlertTriangle className="flex-shrink-0 mt-0.5" size={18} />
                            <div>
                                <p className="font-bold mb-1">Usando Gmail?</p>
                                <p>Recomendamos usar <strong>STARTTLS</strong> (Porta 587) e Senha de App.</p>
                            </div>
                        </div>
                    )}

                    {config.host.includes('hostinger') && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 text-blue-800 text-sm">
                            <CheckCircle className="flex-shrink-0 mt-0.5" size={18} />
                            <div>
                                <p className="font-bold mb-1">Hostinger Detectada</p>
                                <ul className="list-disc list-inside mt-1 ml-1 opacity-90">
                                    <li>Tente <strong>SSL/TLS Implícito</strong> na porta <strong>465</strong>.</li>
                                    <li>Ou <strong>STARTTLS</strong> na porta <strong>587</strong>.</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">E-mail de Envio (From)</label>
                            <input
                                type="email"
                                value={config.from_email}
                                onChange={e => setConfig({ ...config, from_email: e.target.value })}
                                placeholder="noreply@seudominio.com"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Nome de Envio</label>
                            <input
                                type="text"
                                value={config.from_name}
                                onChange={e => setConfig({ ...config, from_name: e.target.value })}
                                placeholder="Equipe Cleanlydash"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                required
                            />
                        </div>
                    </div>

                    <div className="flex justify-end items-center gap-4 pt-6 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={handleTestConnection}
                            disabled={testing}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all border
                                ${testing
                                    ? 'bg-amber-50 text-amber-600 border-amber-200 cursor-wait'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'}`}
                        >
                            {testing ? <RefreshCw className="animate-spin" size={18} /> : <AlertTriangle size={18} />}
                            {testing ? 'Testando...' : 'Testar Conexão'}
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all hover:scale-105 active:scale-95"
                        >
                            <Save size={18} />
                            {saving ? 'Salvando...' : 'Salvar Configuração'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-indigo-900 rounded-2xl p-6 text-white flex items-start gap-4">
                <div className="p-2 bg-white/10 rounded-lg">
                    <Mail size={24} />
                </div>
                <div>
                    <h3 className="font-bold text-lg mb-1">Como funciona?</h3>
                    <p className="text-indigo-200 text-sm leading-relaxed">
                        Estas configurações serão usadas para enviar todos os e-mails da plataforma em seu nome, incluindo:
                        <br />• Convites para novos membros da equipe
                        <br />• Recuperação de senha (se configurado)
                        <br />• Notificações de serviço para clientes
                    </p>
                </div>
            </div>
        </div>
    );
};
