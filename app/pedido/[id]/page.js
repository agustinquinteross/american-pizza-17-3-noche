'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { Clock, Utensils, Truck, CheckCircle, Loader2, MapPin, Package, Receipt } from 'lucide-react'
import Link from 'next/link'

// Diccionario de estados para la barra de progreso - ESTÉTICA GUSTO
const STATUS_STEPS = {
  'pending': { step: 1, label: 'Pendiente', desc: 'Esperando confirmación', icon: Clock, color: 'text-white/40', bg: 'bg-white/10' },
  'cooking': { step: 2, label: 'En Cocina', desc: 'Marchando el pedido', icon: Utensils, color: 'text-[#E31B23]', bg: 'bg-[#E31B23]' },
  'delivery': { step: 3, label: 'En Camino', desc: 'Llevando tu pedido', icon: Truck, color: 'text-white', bg: 'bg-white' },
  'completed': { step: 4, label: 'Entregado', desc: '¡A disfrutar!', icon: CheckCircle, color: 'text-[#E31B23]', bg: 'bg-[#E31B23]' }
}

export default function PedidoTrackingPage() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!id) return

    // 1. Buscamos el pedido inicial via API Postgres
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${id}`);
        if (res.ok) {
           const data = await res.json();
           setOrder(data);
        } else {
           setError(true);
        }
      } catch(e) {
        console.error(e);
        setError(true);
      }
      setLoading(false)
    }

    fetchOrder()

    // 2. Nos suscribimos a los cambios EN VIVO via Pusher
    let pusherObj;
    let orderChannel;

    const setupPusher = async () => {
      const { pusherClient } = await import('../../../lib/pusher');
      pusherObj = pusherClient;
      orderChannel = pusherClient.subscribe('orders');
      
      orderChannel.bind('order-event', (data) => {
        // Si el evento es sobre este pedido o un refresh general
        if (data.orderId === id || data.orderId === Number(id) || !data.orderId) {
           fetchOrder();
           
           // Efecto de sonido cuando cambia de estado
           try {
              const audio = new Audio('https://cdn.freesound.org/previews/274/274183_4322723-lq.mp3')
              audio.play().catch(e => console.log('Audio error', e))
           } catch(e) {}
        }
      });
    };

    setupPusher();

    return () => {
      if (orderChannel) orderChannel.unbind_all();
      if (pusherObj) pusherObj.unsubscribe('orders');
    }
  }, [id])

  if (loading) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center"><Loader2 className="animate-spin text-[#E31B23]" size={48} /></div>
  
  if (error || !order) return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center text-white p-4 text-center">
        <Package size={64} className="text-white/20 mb-4"/>
        <h1 className="text-2xl font-black italic tracking-tighter uppercase text-[#E31B23]">PEDIDO NO ENCONTRADO</h1>
        <p className="text-white/50 font-bold uppercase text-[10px] tracking-widest mt-2">Revisá que el link sea correcto.</p>
        <Link href="/" className="mt-8 bg-[#E31B23] text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white hover:text-[#E31B23] transition-all shadow-xl">Volver al Menú</Link>
    </div>
  )

  const currentStep = STATUS_STEPS[order.status]?.step || 1

  return (
    <div className="min-h-screen bg-[#0A0A0A] font-sans text-white/90 pb-12 selection:bg-[#E31B23] selection:text-white">
      {/* HEADER PREMIUM (Logo limpio sin fondo) */}
      <div className="pt-12 pb-6 pointer-events-none flex flex-col items-center justify-center">
         <div className="w-32 mb-6 z-10 hover:scale-110 transition-transform duration-700 relative h-20">
             <Image src="/logo.png" alt="American Pizza" fill className="object-contain drop-shadow-2xl" priority />
         </div>
         <div className="flex flex-col items-center">
             <span className="text-white/40 text-[10px] font-black tracking-[0.4em] uppercase mb-2">Trazabilidad en Vivo</span>
             <p className="bg-[#E31B23] text-white font-black text-sm tracking-[0.2em] uppercase px-8 py-2.5 rounded-full shadow-2xl border border-white/20">#{order.id}</p>
         </div>
      </div>

      <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-6">
        
        {/* BARRA DE PROGRESO */}
        <div className="bg-[#1A1A1A] border border-white/10 rounded-[2.5rem] p-8 sm:p-10 shadow-2xl relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-2 ${STATUS_STEPS[order.status]?.bg || 'bg-white/10'} transition-all duration-1000 shadow-[0_0_20px_rgba(227,27,35,0.4)]`}></div>
            
            <h2 className="text-center text-4xl font-black text-white mb-2 italic tracking-tighter uppercase">Estado</h2>
            <p className="text-center text-[10px] font-black text-[#E31B23] uppercase tracking-[0.3em] mb-12">American Kitchen System v2.0</p>
            
            <div className="relative pl-2">
                <div className="space-y-4 relative z-10 flex flex-col">
                    {Object.entries(STATUS_STEPS).map(([statusKey, info], index, array) => {
                        const isCompleted = currentStep > info.step
                        const isCurrent = currentStep === info.step
                        const isLast = index === array.length - 1
                        const Icon = info.icon

                        return (
                            <div key={statusKey} className="flex flex-col">
                                <div className={`flex items-center gap-6 transition-all duration-700 relative z-20 ${isCurrent ? 'scale-[1.05]' : isCompleted ? 'opacity-90' : 'opacity-20 grayscale'}`}>
                                    <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shrink-0 border-2 transition-all duration-700 bg-black ${isCurrent ? `border-[#E31B23] text-[#E31B23] shadow-[0_0_30px_rgba(227,27,35,0.3)] ring-4 ring-[#E31B23]/10` : isCompleted ? `border-white text-white` : 'border-white/10 text-white/20'}`}>
                                        <Icon size={28} className={isCurrent ? 'animate-pulse' : ''} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className={`font-black text-xl italic uppercase tracking-widest ${isCurrent ? 'text-white' : isCompleted ? 'text-white/70' : 'text-white/20'}`}>{info.label}</h3>
                                        <p className={`text-sm font-bold ${isCurrent ? 'text-[#E31B23]' : 'text-white/30'}`}>{info.desc}</p>
                                    </div>
                                    {isCurrent && <div className="w-2.5 h-2.5 rounded-full bg-[#E31B23] animate-ping shrink-0 mr-4"></div>}
                                </div>
                                
                                {/* Segmento conector individual SOLO entre nodos, nunca cruzándolos */}
                                {!isLast && (
                                    <div className="ml-[31px] w-[2px] h-10 my-1 rounded-full relative">
                                        {/* Línea de fondo (gris) */}
                                        <div className="absolute inset-0 bg-white/5"></div>
                                        {/* Línea activa (coloreada si el paso superior está completado) */}
                                        <div className={`absolute top-0 left-0 w-full bg-[#E31B23] transition-all duration-1000 ease-in-out shadow-[0_0_10px_rgba(227,27,35,0.5)] ${isCompleted ? 'h-full' : 'h-0'}`}></div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>

        {/* DETALLES DEL PEDIDO */}
        <div className="bg-[#1A1A1A] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
            <h3 className="font-black text-white uppercase tracking-[0.2em] text-xs flex items-center gap-3 mb-8 border-b border-white/5 pb-6">
                <div className="bg-[#E31B23] p-2.5 rounded-xl text-white shadow-lg shadow-[#E31B23]/20"><Receipt size={18}/></div> 
                Resumen de Consumo
            </h3>
            
            <div className="space-y-4 mb-8">
                {order.order_items.map(item => (
                    <div key={item.id} className="flex justify-between items-start text-sm group">
                        <div className="flex-1">
                           <div className="flex items-center">
                               <span className="bg-[#E31B23] text-white font-black text-[10px] px-2 py-0.5 rounded-lg mr-4 shrink-0 shadow-md">{item.quantity}x</span>
                               <span className="text-white font-bold group-hover:text-[#E31B23] transition-colors uppercase tracking-tight">{item.product_name}</span>
                           </div>
                           {item.options && <p className="text-[11px] text-white/40 ml-[3.25rem] mt-1.5 font-medium leading-tight italic">+ {item.options}</p>}
                        </div>
                        <span className="text-white font-black tracking-tighter shrink-0 ml-4 text-lg italic">${item.price * item.quantity}</span>
                    </div>
                ))}
            </div>

            <div className="bg-black/50 rounded-3xl p-6 flex justify-between items-center border border-white/5 mt-8 shadow-inner">
                <span className="text-white/30 font-black text-[10px] uppercase tracking-[0.3em]">Total Abonado</span>
                <span className="text-4xl font-black text-white italic tracking-tighter sm:text-5xl drop-shadow-[0_2px_10px_rgba(255,255,255,0.1)]">${order.total}</span>
            </div>
        </div>

        {/* INFO EXTRA */}
        <div className="bg-transparent border border-white/10 rounded-[2rem] p-8 text-xs text-white/60 space-y-3 font-bold uppercase tracking-widest">
            <p className="flex items-center justify-between"><span className="text-white/30">Cliente</span> <span className="text-white font-black">{order.customer_name}</span></p>
            <p className="flex items-center justify-between"><span className="text-white/30">Entrega</span> <span className="text-white font-black">{order.delivery_method === 'delivery' ? '🛵 Domicilio' : '🏪 Local'}</span></p>
            {order.delivery_method === 'delivery' && (
                <div className="pt-4 mt-4 border-t border-white/5">
                    <p className="flex items-start gap-3 leading-relaxed text-[11px]">
                        <MapPin size={18} className="shrink-0 text-[#E31B23] shadow-lg shadow-[#E31B23]/20"/>
                        <span className="text-white/80">{order.customer_address}</span>
                    </p>
                </div>
            )}
        </div>

      </div>
    </div>
  )
}