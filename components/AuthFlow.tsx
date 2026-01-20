import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plane, ArrowLeft, Loader2, ShieldCheck, Mail, Lock, Building, User, Star, CreditCard, Eye, EyeOff } from 'lucide-react';
import { Button } from './ui/button.tsx';
import { Input } from './ui/input.tsx';
import { InternationalPhoneInput } from './ui/InternationalPhoneInput.tsx';
import { createClient } from '../lib/supabase/client.ts';
import { toast } from 'sonner';

interface AuthFlowProps {
  onBack: () => void;
  onAuthenticated: () => void;
  selectedPlan?: string;
  initialMode?: 'login' | 'register' | 'verify';
}

export const AuthFlow: React.FC<AuthFlowProps> = ({ onBack, onAuthenticated, selectedPlan, initialMode }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'verify' | 'forgot_password' | 'recovery_sent'>(initialMode || (selectedPlan ? 'register' : 'login'));
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tenantName: '',
    adminName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [plans, setPlans] = useState<any[]>([]);
  const [combos, setCombos] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>(selectedPlan || '');

  const supabase = createClient();

  useEffect(() => {
    const fetchPlans = async () => {
      const { data: plansData } = await (supabase.from('plans' as any)).select('*') as any;
      const { data: combosData } = await (supabase.from('combos' as any)).select('*').eq('active', true) as any;
      if (plansData) setPlans(plansData);
      if (combosData) setCombos(combosData);

      // If no plan selected, default to first combo or plan
      if (!selectedPlanId && mode === 'register') {
        if (combosData && combosData.length > 0) setSelectedPlanId(combosData[0].id);
        else if (plansData && plansData.length > 0) setSelectedPlanId(plansData[0].id);
      }
    };
    fetchPlans();
  }, []);

  // ensure prop updates sync (optional but good for strict routing)
  useEffect(() => {
    if (selectedPlan) setSelectedPlanId(selectedPlan);
  }, [selectedPlan]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        });
        if (error) throw error;
        onAuthenticated();
      } else if (mode === 'forgot_password') {
        const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
          redirectTo: `${window.location.origin}/auth/update-password`,
        });
        if (error) throw error;
        setMode('recovery_sent');
      } else {
        // Register Simulation
        if (formData.password !== formData.confirmPassword) {
          throw new Error("As senhas não coincidem.");
        }

        if (!selectedPlanId) {
          throw new Error("Por favor, selecione um plano.");
        }

        // Unified Registration (Fast Lane)
        console.log('Using Fast Registration...');
        toast.info("Criando conta e preparando checkout seguro...");

        const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('create-platform-checkout', {
          body: {
            email: formData.email,
            password: formData.password,
            tenant_name: formData.tenantName,
            admin_name: formData.adminName,
            phone: formData.phone,
            plan_id: selectedPlanId
          }
        });

        if (checkoutError) {
          console.error("Function Invocation Error:", checkoutError);

          let detailedMessage = "Unknown error";

          // FunctionsHttpError has a 'context' property with the Response object
          // We need to read the body to get the actual error message
          try {
            // The context is the raw Response - we already consumed it, but the data might be in checkoutError
            // Actually, supabase-js v2 puts the response body in checkoutError.context OR we need to check the structure
            if ((checkoutError as any).context) {
              // context is a Response object, try to get JSON from it
              const responseBody = await (checkoutError as any).context.json();
              console.error("Edge Function Error Body:", responseBody);
              if (responseBody.error) detailedMessage = responseBody.error;
              if (responseBody.details) console.error("Error Details:", responseBody.details);
            } else {
              // Fallback to message
              detailedMessage = checkoutError.message || JSON.stringify(checkoutError);
              try {
                const parsed = JSON.parse(detailedMessage);
                if (parsed.error) detailedMessage = parsed.error;
              } catch (e) { /* not json */ }
            }
          } catch (parseErr) {
            console.error("Failed to parse error context:", parseErr);
            detailedMessage = checkoutError.message || "Error communicating with server";
          }

          if (detailedMessage.includes("EMAIL_EXISTS") || detailedMessage.includes("already registered")) {
            throw new Error("Este email já está sendo usado por outra empresa/cliente. Para continuar, use outro email.");
          }

          if (detailedMessage.includes("PHONE_EXISTS")) {
            throw new Error("Este telefone já está cadastrado em outra empresa. Por favor, use outro número.");
          }

          throw new Error(`Erro no servidor: ${detailedMessage}`);
        }

        console.log("Checkout Response Data:", checkoutData);

        if (checkoutData?.url) {
          console.log("Registration successful, signing in...");

          // SIGN IN IMMEDIATELY BEFORE REDIRECT
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password
          });

          if (signInError) {
            console.error("Auto-login failed:", signInError);
            toast.error("Conta criada, mas falha no login automático. Faça login manualmente.");
            // We still redirect to Stripe if URL exists, user will just have to login later
            // OR we stop and force login? Usually better to continue to payment.
          } else {
            console.log("Auto-login successful");
          }

          console.log("Redirecting to:", checkoutData.url);
          window.location.href = checkoutData.url;
          return;
        } else {
          console.error("Missing URL in response:", checkoutData);
          throw new Error("O servidor respondeu, mas não gerou o link de pagamento. Tente novamente.");
        }
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isRegisterDisabled =
    !formData.tenantName ||
    !formData.adminName ||
    !formData.email ||
    !formData.phone ||
    formData.password.length < 8 ||
    formData.password !== formData.confirmPassword;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 py-12">
      <div className="absolute top-8 left-8">
        <Button variant="ghost" onClick={onBack} className="gap-2 font-bold text-slate-500">
          <ArrowLeft size={18} /> Voltar
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-indigo-600 rounded-2xl text-white flex items-center justify-center shadow-2xl shadow-indigo-100 mb-4">
            <Plane size={32} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Cleanlydash</h2>
          <p className="text-slate-500 font-medium">Gestão profissional para seus turnovers.</p>
        </div>

        <AnimatePresence mode="wait">
          {mode === 'verify' ? (
            <motion.div
              key="verify"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-[2rem] shadow-2xl border border-slate-100 text-center"
            >
              <div className="h-20 w-20 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-6">
                <Mail size={40} />
              </div>
              <h3 className="text-2xl font-black mb-2">Verifique seu e-mail</h3>
              <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                Enviamos um link de confirmação para <span className="text-indigo-600 font-bold">{formData.email}</span>. Clique no link para ativar sua conta.
              </p>
              <Button
                variant="outline"
                className="w-full h-12 rounded-xl border-slate-200 font-bold"
                onClick={() => setMode('login')}
              >
                Voltar para Login
              </Button>
            </motion.div>
          ) : mode === 'recovery_sent' ? (
            <motion.div
              key="recovery_sent"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-[2rem] shadow-2xl border border-slate-100 text-center"
            >
              <div className="h-20 w-20 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-6">
                <Mail size={40} />
              </div>
              <h3 className="text-2xl font-black mb-2">Verifique seu e-mail</h3>
              <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                Enviamos instruções de recuperação para <span className="text-indigo-600 font-bold">{formData.email}</span>.
              </p>
              <Button
                variant="outline"
                className="w-full h-12 rounded-xl border-slate-200 font-bold"
                onClick={() => setMode('login')}
              >
                Voltar para Login
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white p-8 rounded-[2rem] shadow-2xl border border-slate-100"
            >
              <form onSubmit={handleAuth} className="space-y-4">
                {mode === 'forgot_password' && (
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-black text-slate-900">Recuperar Senha</h3>
                    <p className="text-slate-500 text-sm">Digite seu e-mail para receber o link.</p>
                  </div>
                )}
                {mode === 'register' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Plano Escolhido</label>
                      <div className="relative">
                        <CreditCard className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <select
                          className="w-full h-11 pl-9 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all appearance-none"
                          value={selectedPlanId}
                          onChange={(e) => setSelectedPlanId(e.target.value)}
                        >
                          <option value="" disabled>Selecione um plano</option>
                          <optgroup label="Combos Promocionais">
                            {combos.map(combo => {
                              // Normalize name for matching
                              const name = combo.name.toLowerCase();
                              let displayPrice = combo.price_monthly_usd;

                              // Price Overrides to match Landing Page
                              if (name.includes('founder')) displayPrice = 49.90;
                              else if (name.includes('solopreneur')) displayPrice = 69.90;
                              else if (name.includes('growth')) displayPrice = 99.90;

                              return (
                                <option key={combo.id} value={combo.id}>{combo.name} - ${typeof displayPrice === 'number' ? displayPrice.toFixed(2) : displayPrice}/mês</option>
                              );
                            })}
                          </optgroup>
                          <optgroup label="Planos Individuais">
                            {plans.map(plan => {
                              const name = plan.name.toLowerCase();
                              let displayPrice = plan.price_monthly_usd;

                              if (name.includes('essential')) displayPrice = 29.90;
                              else if (name.includes('business')) displayPrice = 39.90;

                              return (
                                <option key={plan.id} value={plan.id}>{plan.name} - ${typeof displayPrice === 'number' ? displayPrice.toFixed(2) : displayPrice}/mês</option>
                              );
                            })}
                          </optgroup>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Nome da Empresa</label>
                      <div className="relative">
                        <Building className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder="Minha Gestora Ltda"
                          className="pl-9 h-11"
                          value={formData.tenantName}
                          onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Seu Nome</label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder="João Silva"
                          className="pl-9 h-11"
                          value={formData.adminName}
                          onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      className="pl-9 h-11"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                {mode === 'register' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Telefone</label>
                    <InternationalPhoneInput
                      value={formData.phone}
                      onChange={(val) => setFormData({ ...formData, phone: val })}
                      placeholder="Phone number"
                      defaultCountry="US"
                    />
                  </div>
                )}

                {mode !== 'forgot_password' && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Senha</label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => setMode('forgot_password')}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                        >
                          Esqueceu a senha?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-9 pr-10 h-11"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all active:scale-95"
                        title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {mode === 'register' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Confirmar Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-9 pr-10 h-11"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-2.5 p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all active:scale-95"
                        title={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading || (mode === 'register' && isRegisterDisabled)}
                  className="w-full h-12 bg-indigo-600 font-black uppercase tracking-widest mt-6 shadow-xl shadow-indigo-100"
                >
                  {loading ? <Loader2 className="animate-spin" /> : mode === 'login' ? 'Entrar no Painel' : mode === 'forgot_password' ? 'Enviar Link' : 'Criar Conta Grátis'}
                </Button>

                <div className="pt-6 text-center">
                  <button
                    type="button"
                    onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                    className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    {mode === 'login' ? 'Ainda não tem conta? Registre sua empresa' : mode === 'register' ? 'Já possui conta? Faça login' : 'Voltar para Login'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="mt-12 flex items-center gap-4 text-slate-300">
        <div className="flex items-center gap-1">
          <ShieldCheck size={14} />
          <span className="text-[10px] font-black uppercase tracking-tighter">Security Grade A+</span>
        </div>
        <div className="h-1 w-1 bg-slate-300 rounded-full"></div>
        <div className="flex items-center gap-1">
          <Star size={14} className="fill-amber-400 text-amber-400" />
          <span className="text-[10px] font-black uppercase tracking-tighter">4.9/5 G2 Rating</span>
        </div>
      </div>
    </div>
  );
};