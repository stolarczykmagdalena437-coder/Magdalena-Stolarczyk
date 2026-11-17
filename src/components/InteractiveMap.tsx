import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { ExternalLink, LocateFixed } from 'lucide-react';
import { PROPERTY_TYPE_LABELS, RoomListing } from '../types/rental';
import {
  formatElectricityRate,
  formatMillionsCompact,
  formatVnd,
  formatWaterRate,
} from '../utils/rentalLogic';
import { ResilientImage } from './ResilientImage';

interface InteractiveMapProps {
  rooms: RoomListing[];
  selectedRoomId: string | null;
  onSelectRoomPin: (room: RoomListing) => void;
  onOpenRoomDetail?: (room: RoomListing) => void;
  heightClassName?: string;
  pickerMode?: boolean;
  pickedLat?: number;
  pickedLng?: number;
  onPickCoordinate?: (lat: number, lng: number) => void;
}

const HCMC_CENTER: [number, number] = [10.788, 106.702];

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  rooms,
  selectedRoomId,
  onSelectRoomPin,
  onOpenRoomDetail,
  heightClassName = 'h-[540px]',
  pickerMode = false,
  pickedLat,
  pickedLng,
  onPickCoordinate,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const onSelectRoomPinRef = useRef(onSelectRoomPin);
  const onPickCoordinateRef = useRef(onPickCoordinate);

  onSelectRoomPinRef.current = onSelectRoomPin;
  onPickCoordinateRef.current = onPickCoordinate;

  const hasInitialFitRef = useRef(false);
  const prevSelectedIdRef = useRef<string | null>(selectedRoomId);
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) || null;

  // Initialize Leaflet map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialCenter: [number, number] =
      pickerMode && pickedLat && pickedLng
        ? [pickedLat, pickedLng]
        : rooms[0]
          ? [rooms[0].lat, rooms[0].lng]
          : HCMC_CENTER;

    const map = L.map(containerRef.current, {
      center: initialCenter,
      zoom: pickerMode ? 15 : 13,
      zoomControl: true,
      scrollWheelZoom: false,
    });

    const primaryLayer = L.tileLayer(
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }
    );

    let fallbackAttached = false;
    primaryLayer.on('tileerror', () => {
      if (fallbackAttached) return;
      fallbackAttached = true;
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '&copy; OpenStreetMap &copy; Esri',
          maxZoom: 19,
        }
      ).addTo(map);
    });

    primaryLayer.addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    mapRef.current = map;
    markersLayerRef.current = markersLayer;

    if (pickerMode) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        const roundedLat = Number(e.latlng.lat.toFixed(5));
        const roundedLng = Number(e.latlng.lng.toFixed(5));
        onPickCoordinateRef.current?.(roundedLat, roundedLng);
      });
    }

    const resizeTimer = window.setTimeout(() => {
      map.invalidateSize();
      if (!pickerMode && rooms.length > 1) {
        const bounds = L.latLngBounds(
          rooms.map((r) => [r.lat, r.lng] as [number, number])
        );
        map.fitBounds(bounds, { padding: [52, 52], maxZoom: 14 });
        hasInitialFitRef.current = true;
      }
    }, 150);

    return () => {
      window.clearTimeout(resizeTimer);
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
    };
  }, [pickerMode]);

  // Render markers whenever rooms, selectedRoomId, or picked coordinates change
  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    if (pickerMode && typeof pickedLat === 'number' && typeof pickedLng === 'number') {
      const pickerIcon = L.divIcon({
        className: 'custom-price-pin',
        html: `<div style="display:inline-block;width:max-content;background:#0f766e;color:#fff;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:600;padding:6px 10px;border-radius:8px;border:2px solid #fff;box-shadow:0 6px 16px rgba(15,23,42,0.28);white-space:nowrap;transform:translate(-50%,-100%);">Vị trí đã chọn</div>`,
        iconSize: [0, 0],
      });
      L.marker([pickedLat, pickedLng], { icon: pickerIcon }).addTo(markersLayer);
      map.setView([pickedLat, pickedLng], Math.max(map.getZoom(), 14), { animate: true });
      return;
    }

    rooms.forEach((room) => {
      const isActive = room.id === selectedRoomId;
      const bg = isActive ? '#0f766e' : '#0f172a';
      const scale = isActive ? 'scale(1.08)' : 'scale(1)';
      const zOffset = isActive ? 900 : 100;

      const priceIcon = L.divIcon({
        className: 'custom-price-pin',
        html: `<div style="display:inline-block;width:max-content;background:${bg};color:#ffffff;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:600;padding:5px 10px;border-radius:8px;border:2px solid #ffffff;box-shadow:0 6px 16px rgba(15,23,42,0.25);white-space:nowrap;cursor:pointer;transform:translate(-50%,-100%) ${scale};transition:transform 150ms ease;">${formatMillionsCompact(room.rentPrice)}</div>`,
        iconSize: [0, 0],
      });

      const marker = L.marker([room.lat, room.lng], {
        icon: priceIcon,
        zIndexOffset: zOffset,
        keyboard: true,
        title: `Vị trí ${room.title} (${formatMillionsCompact(room.rentPrice)})`,
      });

      marker.on('click', () => {
        onSelectRoomPinRef.current(room);
      });

      marker.addTo(markersLayer);
    });
  }, [rooms, selectedRoomId, pickerMode, pickedLat, pickedLng]);

  // Smooth pan to selected room only when user changes selection (keep full-city overview on initial load)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || pickerMode || !selectedRoom) return;

    if (rooms.length === 1) {
      map.invalidateSize();
      map.setView([selectedRoom.lat, selectedRoom.lng], 15);
      return;
    }

    if (prevSelectedIdRef.current !== selectedRoomId && hasInitialFitRef.current) {
      map.invalidateSize();
      map.flyTo([selectedRoom.lat, selectedRoom.lng], Math.max(map.getZoom(), 14), {
        duration: 0.5,
      });
    }
    prevSelectedIdRef.current = selectedRoomId;
  }, [selectedRoom, selectedRoomId, rooms.length, pickerMode]);

  const handleFitAllMarkers = () => {
    const map = mapRef.current;
    if (!map || rooms.length === 0) return;
    const bounds = L.latLngBounds(rooms.map((r) => [r.lat, r.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [45, 45], maxZoom: 15 });
  };

  return (
    <div
      data-testid="interactive-rental-map"
      className={`relative w-full ${heightClassName} rounded-2xl overflow-hidden border border-slate-200 bg-slate-100`}
    >
      <div ref={containerRef} className="w-full h-full" />

      {!pickerMode && rooms.length > 0 && (
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
          <button
            type="button"
            onClick={handleFitAllMarkers}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/95 hover:bg-white text-slate-800 text-xs font-semibold rounded-lg border border-slate-200 shadow-sm cursor-pointer"
          >
            <LocateFixed className="w-3.5 h-3.5 text-teal-700" aria-hidden="true" />
            <span>Xem toàn khu vực ({rooms.length})</span>
          </button>
        </div>
      )}

      {pickerMode && (
        <div className="absolute bottom-3 left-3 right-3 z-20 bg-white/95 backdrop-blur-xs border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 flex items-center justify-between gap-2">
          <span>Nhấp trực tiếp lên bản đồ để ghim tọa độ chính xác của phòng trọ.</span>
          {typeof pickedLat === 'number' && typeof pickedLng === 'number' && (
            <span className="font-mono tabular-nums font-semibold text-teal-800 shrink-0">
              {pickedLat.toFixed(4)}, {pickedLng.toFixed(4)}
            </span>
          )}
        </div>
      )}

      {/* Selected Room Floating Preview Card on Map */}
      {!pickerMode && selectedRoom && (
        <div className="absolute bottom-3 left-3 right-3 sm:left-4 sm:right-auto sm:max-w-md z-20 bg-white border border-slate-200 rounded-xl shadow-lg p-3.5">
          <div className="flex items-start gap-3">
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-100 shrink-0">
              <ResilientImage
                src={selectedRoom.images[0] || ''}
                alt={selectedRoom.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-slate-500 truncate">
                {PROPERTY_TYPE_LABELS[selectedRoom.propertyType]} · {selectedRoom.district} ·{' '}
                {selectedRoom.areaSqm} m²
              </p>
              <h4 className="font-display text-sm font-bold text-slate-900 line-clamp-1 mt-0.5">
                {selectedRoom.title}
              </h4>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {selectedRoom.address}
              </p>
              <p className="font-mono tabular-nums text-xs font-bold text-teal-700 mt-1">
                {formatVnd(selectedRoom.rentPrice)}/tháng · Điện{' '}
                {formatElectricityRate(selectedRoom.electricityPrice)} · Nước{' '}
                {formatWaterRate(selectedRoom.waterPrice, selectedRoom.waterUnit)}
              </p>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
            {onOpenRoomDetail && (
              <button
                type="button"
                onClick={() => onOpenRoomDetail(selectedRoom)}
                className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Mở chi tiết phòng
              </button>
            )}
            <a
              href={`https://www.openstreetmap.org/?mlat=${selectedRoom.lat}&mlon=${selectedRoom.lng}#map=17/${selectedRoom.lat}/${selectedRoom.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-teal-700"
            >
              <span>Mở bản đồ đường đi</span>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
