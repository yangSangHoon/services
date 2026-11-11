import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';

export type MapPoint = { id: string; emoji: string; name: string; lat: number; lng: number; acc?: number; me?: boolean; stale?: boolean };

/** OpenStreetMap 위에 가족 위치(이모지 핀 + 오차 범위 원)를 그린다 */
export default function FamilyMap({ points, focus, className = '' }: { points: MapPoint[]; focus?: string; className?: string }) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const fittedRef = useRef('');

  useEffect(() => {
    if (!elRef.current) return;
    const map = L.map(elRef.current, { zoomControl: false, attributionControl: true }).setView([37.5665, 126.978], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    fittedRef.current = '';
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(elRef.current);
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    for (const p of points) {
      const color = p.me ? '#3b82f6' : p.stale ? '#9ca3af' : '#f97362';
      if (p.acc && p.acc < 2000) {
        L.circle([p.lat, p.lng], { radius: p.acc, color, weight: 1, fillColor: color, fillOpacity: 0.12 }).addTo(layer);
      }
      const icon = L.divIcon({
        className: '',
        html: `<div class="pin ${p.me ? 'pin-me' : ''} ${p.stale ? 'pin-stale' : ''}"><span><i>${p.emoji}</i></span><b>${escapeHtml(p.me ? '나' : p.name)}</b></div>`,
        iconSize: [0, 0],
      });
      L.marker([p.lat, p.lng], { icon, zIndexOffset: p.id === focus ? 1000 : p.me ? 500 : 0 }).addTo(layer);
    }
    // 처음이거나 보여줄 대상이 바뀌었을 때만 화면을 맞춘다(지도를 만지는 중에 튀지 않게)
    const key = `${focus ?? ''}|${points.map((p) => p.id).join(',')}`;
    if (points.length && fittedRef.current !== key) {
      fittedRef.current = key;
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds.pad(0.4), { maxZoom: 18, animate: false });
    }
  }, [points, focus]);

  return <div ref={elRef} className={`map ${className}`} />;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
