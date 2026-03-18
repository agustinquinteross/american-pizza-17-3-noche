'use client'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useState } from 'react'

const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Componente auxiliar para mover la cámara cuando cambia la dirección
function ChangeView({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.flyTo(coords, 16); // 16 es el nivel de zoom (bastante cerca)
    }
  }, [coords, map]);
  return null;
}

function LocationMarker({ position, setPosition, setLocation }) {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng)
      setLocation(e.latlng) // Avisamos al padre
      map.flyTo(e.latlng, map.getZoom())
    },
  })

  return position === null ? null : (
    <Marker position={position} icon={icon}></Marker>
  )
}

export default function MapPicker({ setLocation, forcedCoords }) {
  const catamarcaCenter = [-28.4678981, -65.7735899] 
  const [position, setPosition] = useState(catamarcaCenter)

  // Si recibimos una coordenada forzada (desde el input de dirección), actualizamos el mapa
  useEffect(() => {
    if (forcedCoords) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPosition(forcedCoords)
      setLocation(forcedCoords) // Sincronizamos
    }
  }, [forcedCoords, setLocation])

  return (
    <div className="h-48 w-full rounded-xl overflow-hidden border-2 border-orange-200 z-0 relative">
      <MapContainer 
        center={catamarcaCenter} 
        zoom={14} 
        style={{ height: '100%', width: '100%' }}
      >
        <ChangeView coords={forcedCoords} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='© OpenStreetMap'
        />
        <LocationMarker position={position} setPosition={setPosition} setLocation={setLocation} />
      </MapContainer>
    </div>
  )
}