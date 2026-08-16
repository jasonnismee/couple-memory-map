import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import type { Memory } from '../api/types'
import { categoryEmoji } from '../api/types'

export interface PickLocation {
  lat: number
  lng: number
  name?: string
}

function markerIcon(memory: Memory, selected: boolean) {
  return L.divIcon({
    className: `memory-marker${selected ? ' selected' : ''}`,
    html: `<div class="pin"><span>${categoryEmoji(memory.category)}</span></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 34],
  })
}

const pickIcon = L.divIcon({
  className: '',
  html: `<div class="pulse-pin"><span>❤️</span></div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 34],
})

function MapFly({ target }: { target: { lat: number; lng: number; zoom?: number; key: number } | null }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], target.zoom ?? 15, { duration: 1.2 })
  }, [target?.key])
  return null
}

function ClickHandler({ enabled, onPick }: { enabled: boolean; onPick: (loc: PickLocation) => void }) {
  useMapEvents({
    click(e) {
      if (enabled) onPick({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

function CursorStyle({ picking }: { picking: boolean }) {
  const map = useMap()
  useEffect(() => {
    const container = map.getContainer()
    container.style.cursor = picking ? 'crosshair' : ''
  }, [picking])
  return null
}

export default function MapView({
  memories,
  picking,
  pickLocation,
  selectedId,
  flyTarget,
  onPick,
  onMarkerClick,
}: {
  memories: Memory[]
  picking: boolean
  pickLocation: PickLocation | null
  selectedId: number | null
  flyTarget: { lat: number; lng: number; zoom?: number; key: number } | null
  onPick: (loc: PickLocation) => void
  onMarkerClick: (memory: Memory) => void
}) {
  const fitRef = useRef(false)

  return (
    <MapContainer
      center={[21.0278, 105.8342]}
      zoom={12}
      zoomControl={false}
      className="h-full w-full"
      worldCopyJump
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler enabled={picking} onPick={onPick} />
      <CursorStyle picking={picking} />
      <MapFly target={flyTarget} />
      {/* Fit all markers once memories first load */}
      <MapFit memories={memories} enabled={!fitRef.current} onDone={() => (fitRef.current = true)} />
      {memories.map((m) => (
        <Marker
          key={m.id}
          position={[m.latitude, m.longitude]}
          icon={markerIcon(m, m.id === selectedId)}
          eventHandlers={{ click: () => onMarkerClick(m) }}
        />
      ))}
      {pickLocation && <Marker position={[pickLocation.lat, pickLocation.lng]} icon={pickIcon} />}
    </MapContainer>
  )
}

function MapFit({ memories, enabled, onDone }: { memories: Memory[]; enabled: boolean; onDone: () => void }) {
  const map = useMap()
  useEffect(() => {
    if (enabled && memories.length > 0) {
      const bounds = L.latLngBounds(memories.map((m) => [m.latitude, m.longitude] as [number, number]))
      map.fitBounds(bounds.pad(0.25), { maxZoom: 14 })
      onDone()
    }
  }, [memories.length, enabled])
    return null
}
