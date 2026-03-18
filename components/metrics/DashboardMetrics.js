'use client'
import React, { useState, useEffect, useRef } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  Loader2, TrendingUp, ShoppingBag, Clock,
  Award, Wallet, CreditCard, Printer, Calendar
} from 'lucide-react';
// Eliminamos dependencia de Supabase para métricas

// ─────────────────────────────────────────────
// FORMATTING HELPERS
// ─────────────────────────────────────────────
function fmt(n) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000)    return `$${(n / 1000).toFixed(1)}K`;
  return `$${Math.round(n).toLocaleString('es-AR')}`;
}

function fmtFull(n) {
  return `$${Math.round(n).toLocaleString('es-AR')}`;
}

// ─────────────────────────────────────────────
// SUBCOMPONENTS
// ─────────────────────────────────────────────
function BentoCard({ children, className = "", delay = 0 }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const bgColor = className.includes('bg-') ? '' : 'bg-[#1A1A1A]';

  return (
    <div
      className={`relative overflow-hidden rounded-[32px] border border-white/5 p-4 sm:p-8 transition-all duration-700 ease-out shadow-2xl ${bgColor} ${className}`}
      style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.98)' }}
    >
      {children}
    </div>
  );
}

function CustomTooltip({ active, payload, label, prefix = '$' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl px-5 py-4 shadow-2xl backdrop-blur-xl">
      <p className="text-[10px] text-white/40 font-black uppercase mb-2 tracking-[0.2em]">{label}</p>
      <p className="text-white font-black text-2xl italic tracking-tighter">{prefix}{Number(payload[0].value).toLocaleString('es-AR')}</p>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
const PRESET_FILTERS = [
  { key: 'today',     label: 'Hoy' },
  { key: 'yesterday', label: 'Ayer' },
  { key: 'week',      label: '7 Días' },
  { key: 'month',     label: '30 Días' },
  { key: 'custom',    label: 'Custom' },
];

const PAYMENT_COLORS = ['#E31B23', '#FFFFFF', '#333333', '#666666'];

export default function DashboardMetrics() {
  const [loading, setLoading] = useState(true);
  
  // Rango de fechas
  const [dateFilter, setDateFilter] = useState('today');
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0];
  });
  const [customEnd, setCustomEnd] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [stats, setStats] = useState({
    kpi: { totalRevenue: 0, totalOrders: 0, avgTicket: 0, deliveryCount: 0, pickupCount: 0, dineInCount: 0, cashTotal: 0, mpTotal: 0 },
    hourlySales: [],
    topProducts: [],
    recentOrders: [],
    paymentBreakdown: [],
    deliveryBreakdown: [],
  });

  // Listener principal de recarga
  useEffect(() => {
    // Si elegimos "custom", solo disparamos manualmente (o si cambian las fechas directamente)
    // Para UX simple, disparamos siempre al cambiar.
    fetchMetrics();
  }, [dateFilter, customStart, customEnd]);

  const getDateRange = () => {
    const start = new Date();
    const end = new Date();
    
    if (dateFilter === 'today') {
      start.setHours(0, 0, 0, 0);
    } else if (dateFilter === 'yesterday') {
      start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);     end.setHours(23, 59, 59, 999);
    } else if (dateFilter === 'week') {
      start.setDate(start.getDate() - 7); start.setHours(0, 0, 0, 0);
    } else if (dateFilter === 'month') {
      start.setDate(start.getDate() - 30); start.setHours(0, 0, 0, 0);
    } else if (dateFilter === 'custom') {
      const s = new Date(customStart + "T00:00:00");
      const e = new Date(customEnd + "T23:59:59");
      return { start: s, end: e };
    }
    return { start, end };
  };

  const getLabelForPeriod = () => {
    if (dateFilter !== 'custom') {
      return PRESET_FILTERS.find(f => f.key === dateFilter)?.label.toUpperCase();
    }
    return `${customStart} a ${customEnd}`;
  };

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const { start, end } = getDateRange();

      const response = await fetch(`/api/admin/metrics?start=${start.toISOString()}&end=${end.toISOString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }

      const rawOrders = await response.json();
      processRawOrders(rawOrders || []);

    } catch (err) {
      console.error('Error fetching metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const processRawOrders = (orders) => {
    let totalRevenue = 0, deliveryCount = 0, pickupCount = 0, dineInCount = 0, cashTotal = 0, mpTotal = 0;
    const hourMap = {}, productMap = {};
    
    orders.forEach(order => {
      const amount = Number(order.total) || 0;
      totalRevenue += amount;
      if (order.delivery_method === 'delivery') deliveryCount++; 
      else if (order.delivery_method === 'mesa') dineInCount++;
      else pickupCount++;
      
      const method = order.payment_method?.toLowerCase() || '';
      if (['mercadopago', 'qr', 'tarjeta'].includes(method)) mpTotal += amount; 
      else cashTotal += amount;
      
      const hour = new Date(order.created_at).getHours();
      hourMap[hour] = (hourMap[hour] || 0) + amount;
      
      order.order_items?.forEach(item => {
        const name = item.product_name || 'Desconocido';
        productMap[name] = (productMap[name] || 0) + (item.quantity || 1);
      });
    });
    
    const kpi = { 
      totalRevenue, 
      totalOrders: orders.length, 
      avgTicket: orders.length > 0 ? totalRevenue / orders.length : 0, 
      deliveryCount, 
      pickupCount, 
      dineInCount,
      cashTotal, 
      mpTotal 
    };
    
    // Rellenamos siempre 24 horas para no romper el chart
    const hourlySales = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, total: hourMap[i] || 0 }));
    const topProducts = Object.entries(productMap).map(([name, cantidad]) => ({ name, cantidad })).sort((a, b) => b.cantidad - a.cantidad).slice(0, 6);
    const recentOrders = orders.slice(0, 15);
    
    setStats({
      kpi,
      hourlySales,
      topProducts,
      recentOrders,
      paymentBreakdown: [
        { name: 'Efectivo', value: kpi.cashTotal },
        { name: 'QR / MP', value: kpi.mpTotal },
      ].filter(p => p.value > 0),
      deliveryBreakdown: [
        { name: 'Delivery', value: kpi.deliveryCount },
        { name: 'Retiro', value: kpi.pickupCount },
        { name: 'Presencial', value: kpi.dineInCount },
      ].filter(p => p.value > 0),
    });
  };

  const generatePDF = async () => {
    const html2pdfModule = await import('html2pdf.js');
    const html2pdf = html2pdfModule.default;

    const element = document.getElementById('pdf-report-container');
    const opt = {
      margin:       0,
      filename:     `American_Burger_Analitica_${getLabelForPeriod().replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, letterRendering: true, logging: false },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(element).save();
  };

  const peakHour = stats.hourlySales.reduce((best, h) => h.total > best.total ? h : best, { hour: '-', total: 0 });
  const deliveryRate = stats.kpi.totalOrders > 0 ? Math.round((stats.kpi.deliveryCount / stats.kpi.totalOrders) * 100) : 0;
  const pickupRate = stats.kpi.totalOrders > 0 ? Math.round((stats.kpi.pickupCount / stats.kpi.totalOrders) * 100) : 0;
  const dineInRate = stats.kpi.totalOrders > 0 ? Math.round((stats.kpi.dineInCount / stats.kpi.totalOrders) * 100) : 0;
  
  const cashPct = stats.kpi.totalRevenue > 0 ? Math.round(stats.kpi.cashTotal / stats.kpi.totalRevenue * 100) : 0;
  const mpPct   = stats.kpi.totalRevenue > 0 ? Math.round(stats.kpi.mpTotal   / stats.kpi.totalRevenue * 100) : 0;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;700;900&display=swap');

        .dash { font-family: 'Inter', sans-serif; background: #0A0A0A; color: white; }
        .df   { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.05em; }
        .dash-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .dash-scroll::-webkit-scrollbar-track { background: transparent; }
        .dash-scroll::-webkit-scrollbar-thumb { background: #E31B23; border-radius: 6px; opacity: 0.4; }

        /* ── NATIVE PDF PRINT ENGINE ───────── */
        @media print {
          @page {
            size: A4 portrait;
            margin: 0; /* Controlamos márgenes manuales vía CSS */
          }
          
          html, body {
            width: 210mm;
            height: 297mm;
            background: #ffffff !important;
            margin: 0; padding: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Ocultar UI web en print */
          .dash { display: none !important; }

          /* Contenedor PDF */
          .pdf-print-root {
            display: block !important;
            width: 210mm;
            padding: 15mm;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: 'Inter', sans-serif;
            box-sizing: border-box;
          }

          /* Forzamos que CUALQUIER texto dentro del root impreso sea oscuro si no está definido en línea */
          .pdf-print-root *, .pdf-print-root p, .pdf-print-root span, .pdf-print-root div {
            color: inherit;
          }

          /* Control de rupturas de página para que las tablas no se corten solas */
          .pdf-keep-together { break-inside: avoid; page-break-inside: avoid; }
        }

        /* Ocultar en pantalla */
        @media screen {
          .pdf-print-root { display: none !important; }
        }
      `}} />

      <div className="dash space-y-6 pb-24 max-w-7xl mx-auto">

        {/* ── HEADER & CONTROLS ───────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 no-print bg-[#1A1A1A] p-8 rounded-[32px] border border-white/10 shadow-2xl">
          <div className="w-full lg:w-auto">
            <h1 className="df text-5xl sm:text-7xl text-white leading-none tracking-tighter italic uppercase">Inteligencia</h1>
            <p className="text-[9px] sm:text-[10px] font-black text-[#E31B23] uppercase tracking-[0.3em] mt-2">American Pizza • Analytics Engine v4.0</p>
          </div>
          
          <div className="flex flex-col items-end gap-4 w-full lg:w-auto">
            <div className="flex bg-black border border-white/10 rounded-2xl p-1 w-full sm:w-auto overflow-x-auto no-scrollbar mask-fade-right">
              <div className="flex gap-1">
                {PRESET_FILTERS.map(f => (
                  <button key={f.key} onClick={() => setDateFilter(f.key)}
                    className={`px-4 sm:px-6 py-2 rounded-xl transition-all text-[10px] sm:text-[11px] font-black uppercase tracking-widest whitespace-nowrap ${dateFilter === f.key ? 'bg-[#E31B23] text-white shadow-xl scale-105' : 'text-white/40 hover:text-white'}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {dateFilter === 'custom' && (
              <div className="flex items-center gap-4 bg-black border border-white/20 rounded-2xl p-3 w-full sm:w-auto animate-in slide-in-from-top-4 duration-500">
                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="bg-transparent text-[11px] font-black text-white/80 outline-none uppercase tracking-widest" />
                <span className="text-white/20 font-black text-[10px] uppercase">al</span>
                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="bg-transparent text-[11px] font-black text-white/80 outline-none uppercase tracking-widest" />
              </div>
            )}

            <button onClick={generatePDF} className="flex items-center justify-center gap-2 sm:gap-3 bg-white text-black px-4 sm:px-8 py-3 sm:py-4 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-[0.1em] sm:tracking-[0.2em] hover:bg-[#E31B23] hover:text-white transition-all shadow-2xl w-full lg:w-auto group">
              <Printer size={16} className="group-hover:rotate-12 transition-transform" /> EXPORTAR REPORTE PDF
            </button>
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin text-[#4A3B32]" size={40} />
            <p className="text-[#4A3B32]/60 text-xs font-black uppercase tracking-widest animate-pulse">Analizando Datos...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 auto-rows-min gap-4">
            
            {/* ── BENTO TOP LEVEL: BIG METRICS ──────────────── */}
            <BentoCard className="md:col-span-8 bg-[#E31B23] text-white border-none shadow-[0_20px_50px_rgba(227,27,35,0.3)]" delay={0}>
              <div className="flex flex-col h-full justify-between">
                <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] italic">Recaudación Operativa Bruta</p>
                <div className="mt-8 sm:mt-12 mb-6 sm:mb-8">
                  <p className="df text-[6rem] sm:text-[10rem] md:text-[12rem] leading-[0.7] drop-shadow-2xl">{fmt(stats.kpi.totalRevenue)}</p>
                  <p className="text-sm sm:text-xl font-black text-white italic mt-6 tracking-tighter opacity-80">{fmtFull(stats.kpi.totalRevenue)} Procesados en {stats.kpi.totalOrders} Tickets</p>
                </div>
                <div className="flex items-center justify-between border-t border-white/10 pt-8 mt-auto">
                  <div className="flex items-center gap-3">
                    <Calendar size={18} className="text-white/40" />
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/60">{getLabelForPeriod()}</span>
                  </div>
                  <div className="bg-white text-black text-[11px] font-black uppercase tracking-widest px-5 py-2 rounded-full shadow-xl italic tracking-tighter">Avg Ticket: {fmt(stats.kpi.avgTicket)}</div>
                </div>
              </div>
            </BentoCard>

            <div className="md:col-span-4 grid grid-rows-2 gap-4">
              <BentoCard className="bg-white text-black border-none group hover:scale-[1.02] transition-transform" delay={100}>
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center shadow-xl group-hover:rotate-12 transition-transform"><Clock size={24} /></div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-black/5 px-3 py-1.5 rounded-full">Peak Hour</span>
                </div>
                <div className="mt-10">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-30 italic">Punto de Saturación</p>
                  <p className="df text-7xl leading-none italic">{peakHour.hour}</p>
                  <p className="text-sm font-black mt-3 opacity-60 tracking-tight">{fmtFull(peakHour.total)} Operados</p>
                </div>
              </BentoCard>
              
              <BentoCard delay={200} className="bg-[#1A1A1A] border-white/10">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 rounded-2xl bg-[#E31B23]/10 flex items-center justify-center border border-[#E31B23]/20"><ShoppingBag size={24} className="text-[#E31B23]" /></div>
                </div>
                <div className="mt-10">
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2 italic">Flujo de Pedidos</p>
                  <div className="flex items-baseline gap-3">
                    <p className="df text-7xl text-white leading-none italic">{stats.kpi.totalOrders}</p>
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Tickets</p>
                  </div>
                </div>
              </BentoCard>
            </div>


            {/* ── BENTO MID LEVEL: CHARTS ──────────────── */}
            <BentoCard className="md:col-span-8 p-0 flex flex-col bg-black border-white/5 shadow-2xl" delay={300}>
               <div className="p-8 pb-4 flex justify-between items-center z-10">
                  <div>
                    <h3 className="df text-4xl text-white leading-none italic tracking-tighter uppercase">Flujo Operativo Acumulado</h3>
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mt-2 italic">Tráfico de ingresos por ventana horaria</p>
                  </div>
               </div>
               <div className="h-48 sm:h-72 mt-auto w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.hourlySales} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#E31B23" stopOpacity={0.6} />
                          <stop offset="100%" stopColor="#E31B23" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#E31B23', strokeWidth: 2, strokeDasharray: '5 5' }} />
                      <Area type="monotone" dataKey="total" stroke="#E31B23" strokeWidth={4} fill="url(#redGrad)" dot={false} activeDot={{ r: 8, fill: '#FFFFFF', strokeWidth: 0, shadow: '0 0 20px #E31B23' }} />
                    </AreaChart>
                  </ResponsiveContainer>
               </div>
            </BentoCard>

            <BentoCard className="md:col-span-4 bg-[#1A1A1A] border-white/5 shadow-2xl" delay={400}>
              <h3 className="df text-3xl sm:text-4xl text-white leading-none mb-1 sm:2 italic tracking-tighter uppercase">Tesorería</h3>
              <p className="text-[9px] sm:text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-4 sm:mb-6 italic">Eficacia de Recaudación</p>
              
              <div className="h-40 relative flex justify-center items-center">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={stats.paymentBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value" strokeWidth={0}>
                        {stats.paymentBreakdown.map((_, i) => <Cell key={i} fill={PAYMENT_COLORS[i % PAYMENT_COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                 </ResponsiveContainer>
                 <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <Wallet size={20} className="text-[#4A3B32]/70 mb-1" />
                 </div>
              </div>

              <div className="mt-8 space-y-4">
                 <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest">
                    <div className="flex items-center gap-3 text-white"><div className="w-4 h-4 rounded-lg bg-[#E31B23] shadow-[0_0_10px_rgba(227,27,35,0.5)]"></div> Efectivo</div>
                    <span className="text-[#E31B23] italic tracking-tight text-lg">{cashPct}%</span>
                 </div>
                 <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest">
                    <div className="flex items-center gap-3 text-white/70"><div className="w-4 h-4 rounded-lg bg-white"></div> QR / MP</div>
                    <span className="text-white italic tracking-tight text-lg">{mpPct}%</span>
                 </div>
              </div>
            </BentoCard>

            {/* ── BENTO BOTTOM LEVEL: LOGISTICS & RANKING ──────────────── */}
            <BentoCard className="md:col-span-4 bg-black border-white/5 shadow-2xl" delay={500}>
              <h3 className="df text-4xl text-white leading-none mb-2 italic tracking-tighter uppercase">Logística</h3>
              <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-10 italic">Distribución de Flotas</p>
              
              <div className="flex flex-col gap-4">
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <span className="font-black italic text-[9px] uppercase tracking-widest text-[#E31B23]">🛵 Delivery</span>
                    <span className="df text-2xl text-[#E31B23]">{deliveryRate}%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden p-0.5">
                    <div className="h-full bg-[#E31B23] rounded-full" style={{ width: `${deliveryRate}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-1">
                    <span className="font-black italic text-[9px] uppercase tracking-widest text-white/60">🏪 Retiro</span>
                    <span className="df text-2xl text-white">{pickupRate}%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden p-0.5">
                    <div className="h-full bg-white rounded-full" style={{ width: `${pickupRate}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-1">
                    <span className="font-black italic text-[9px] uppercase tracking-widest text-purple-500">🍽️ Presencial</span>
                    <span className="df text-2xl text-purple-500">{dineInRate}%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden p-0.5">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${dineInRate}%` }}></div>
                  </div>
                </div>
              </div>
            </BentoCard>

            <BentoCard className="md:col-span-8 overflow-hidden flex flex-col bg-[#1A1A1A] border-white/5 shadow-2xl" delay={600}>
               <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="df text-3xl sm:text-4xl text-white leading-none mb-1 sm:2 italic tracking-tighter uppercase">Pódium Gastronómico</h3>
                    <p className="text-[9px] sm:text-[10px] font-black text-white/30 uppercase tracking-[0.3em] italic">Productos de mayor rotación</p>
                  </div>
                  <div className="p-4 bg-[#E31B23]/10 rounded-2xl border border-[#E31B23]/20 shadow-xl shadow-[#E31B23]/10">
                    <Award className="text-[#E31B23] animate-pulse" size={32} />
                  </div>
               </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6">
                  {stats.topProducts.map((p, i) => (
                    <div key={p.name} className="flex items-center gap-4 group cursor-default">
                       <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 border-2 transition-all ${i === 0 ? 'bg-[#E31B23] text-white border-[#E31B23] shadow-lg shadow-[#E31B23]/30 scale-110' : 'bg-black text-white/60 border-white/5 group-hover:border-[#E31B23]/40'}`}>
                         {i + 1}
                       </div>
                       <div className="flex-1 min-w-0">
                         <p className="font-black text-xs text-white uppercase tracking-wider truncate mb-1 italic group-hover:text-[#E31B23] transition-colors">{p.name}</p>
                         <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">{p.cantidad} Unidades Vendidas</p>
                       </div>
                    </div>
                  ))}
                  {stats.topProducts.length === 0 && <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] col-span-2 text-center py-10 bg-black/20 rounded-2xl border border-dashed border-white/5">No hay registros operacionales</p>}
               </div>
            </BentoCard>

            {/* ── BENTO WIDE: REGISTRO HISTORICO LIMITADO A 15 ──────────────── */}
            <BentoCard className="md:col-span-12 p-0 overflow-hidden bg-[#1A1A1A] border-white/5 shadow-2xl" delay={700}>
              <div className="p-8 bg-white text-black flex justify-between items-center shadow-2xl relative z-10">
                <div className="w-full sm:w-auto">
                    <h3 className="df text-2xl sm:text-4xl leading-none italic uppercase tracking-tighter">Auditoría</h3>
                    <p className="text-[8px] sm:text-[10px] font-black text-black/40 uppercase tracking-[0.3em] mt-1 sm:mt-2 italic">Console v1.0</p>
                </div>
                <div className="bg-black text-white px-3 sm:px-5 py-1.5 sm:py-2 rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest italic">{stats.recentOrders.length} Eventos</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left bg-black/40">
                  <thead>
                    <tr>
                      {['ID', 'Sujeto', 'Cierre Bruto', 'Logística', 'Canal', 'TimeStamp'].map((h, i) => (
                        <th key={h} className={`px-8 py-5 bg-[#1A1A1A] text-[10px] font-black text-white/30 uppercase tracking-[0.3em] border-b border-white/5 italic ${i===2 ? 'text-right' : ''}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {stats.recentOrders.map(o => (
                      <tr key={o.id} className="hover:bg-white/[0.03] transition-all group">
                        <td className="px-8 py-5"><span className="text-[11px] font-black text-white bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl group-hover:border-[#E31B23]/40 group-hover:text-[#E31B23] transition-all italic tracking-tighter">#{o.id}</span></td>
                        <td className="px-8 py-5 font-black text-xs text-white uppercase tracking-wider truncate max-w-[150px] italic">{o.customer_name || 'Anónimo'}</td>
                        <td className="px-8 py-5 text-right"><span className="df text-2xl text-[#E31B23] italic tracking-tighter drop-shadow-[0_0_10px_rgba(227,27,35,0.2)]">{fmtFull(o.total)}</span></td>
                        <td className="px-8 py-5">
                           <span className={`text-[10px] font-black uppercase tracking-[0.2em] italic ${o.delivery_method === 'delivery' ? 'text-blue-400' : o.delivery_method === 'mesa' ? 'text-purple-400' : 'text-orange-400'}`}>
                              {o.delivery_method === 'delivery' ? '🛵 Motomensajería' : o.delivery_method === 'mesa' ? '🍽️ Salón / Mozo' : '🏪 Mostrador'}
                           </span>
                        </td>
                        <td className="px-8 py-5 text-[10px] font-black text-white/40 uppercase tracking-widest italic">{o.payment_method || 'CASH'}</td>
                        <td className="px-8 py-5 text-[10px] font-black text-white/20 uppercase tracking-widest italic">{new Date(o.created_at).toLocaleString('es-AR', { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit' })}</td>
                      </tr>
                    ))}
                    {stats.recentOrders.length === 0 && <tr><td colSpan={6} className="px-8 py-20 text-center text-[10px] font-black text-white/20 uppercase tracking-[0.5em] italic">No hay datos en memoria</td></tr>}
                  </tbody>
                </table>
              </div>
            </BentoCard>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════
          📄 PLANTILLA PDF OCULTA PARA HTML2PDF (210mm x 297mm)
      ══════════════════════════════════════════════ */}
      <div style={{ overflow: 'hidden', height: 0, width: 0, position: 'absolute', top: -9999, left: -9999 }}>
        <div id="pdf-report-container" style={{ width: '210mm', minHeight: '297mm', padding: '15mm', background: '#fff', color: '#000', fontFamily: '"Inter", sans-serif', boxSizing: 'border-box' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '6px solid #E31B23', paddingBottom: '30px', marginBottom: '30px' }}>
            <div>
              <h1 style={{ fontSize: '70px', fontWeight: '900', margin: 0, lineHeight: 0.8, fontFamily: '"Bebas Neue", sans-serif', letterSpacing: '-2px', fontStyle: 'italic' }}>AMERICAN PIZZA</h1>
              <p style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '6px', margin: '15px 0 0 0', color: '#E31B23' }}>Intelligence Report v4.0</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '3px', opacity: 0.4, margin: 0 }}>TIMEFRAME</p>
              <p style={{ fontSize: '22px', fontWeight: '900', margin: '4px 0 0 0', fontStyle: 'italic' }}>{getLabelForPeriod()}</p>
              <p style={{ fontSize: '9px', opacity: 0.5, margin: '6px 0 0 0', fontWeight: '900' }}>GENERATED: {new Date().toLocaleString('es-AR')}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginBottom: '25px' }}>
            <div style={{ background: '#000', color: '#fff', padding: '40px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
              <p style={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '4px', color: '#E31B23', margin: 0 }}>GROSS REVENUE</p>
              <p style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '90px', lineHeight: 0.8, margin: '25px 0', fontStyle: 'italic' }}>{fmtFull(stats.kpi.totalRevenue)}</p>
              <p style={{ fontSize: '12px', fontWeight: '900', opacity: 0.5, margin: 0, textTransform: 'uppercase', letterSpacing: '2px' }}>CONSOLIDATED IN {stats.kpi.totalOrders} TICKETS</p>
            </div>
            <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: '15px' }}>
              <div style={{ border: '3px solid #000', borderRadius: '24px', padding: '20px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '3px', opacity: 0.4, margin: 0 }}>AVG TICKET</p>
                  <p style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '45px', lineHeight: 1, margin: '10px 0 0 0', fontStyle: 'italic' }}>{fmtFull(stats.kpi.avgTicket)}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '3px', opacity: 0.4, margin: 0 }}>PEAK</p>
                  <p style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '45px', lineHeight: 1, margin: '10px 0 0 0', color: '#E31B23', fontStyle: 'italic' }}>{peakHour.hour}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1, background: '#f5f5f5', border: '3px solid #000', borderRadius: '24px', padding: '20px', color: '#000' }}>
                  <p style={{ margin: 0, fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px' }}>PAGOS QR / TJ / MP</p>
                  <p style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '35px', margin: '8px 0', fontStyle: 'italic' }}>{mpPct}%</p>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: '900' }}>{fmtFull(stats.kpi.mpTotal)}</p>
                </div>
                <div style={{ flex: 1, background: '#E31B23', borderRadius: '24px', padding: '20px', color: '#fff' }}>
                  <p style={{ margin: 0, fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.8 }}>CASH / EFECTIVO</p>
                  <p style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '35px', margin: '8px 0', fontStyle: 'italic' }}>{cashPct}%</p>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: '900' }}>{fmtFull(stats.kpi.cashTotal)}</p>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '25px', marginBottom: '25px' }}>
             <div style={{ border: '3px solid #000', borderRadius: '24px', padding: '25px', background: '#fff' }}>
               <h3 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '28px', letterSpacing: '2px', borderBottom: '4px solid #f5f5f5', paddingBottom: '15px', margin: '0 0 25px 0', color: '#000', fontStyle: 'italic' }}>LOGISTICS</h3>
               <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: '900', color: '#000', textTransform: 'uppercase', letterSpacing: '1px' }}>Delivery: {stats.kpi.deliveryCount}</p>
               <div style={{ width: '100%', height: '12px', background: '#f5f5f5', borderRadius: '6px', marginBottom: '15px', padding: '2px' }}>
                 <div style={{ width: `${deliveryRate}%`, height: '100%', background: '#E31B23', borderRadius: '4px' }}></div>
               </div>
               <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: '900', color: '#000', textTransform: 'uppercase', letterSpacing: '1px' }}>Counter: {stats.kpi.pickupCount}</p>
               <div style={{ width: '100%', height: '12px', background: '#f5f5f5', borderRadius: '6px', marginBottom: '15px', padding: '2px' }}>
                 <div style={{ width: `${pickupRate}%`, height: '100%', background: '#000', borderRadius: '4px' }}></div>
               </div>
               <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: '900', color: '#000', textTransform: 'uppercase', letterSpacing: '1px' }}>Mesa / Salón: {stats.kpi.dineInCount}</p>
               <div style={{ width: '100%', height: '12px', background: '#f5f5f5', borderRadius: '6px', padding: '2px' }}>
                 <div style={{ width: `${dineInRate}%`, height: '100%', background: '#A855F7', borderRadius: '4px' }}></div>
               </div>
             </div>
             <div style={{ border: '3px solid #000', borderRadius: '24px', padding: '25px', background: '#fff' }}>
               <h3 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '28px', letterSpacing: '2px', borderBottom: '4px solid #f5f5f5', paddingBottom: '15px', margin: '0 0 25px 0', color: '#000', fontStyle: 'italic' }}>TOP CONSOLIDATED PRODUCTS</h3>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px 35px' }}>
                 {stats.topProducts.map((p, i) => (
                   <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '15px', borderBottom: '2px solid #f5f5f5', paddingBottom: '15px' }}>
                     <div style={{ fontWeight: '900', fontSize: '16px', color: '#E31B23', fontStyle: 'italic' }}>{i+1}.</div>
                     <div style={{ fontWeight: '900', fontSize: '12px', color: '#000', flex: 1, textTransform: 'uppercase', letterSpacing: '1px' }}>{p.name}</div>
                     <div style={{ fontWeight: '900', fontSize: '18px', color: '#000' }}>{p.cantidad}</div>
                   </div>
                 ))}
               </div>
             </div>
          </div>

          <div style={{ border: '3px solid #000', borderRadius: '24px', overflow: 'hidden', pageBreakInside: 'avoid' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#000', color: '#fff', padding: '20px 30px' }}>
              <h3 style={{ margin: 0, fontFamily: '"Bebas Neue", sans-serif', fontSize: '28px', letterSpacing: '2px', fontStyle: 'italic' }}>AUDIT LOG / OPERATIONS HISTORY</h3>
              <p style={{ margin: 0, fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px' }}>{stats.recentOrders.length} TICKETS RECORDED</p>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11px', background: '#fff' }}>
              <thead>
                <tr style={{ background: '#f5f5f5', borderBottom: '4px solid #000' }}>
                  <th style={{ padding: '15px 20px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px' }}>FOLIO</th>
                  <th style={{ padding: '15px 20px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px' }}>TIMESTAMP</th>
                  <th style={{ padding: '15px 20px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px' }}>CLIENT / SUBJECT</th>
                  <th style={{ padding: '15px 20px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px' }}>METHOD</th>
                  <th style={{ padding: '15px 20px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px', textAlign: 'right' }}>GROSS TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((o, i) => (
                  <tr key={o.id} style={{ borderBottom: '2px solid #f5f5f5' }}>
                    <td style={{ padding: '15px 20px', fontWeight: '900' }}>#{o.id}</td>
                    <td style={{ padding: '15px 20px', fontWeight: '900', opacity: 0.5 }}>{new Date(o.created_at).toLocaleString('es-AR', { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit'})}</td>
                    <td style={{ padding: '15px 20px', fontWeight: '900' }}>{o.customer_name || 'UNDEFINED'}</td>
                    <td style={{ padding: '15px 20px', fontWeight: '900', textTransform: 'uppercase', opacity: 0.5 }}>{o.delivery_method}</td>
                    <td style={{ padding: '15px 20px', fontWeight: '900', textAlign: 'right', fontSize: '16px', color: '#E31B23', fontStyle: 'italic' }}>{fmtFull(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '50px', borderTop: '4px solid #000', paddingTop: '20px', textAlign: 'center', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '8px', opacity: 0.2 }}>
            CONFIDENTIAL • INTERNAL AUDIT • AMERICAN PIZZA
          </div>

        </div>
      </div>
    </>
  );
}