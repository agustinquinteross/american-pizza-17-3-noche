'use client'
import { useState } from 'react'
import { Coffee, Plus, MapPin, List, LayoutGrid, Move, Trash2, Check, BarChart3 } from 'lucide-react'

export default function AdminTableMap({ zones, tables, onTableClick, onCreateTable, onCreateZone, onRefresh, designMode, setDesignMode, onShowManagement, isAdmin = true, initialView = "map", loggedWaiter = null }) {
    const [selectedZoneId, setSelectedZoneId] = useState(zones[0]?.id || null)
    const [viewType, setViewType] = useState(initialView) // 'map' or 'grid'
    const [reservationTable, setReservationTable] = useState(null)
    const [resInfo, setResInfo] = useState({ name: '', time: '', people: '' })

    const filteredTables = tables.filter(t => t.zone_id === selectedZoneId)

    return (
        <div className="h-full flex flex-col gap-4">
            {/* Cabecera y Zonas */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-4 bg-[#1A1A1A] p-2 sm:p-4 rounded-2xl border border-white/10">
                <div className="flex bg-black/40 p-1 rounded-xl overflow-x-auto no-scrollbar gap-1 w-full sm:w-auto">
                    {zones.map(zone => (
                        <button
                            key={zone.id}
                            onClick={() => setSelectedZoneId(zone.id)}
                            className={`px-3 py-2 rounded-lg text-[10px] sm:text-[9px] font-black uppercase tracking-wider transition flex-shrink-0 ${selectedZoneId === zone.id ? 'bg-[#E31B23] text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                        >
                            {zone.name}
                        </button>
                    ))}
                    {isAdmin && (
                        <button 
                            onClick={onCreateZone}
                            className="px-3 py-2 rounded-lg text-white/20 hover:text-[#E31B23] hover:bg-[#E31B23]/10 transition flex-shrink-0 border border-dashed border-white/10"
                            title="Agregar Sección"
                        >
                            <Plus size={14}/>
                        </button>
                    )}
                    {!designMode && <div className="w-4 shrink-0" />}
                </div>

                {isAdmin && (
                    <div className="flex bg-black/40 p-1 rounded-lg gap-1 border border-white/5">
                        <button 
                            onClick={() => setViewType('map')}
                            className={`p-2 rounded-lg transition-all ${viewType === 'map' ? 'bg-white/10 text-[#E31B23]' : 'text-white/40 hover:text-white'}`}
                            title="Vista de Plano"
                        >
                            <MapPin size={18}/>
                        </button>
                        <button 
                            onClick={() => setViewType('grid')}
                            className={`p-2 rounded-lg transition-all ${viewType === 'grid' ? 'bg-white/10 text-[#E31B23]' : 'text-white/40 hover:text-white'}`}
                            title="Vista de Grilla"
                        >
                            <LayoutGrid size={18}/>
                        </button>
                    </div>
                )}

                {isAdmin && (
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button 
                            onClick={onShowManagement}
                            className="bg-white/5 border border-white/10 p-1.5 rounded-lg text-white/60 hover:text-[#E31B23] hover:bg-[#E31B23]/10 transition-all font-black text-[9px] uppercase tracking-wider flex items-center gap-1.5"
                        >
                            <BarChart3 size={16}/> <span className="hidden sm:inline">Gestión</span>
                        </button>
                        <button 
                            onClick={() => {
                                setDesignMode(!designMode)
                                if (!designMode) setViewType('map')
                            }} 
                            className={`px-4 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-wider flex items-center gap-2 transition-all ${designMode ? 'bg-green-600 text-white animate-pulse' : 'bg-white/5 text-white/60 border border-white/10'}`}
                        >
                            {designMode ? <Check size={16}/> : <Move size={16}/>}
                            {designMode ? 'Guardar' : 'Diseñar'}
                        </button>
                        <button onClick={() => onCreateTable(selectedZoneId)} className="bg-[#E31B23] px-4 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-wider flex items-center gap-2 shadow-lg hover:scale-105 transition-transform"><Coffee size={16}/> Nueva</button>
                    </div>
                )}
            </div>

            {/* Mapa / Grilla de Mesas / Plano */}
            <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={async (e) => {
                    if (!designMode) return
                    const tableId = e.dataTransfer.getData('tableId')
                    const rect = e.currentTarget.getBoundingClientRect()
                    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100)
                    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100)
                    
                    await fetch(`/api/restaurant-tables/${tableId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ x_pos: x, y_pos: y })
                    })
                    onRefresh()
                }}
                className={`flex-1 bg-[#121212] rounded-[32px] border border-white/5 p-6 overflow-hidden relative shadow-inner
                    ${designMode ? 'bg-grid-white/[0.02] cursor-crosshair' : ''}
                    ${viewType === 'grid' ? 'overflow-y-auto' : ''}`}
            >
                {/* Función para Reservar */}
                {Object.keys(resInfo).length > 0 && reservationTable && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="w-full max-w-sm bg-[#1A1A1A] border border-white/10 rounded-[40px] p-8 shadow-2xl">
                             <div className="text-center mb-6">
                                <h3 className="text-xl font-black uppercase italic tracking-tighter text-[#E31B23]">Reservar Mesa {reservationTable.label}</h3>
                                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Completa los datos de la reserva</p>
                             </div>
                             <div className="space-y-4">
                                <input type="text" placeholder="Nombre del Cliente" className="w-full bg-black border border-white/10 rounded-2xl p-4 text-sm" value={resInfo.name} onChange={e => setResInfo({...resInfo, name: e.target.value})} />
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="time" className="w-full bg-black border border-white/10 rounded-2xl p-4 text-sm" value={resInfo.time} onChange={e => setResInfo({...resInfo, time: e.target.value})} />
                                    <input type="number" placeholder="Personas" className="w-full bg-black border border-white/10 rounded-2xl p-4 text-sm" value={resInfo.people} onChange={e => setResInfo({...resInfo, people: e.target.value})} />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button onClick={() => setReservationTable(null)} className="flex-1 bg-white/5 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white/40">Cancelar</button>
                                    <button 
                                        onClick={async () => {
                                            await fetch(`/api/restaurant-tables/${reservationTable.id}`, {
                                                method: 'PUT',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ status: 'reservada', reservation_info: resInfo })
                                            })
                                            setReservationTable(null)
                                            onRefresh()
                                        }}
                                        className="flex-1 bg-[#E31B23] py-4 rounded-2xl font-black text-xs uppercase tracking-widest"
                                    >Confirmar</button>
                                </div>
                             </div>
                        </div>
                    </div>
                )}
                {/* Fondo cuadriculado opcional en modo diseño */}
                {designMode && (
                    <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #E31B23 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
                )}

                <div className={(designMode || viewType === 'map') ? "relative w-full h-full" : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6"}>
                    {filteredTables.map(table => (
                        <div
                            key={table.id}
                            draggable={designMode}
                            onDragStart={(e) => {
                                e.dataTransfer.setData('tableId', table.id)
                            }}
                            onClick={() => onTableClick(table)}
                            style={(designMode || viewType === 'map') ? { 
                                position: 'absolute', 
                                left: `${table.x_pos || 0}%`, 
                                top: `${table.y_pos || 0}%`,
                                transform: 'translate(-50%, -50%)',
                                zIndex: 50
                            } : {}}
                            className={`aspect-square min-w-[70px] sm:min-w-[100px] rounded-[18px] sm:rounded-[24px] border-2 cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 relative group 
                                ${designMode ? 'hover:scale-110' : 'hover:scale-[1.02]'}
                                ${table.status === 'libre' ? 'bg-green-600/10 border-green-600/30 hover:border-green-600' : 
                                  table.status === 'ocupada' ? 'bg-[#E31B23]/10 border-[#E31B23]/30 hover:border-[#E31B23]' : 
                                  table.status === 'cuenta_pedida' ? 'bg-yellow-500/10 border-yellow-500/30 hover:border-yellow-500' : 
                                  table.status === 'reservada' ? 'bg-blue-500/10 border-blue-500/30 hover:border-blue-500' :
                                  'bg-white/5 border-white/5 hover:border-white/20'}`}
                        >
                            <Coffee size={20} className={table.status === 'libre' ? 'text-green-500' : table.status === 'ocupada' ? 'text-[#E31B23]' : table.status === 'cuenta_pedida' ? 'text-yellow-500' : table.status === 'reservada' ? 'text-blue-500' : 'text-white/20'}/>
                            <span className="font-black text-[9px] uppercase tracking-tighter text-white/90">{table.label}</span>
                            
                            {table.status === 'reservada' && !designMode && (
                                <div className="text-[8px] font-black text-blue-500 uppercase mt-1">
                                    {table.reservation_info?.name || 'RESERVA'} - {table.reservation_info?.time || ''}
                                </div>
                            )}
                            
                            {table.status === 'ocupada' && !designMode && (() => {
                                // ✅ LOCK: si la mesa tiene sesión activa de otro mozo, mostrar candado
                                const isLocked = !!loggedWaiter && !!table.session_waiter_id && table.session_waiter_id !== loggedWaiter.id
                                return isLocked ? (
                                    <div className="absolute -top-2 -right-2 bg-yellow-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg border border-white/20 flex items-center gap-1">
                                        🔒 {(table.session_waiter_name || 'otro').split(' ')[0].toUpperCase()}
                                    </div>
                                ) : (
                                    <div className="absolute -top-2 -right-2 bg-[#E31B23] text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg border border-white/20 animate-pulse">
                                        EN USO
                                    </div>
                                )
                            })()}

                            {designMode && (
                                <button 
                                    onClick={async (e) => {
                                        e.stopPropagation()
                                        if (confirm('¿Eliminar mesa?')) {
                                            await fetch(`/api/restaurant-tables/${table.id}`, { method: 'DELETE' })
                                            onRefresh()
                                        }
                                    }}
                                    className="absolute -top-2 -right-2 bg-black border border-white/20 p-1.5 rounded-full text-white/40 hover:text-red-500 transition-colors shadow-xl"
                                >
                                    <Trash2 size={12}/>
                                </button>
                            )}

                            {table.status === 'libre' && !designMode && (
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setReservationTable(table)
                                        setResInfo({ name: '', time: '', people: '' })
                                    }}
                                    className="absolute -bottom-2 bg-blue-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity border border-white/20"
                                >
                                    RESERVAR
                                </button>
                            )}
                            
                            {table.status === 'reservada' && !designMode && (
                                <button 
                                    onClick={async (e) => {
                                        e.stopPropagation()
                                        if (confirm('¿Liberar mesa reservada?')) {
                                            await fetch(`/api/restaurant-tables/${table.id}`, {
                                                method: 'PUT',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ status: 'libre', reservation_info: null })
                                            })
                                            onRefresh()
                                        }
                                    }}
                                    className="absolute -bottom-2 bg-green-600 text-white text-[8px] font-black px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity border border-white/20"
                                >
                                    LIBERAR
                                </button>
                            )}

                            {!designMode && (
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-[22px] flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-white shadow-xl">
                                    Gestionar
                                </div>
                            )}
                        </div>
                    ))}
                    {filteredTables.length === 0 && (
                        <div className="col-span-full h-64 flex flex-col items-center justify-center text-white/20 uppercase font-black tracking-[0.3em]">
                            <LayoutGrid size={48} className="mb-4 opacity-10"/>
                            No hay mesas en esta zona
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
