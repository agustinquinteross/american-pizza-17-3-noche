'use client'
import { Printer, X, Instagram, Globe, Phone } from 'lucide-react'

export default function AdminSessionReceipt({ session, orders, onClose }) {
    if (!session) return null

    const handlePrint = () => {
        window.print()
    }

    const subtotal = orders.reduce((acc, o) => acc + o.total, 0)
    const discount = session.discount || 0
    const total = subtotal - discount

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
            <div className="w-full max-w-sm bg-white text-black p-0 rounded-[40px] shadow-2xl flex flex-col overflow-hidden print:shadow-none print:w-full print:rounded-none">
                
                {/* Botones de acción (No se imprimen) */}
                <div className="p-6 border-b border-black/5 flex justify-between items-center bg-gray-50 print:hidden">
                    <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors text-black/40"><X size={20}/></button>
                    <button onClick={handlePrint} className="flex items-center gap-2 bg-[#E31B23] text-white px-6 py-2 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-[#E31B23]/20 hover:scale-105 active:scale-95 transition-all">
                        <Printer size={16}/> Imprimir Ticket
                    </button>
                </div>

                {/* Ticket Real (Optimizado para papel térmico 80mm) */}
                <div className="p-10 font-mono text-[11px] leading-relaxed flex flex-col gap-6 print:p-4">
                    
                    {/* ENCABEZADO PREMIUM */}
                    <div className="text-center space-y-2">
                        <div className="inline-block border-2 border-black p-2 mb-2">
                            <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">American</h2>
                            <h2 className="text-2xl font-black uppercase tracking-tighter leading-none text-[#E31B23]">Burger</h2>
                        </div>
                        <p className="font-black text-[10px] tracking-widest uppercase opacity-70">Industrial Dark Cuisine</p>
                        <div className="h-[1px] w-full bg-black/10 my-4"></div>
                        <p className="font-bold text-[13px]">ORDEN DE CONSUMO</p>
                        <p className="text-[9px] opacity-40 uppercase tracking-tighter">{new Date().toLocaleString('es-AR')}</p>
                    </div>

                    {/* DATOS DE LA MESA */}
                    <div className="border-y-2 border-dashed border-black/10 py-3 space-y-1">
                        <div className="flex justify-between font-black text-[12px]">
                            <span>MESA: {session.restaurant_tables?.label || 'PRINCIPAL'}</span>
                            <span>MOZO: {session.waiters?.name?.toUpperCase() || 'S/G'}</span>
                        </div>
                        <p className="text-[8px] opacity-40">TICKET REF: {session.id.slice(0,18).toUpperCase()}</p>
                    </div>

                    {/* ITEMS DEL PEDIDO */}
                    <div className="space-y-4">
                        <div className="flex justify-between text-[10px] font-black border-b border-black/5 pb-1 mb-2">
                            <span>DETALLE</span>
                            <span>TOTAL</span>
                        </div>
                        {orders.length > 0 ? orders.map(order => (
                            <div key={order.id} className="space-y-2">
                                {order.order_items.map(item => (
                                    <div key={item.id} className="flex justify-between items-start gap-4">
                                        <div className="flex-1">
                                            <div className="flex gap-2">
                                                <span className="font-black">{item.quantity}x</span>
                                                <span className="font-bold uppercase">{item.product_name}</span>
                                            </div>
                                            {item.options && (
                                                <p className="text-[9px] opacity-50 ml-6 leading-tight lowercase">
                                                    + {item.options}
                                                </p>
                                            )}
                                        </div>
                                        <span className="font-black">${(item.price * item.quantity).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        )) : (
                            <p className="text-center italic opacity-40">No hay items registrados</p>
                        )}
                    </div>

                    {/* TOTALES */}
                    <div className="border-t-2 border-black pt-4 mt-4 space-y-2">
                        <div className="flex justify-between font-bold opacity-60">
                            <span>SUBTOTAL</span>
                            <span>${subtotal.toLocaleString()}</span>
                        </div>
                        {discount > 0 && (
                            <div className="flex justify-between text-[#E31B23] font-black">
                                <span>DESCUENTO ESPECIAL</span>
                                <span>-${discount.toLocaleString()}</span>
                            </div>
                        )}
                        <div className="h-[1px] w-full border-b border-dashed border-black/20 my-1"></div>
                        <div className="flex justify-between text-xl font-black pt-1">
                            <span>TOTAL</span>
                            <span>${total.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* FOOTER / REDES SOCAILAS */}
                    <div className="text-center pt-8 space-y-4 border-t border-black/5">
                        <p className="font-black text-[9px] tracking-[0.2em] uppercase italic">¡Gracias por tu visita!</p>
                        
                        <div className="flex justify-center gap-6 opacity-60">
                            <div className="flex items-center gap-1.5">
                                <Instagram size={10}/>
                                <span className="text-[8px] font-bold">@americanburger.ok</span>
                            </div>
                        </div>
                        
                        <div className="text-[8px] font-medium opacity-30 space-y-1">
                            <p>ESTE DOCUMENTO NO ES VALIDO COMO FACTURA</p>
                            <p>SISTEMA AMERICAN PIZZA V2.0</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* CSS para impresión profesional */}
            <style jsx global>{`
                @media print {
                    @page {
                        margin: 0;
                        size: 80mm auto;
                    }
                    body {
                        background: white !important;
                        margin: 0;
                        padding: 0;
                    }
                    .fixed {
                        position: relative !important;
                        background: white !important;
                        padding: 0 !important;
                        display: block !important;
                    }
                    .bg-white {
                        box-shadow: none !important;
                        width: 100% !important;
                        max-width: 100% !important;
                    }
                    button, .print-hidden, .bg-gray-50 {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    )
}
