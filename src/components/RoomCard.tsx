import React from 'react';
import { MapPin, Pencil, Trash2 } from 'lucide-react';
import {
  PROPERTY_TYPE_LABELS,
  RoomListing,
  STATUS_LABELS,
} from '../types/rental';
import {
  formatElectricityRate,
  formatServiceFee,
  formatVnd,
  formatWaterRate,
} from '../utils/rentalLogic';
import { ResilientImage } from './ResilientImage';

interface RoomCardProps {
  room: RoomListing;
  isSelectedOnMap: boolean;
  isOwner: boolean;
  onSelectDetail: (room: RoomListing) => void;
  onFocusOnMap: (room: RoomListing) => void;
  onEditRoom?: (room: RoomListing) => void;
  onDeleteRoom?: (room: RoomListing) => void;
}

export const RoomCard: React.FC<RoomCardProps> = ({
  room,
  isSelectedOnMap,
  isOwner,
  onSelectDetail,
  onFocusOnMap,
  onEditRoom,
  onDeleteRoom,
}) => {
  const statusTone =
    room.status === 'available'
      ? 'text-teal-700 font-semibold'
      : room.status === 'soon'
        ? 'text-amber-700 font-semibold'
        : 'text-slate-500 font-medium';

  return (
    <article
      className={`group bg-white rounded-2xl overflow-hidden border transition-transform duration-150 hover:-translate-y-0.5 flex flex-col ${
        isSelectedOnMap
          ? 'border-teal-700 ring-2 ring-teal-700/15'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Photo container (lead with imagery, zero badge spam) */}
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
        <button
          type="button"
          onClick={() => onSelectDetail(room)}
          aria-label={`Xem chi tiết ${room.title}`}
          className="w-full h-full block text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-teal-700"
        >
          <ResilientImage
            src={room.images[0] || ''}
            alt={room.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </button>

        {!room.isPublished && isOwner && (
          <div className="absolute top-3 left-3 bg-slate-900/85 text-white text-xs font-medium px-2.5 py-1 rounded-md">
            Đang ẩn khỏi khách xem
          </div>
        )}

        {isOwner && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onEditRoom?.(room)}
              aria-label={`Chỉnh sửa phòng ${room.title}`}
              className="p-2 bg-white/95 hover:bg-white text-slate-800 rounded-lg border border-slate-200 shadow-xs cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onDeleteRoom?.(room)}
              aria-label={`Xóa phòng ${room.title}`}
              className="p-2 bg-white/95 hover:bg-rose-50 text-rose-700 rounded-lg border border-slate-200 shadow-xs cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Clean unboxed metadata with typographic separators (Zero-Pill Rule) */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 mb-2">
            <span>{PROPERTY_TYPE_LABELS[room.propertyType]}</span>
            <span aria-hidden="true">·</span>
            <span>{room.district}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-slate-700 font-medium">
              {room.areaSqm} m²
            </span>
            <span aria-hidden="true">·</span>
            <span className={statusTone}>{STATUS_LABELS[room.status]}</span>
          </div>

          <h3 className="font-display text-base font-bold text-slate-900 leading-snug line-clamp-2 mb-1.5">
            <button
              type="button"
              onClick={() => onSelectDetail(room)}
              className="text-left hover:text-teal-700 transition-colors cursor-pointer"
            >
              {room.title}
            </button>
          </h3>

          <p className="text-xs text-slate-500 truncate mb-4">{room.address}</p>

          {/* Transparent Rent + Electricity + Water + Service breakdown */}
          <div className="py-3 border-y border-slate-100 space-y-1.5 mb-4">
            <div className="flex items-baseline justify-between gap-2 pb-1">
              <span className="text-xs font-medium text-slate-600">Giá thuê phòng</span>
              <span className="font-mono tabular-nums text-base font-bold text-teal-700">
                {formatVnd(room.rentPrice)}/tháng
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-500">Tiền điện</span>
              <span className="font-mono tabular-nums font-medium text-slate-800">
                {formatElectricityRate(room.electricityPrice)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-500">Tiền nước</span>
              <span className="font-mono tabular-nums font-medium text-slate-800">
                {formatWaterRate(room.waterPrice, room.waterUnit)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-500">Phí dịch vụ</span>
              <span className="font-mono tabular-nums font-medium text-slate-800">
                {formatServiceFee(room.serviceFee)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onSelectDetail(room)}
            className="flex-1 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            Xem chi tiết &amp; phí
          </button>
          <button
            type="button"
            onClick={() => onFocusOnMap(room)}
            aria-label={`Định vị bản đồ cho ${room.title}`}
            className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs sm:text-sm font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isSelectedOnMap
                ? 'bg-teal-50 border-teal-700 text-teal-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Bản đồ</span>
          </button>
        </div>
      </div>
    </article>
  );
};
