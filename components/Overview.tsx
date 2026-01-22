import React, { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  TrendingUp,
  BrainCircuit,
  Loader2,
  HardHat,
  Users
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { createClient } from '../lib/supabase/client.ts';
import { useRole } from '../hooks/use-role.ts';
import { OwnerDashboard } from './OwnerDashboard.tsx';

export const Overview: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [aiInsight, setAiInsight] = useState<{ summary: string; sentiment: number } | null>(null);
  const supabase = createClient();
  const { role, isOwner, isStaff, isAdmin } = useRole();
  console.log('Overview Debug:', { role, isOwner });

  useEffect(() => {
    async function fetchData() {
      try {
        if (isOwner || isStaff) {
          setLoading(false);
          return;
        }

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        // 1. Fetch MTD Bookings (Revenue & Turnovers)
        const { data: bookings } = await supabase
          .from('bookings')
          .select('price, status, start_date')
          .gte('start_date', startOfMonth)
          .or('status.eq.confirmed,status.eq.completed') as { data: any[] };

        // 2. Fetch Team Count
        const { count: teamCount } = await supabase
          .from('team_members')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active');

        // 3. Fetch AI Intelligence (Score & Insights)
        const { data: aiCalls } = await supabase
          .from('call_intelligence')
          .select('sentiment_score, summary, created_at')
          .order('created_at', { ascending: false })
          .limit(20) as any;

        // Process Data
        const validBookings: any[] = bookings || [];
        const mtdRevenue = validBookings.reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);
        const totalBookings = validBookings.length;

        // AI Score Calculation (Avg of last 20 calls)
        let aiScore = 0;
        let aiScoreLabel = 'N/A';
        let latestInsight = { summary: 'Nenhuma análise recente', sentiment: 0 };

        if (aiCalls && aiCalls.length > 0) {
          const totalScore = aiCalls.reduce((acc, call) => acc + (Number(call.sentiment_score) || 0), 0);
          // sentiment_score is -1 to 1. Normalize to 0-100%
          // (0.5 + 1) / 2 = 0.75 -> 75%
          // (-0.5 + 1) / 2 = 0.25 -> 25%
          const avgRaw = totalScore / aiCalls.length;
          aiScore = Math.round(((avgRaw + 1) / 2) * 100);
          aiScoreLabel = `${aiScore}%`;

          const lastCall = aiCalls[0];
          latestInsight = {
            summary: lastCall.summary || 'Análise indisponível',
            sentiment: Math.round(((Number(lastCall.sentiment_score) + 1) / 2) * 100)
          };
        } else {
          // Default 0 if no calls
          aiScoreLabel = '0%';
        }

        setStats([
          { label: 'Turnovers (Mês)', value: totalBookings.toString(), change: '', icon: Calendar, color: 'text-blue-500' },
          { label: 'Equipe em Campo', value: (teamCount || 0).toString(), change: '', icon: Users, color: 'text-indigo-500' },
          { label: 'Faturamento MTD', value: `R$ ${mtdRevenue.toFixed(2)}`, change: '', icon: TrendingUp, color: 'text-emerald-500' },
          { label: 'IA Score Médio', value: aiScoreLabel, change: '', icon: BrainCircuit, color: 'text-purple-500' },
        ]);

        // Setup AI Insight Card using latestInsight state/variable
        // (We need to store this separately or use it in the render)
        // For now, I'll update the render to check stats or use a separate state? 
        // Let's us a simple state for insights
        setAiInsight(latestInsight);

        // Build Chart Data (Weekly Aggregation)
        const weeks = [0, 0, 0, 0]; // 4 weeks
        validBookings.forEach(b => {
          const day = new Date(b.start_date).getDate();
          const weekIndex = Math.min(Math.floor((day - 1) / 7), 3);
          weeks[weekIndex] += Number(b.price) || 0;
        });

        setChartData([
          { name: 'Sem 1', revenue: weeks[0] },
          { name: 'Sem 2', revenue: weeks[1] },
          { name: 'Sem 3', revenue: weeks[2] },
          { name: 'Sem 4', revenue: weeks[3] },
        ]);

      } catch (err) {
        console.error('Overview Data Error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [role, isOwner, isStaff]);

  if (loading) return (
    <div className="flex h-96 items-center justify-center">
      <Loader2 className="animate-spin text-indigo-600" size={40} />
    </div>
  );


  // 1. Owner View
  if (isOwner || role === 'super_admin' || role === 'property_owner') {
    return <OwnerDashboard />;
  }

  // 2. Staff & Cleaner View (Placeholder/Fallback)
  if (isStaff || role === 'cleaner') {
    return (
      <div className="glass-panel p-8 rounded-3xl flex flex-col items-center justify-center h-96 text-center">
        <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <HardHat size={32} className="text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Área da Equipe</h2>
        <p className="text-[var(--text-secondary)] mt-2">
          {role === 'cleaner'
            ? 'O App Mobile está carregando... Se não abrir, atualize a página.'
            : 'Você verá seus agendamentos e checklists aqui em breve.'}
        </p>
        <span className="mt-6 px-4 py-2 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full">
          {role === 'cleaner' ? 'App Cleaner' : 'Coming in Phase 4'}
        </span>
      </div>
    );
  }

  // 3. Admin View (Default)
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">Executive Dashboard</h2>
          <p className="text-[var(--text-secondary)] font-medium">Insights operacionais em tempo real.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="glass-panel p-6 rounded-3xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
            <div className="flex items-center justify-between">
              <div className={`rounded-2xl p-3 bg-opacity-10 ${stat.color.replace('text-', 'bg-')}`}>
                <stat.icon size={24} className={stat.color} />
              </div>
              <div className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                {stat.change} <ArrowUpRight size={14} />
              </div>
            </div>
            <div className="mt-5">
              <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest opacity-80">{stat.label}</p>
              <h3 className="text-3xl font-bold text-[var(--text-primary)] mt-1 tracking-tight">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 glass-panel p-8 rounded-[2.5rem]">
          <h3 className="text-xl font-bold text-[var(--text-primary)] mb-8">Performance Financeira</h3>
          <div className="h-[350px] min-h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(200,200,200,0.1)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--glass-bg)', backdropFilter: 'blur(10px)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#4f46e5" fillOpacity={1} fill="url(#colorRev)" strokeWidth={4} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[2.5rem] bg-gradient-to-br from-indigo-900 to-slate-900 p-8 text-white shadow-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-6">
              <BrainCircuit size={20} className="text-indigo-300" />
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">IA Post-Call Insights</span>
            </div>
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <p className="text-sm font-bold opacity-80">Sentimento Positivo</p>
                <span className="text-3xl font-black tracking-tight">{aiInsight ? `${aiInsight.sentiment}%` : '0%'}</span>
              </div>
              <div className="space-y-2">
                <h5 className="text-[10px] font-bold text-indigo-300 uppercase">AI Action Items</h5>
                <div className="text-xs bg-white/5 p-3 rounded-xl border border-white/10 flex items-center gap-2 backdrop-blur-sm">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  <span className="line-clamp-2">
                    {aiInsight ? aiInsight.summary : 'Aguardando chamadas para análise...'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <button className="relative z-10 w-full py-4 mt-6 rounded-2xl bg-white text-indigo-900 font-bold text-xs uppercase shadow-lg hover:bg-indigo-50 transition-colors">Ver Relatório IA</button>
        </div>
      </div>
    </div>
  );
};