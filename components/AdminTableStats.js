'use client'
import { TrendingUp, Users, Clock, Coffee } from 'lucide-react'

export default function AdminTableStats({ history }) {
    const totalRevenue = history.reduce((acc, s) => acc + (Number(s.total) || 0), 0)
    const totalSessions = history.length
    const avgTicket = totalSessions > 0 ? (totalRevenue / totalSessions).toFixed(2) : 0
    
    // Calcular mesa más popular
    const tableCounts = history.reduce((acc, s) => {
        const label = s.restaurant_tables?.label || 'S/N'
        acc[label] = (acc[label] || 0) + 1
        return acc
    }, {})
    
    const popularTable = Object.entries(tableCounts).sort((a,b) => b[1] - a[1])[0]?.[0] || '---'

    const stats = [
        { label: 'Recaudación Total', value: `$${totalRevenue}`, icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10' },
        { label: 'Total Servido', value: totalSessions, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { label: 'Ticket Promedio', value: `$${avgTicket}`, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
        { label: 'Mesa Más Activa', value: popularTable, icon: Coffee, color: 'text-[#E31B23]', bg: 'bg-[#E31B23]/10' },
    ]

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
                <div key={i} className="bg-[#1A1A1A] border border-white/10 p-5 rounded-[24px] flex items-center gap-4 hover:scale-[1.02] transition-all">
                    <div className={`p-4 ${stat.bg} ${stat.color} rounded-2xl`}>
                        <stat.icon size={24}/>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{stat.label}</p>
                        <p className="text-xl font-black text-white italic tracking-tighter">{stat.value}</p>
                    </div>
                </div>
            ))}
        </div>
    )
}
