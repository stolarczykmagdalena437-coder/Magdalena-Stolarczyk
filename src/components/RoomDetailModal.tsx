import React, { useEffect, useState } from 'react';
import { Check, Copy, MapPin, Phone, X } from 'lucide-react';
import {
  PROPERTY_TYPE_LABELS,
  RoomListing,
  SiteSettings,
  STATUS_LABELS,
  ViewingBooking,
} from '../types/rental';
import {
  calculateMonthlyEstimate,
  formatElectricityRate,
  formatServiceFee,
  formatVnd,
  formatWaterRate,
  validateViewingBooking,
} from '../utils/rentalLogic';
import { ResilientImage } from './ResilientImage';
import { InteractiveMap } from './InteractiveMap';

interface RoomDetailModalProps {
  room: RoomListing | null;
  siteSettings: SiteSettings;
  onClose: () => void;
  onCreateBooking: (booking: ViewingBooking) => void;
}

export const RoomDetailModal: React.FC<RoomDetailModalProps> = ({
  room,
  siteSettings,
  onClose,
  onCreateBooking,
}) => {
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [kwhPerMonth, setKwhPerMonth] = useState(110);
  const [occupants, setOccupants] = useState(2);
  const [waterCubic, setWaterCubic] = useState(6);

  // Booking form state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [preferredDate, setPreferredDate] = useState(() => {
    const tomorrow = new Date(Date.now() + 86_400_000);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [preferredTime, setPreferredTime] = useState('18:30');
  const [note, setNote] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [confirmedBooking, setConfirmedBooking] = useState<ViewingBooking | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    setActiveImageIdx(0);
    setConfirmedBooking(null);
    setFormErrors({});
  }, [room?.id]);

  useEffect(() => {
    if (!room) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [room, onClose]);

  if (!room) return null;

  const estimate = calculateMonthlyEstimate(room, {
    kwhPerMonth,
    occupants: Math.min(occupants, room.maxOccupants),
    waterCubicMeters: waterCubic,
  });

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateViewingBooking({
      customerName,
      customerPhone,
      preferredDate,
      preferredTime,
      note,
    });
    if (!check.valid) {
      setFormErrors(check.errors);
      return;
    }

    const randomDigits = String(1000 + Math.floor(Math.random() * 9000));
    const newBooking: ViewingBooking = {
      id: `bk-${Date.now()}`,
      bookingCode: `TX-${randomDigits}`,
      roomId: room.id,
      roomTitle: room.title,
      roomAddress: room.address,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      preferredDate,
      preferredTime,
      note: note.trim(),
      createdAtIso: new Date().toISOString(),
    };

    onCreateBooking(newBooking);
    setConfirmedBooking(newBooking);
    setFormErrors({});
  };

  const handleCopyBookingText = () => {
    if (!confirmedBooking) return;
    const summary = `Mã hẹn ${confirmedBooking.bookingCode} - Xem phòng "${confirmedBooking.roomTitle}" (${confirmedBooking.roomAddress}) lúc ${confirmedBooking.preferredTime} ngày ${confirmedBooking.preferredDate}. Khách: ${confirmedBooking.customerName} (${confirmedBooking.customerPhone}).`;
    navigator.clipboard?.writeText(summary);
    setCopiedCode(true);
    window.setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs overflow-y-auto flex items-start justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="room-detail-modal-title"
    >
      <div className="bg-white w-full max-w-5xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-4 px-5 sm:px-7 py-4 border-b border-slate-200 bg-white sticky top-0 z-10">
          <div className="min-w-0">
            <p className="text-xs text-slate-500">
              {PROPERTY_TYPE_LABELS[room.propertyType]} · {room.district} ·{' '}
              {STATUS_LABELS[room.status]}
            </p>
            <h2
              id="room-detail-modal-title"
              className="font-display text-lg sm:text-xl font-bold text-slate-900 truncate"
            >
              {room.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ chi tiết phòng"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left column: Photos, Transparent Fee Table, Description, Location Map */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <div className="aspect-[16/10] rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                <ResilientImage
                  src={room.images[activeImageIdx] || room.images[0] || ''}
                  alt={`${room.title} - Ảnh ${activeImageIdx + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>

              {room.images.length > 1 && (
                <div className="flex items-center gap-2.5 mt-3 overflow-x-auto pb-1">
                  {room.images.map((imgUrl, index) => (
                    <button
                      key={`${imgUrl.slice(0, 32)}-${index}`}
                      type="button"
                      onClick={() => setActiveImageIdx(index)}
                      aria-label={`Xem ảnh số ${index + 1}`}
                      className={`w-20 h-14 rounded-lg overflow-hidden border-2 shrink-0 cursor-pointer transition-opacity ${
                        activeImageIdx === index
                          ? 'border-teal-700 opacity-100'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <ResilientImage
                        src={imgUrl}
                        alt={`Ảnh nhỏ ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Complete Transparent Pricing & Spec Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-[#F8F9FA] px-4 py-3 border-b border-slate-200">
                <h3 className="font-display text-sm font-bold text-slate-900">
                  Bảng chi phí niêm yết &amp; thông số phòng
                </h3>
              </div>

              <div className="divide-y divide-slate-100 text-sm">
                <div className="grid grid-cols-2 px-4 py-3">
                  <span className="text-slate-600">Tiền thuê phòng</span>
                  <span className="font-mono tabular-nums font-bold text-teal-700 text-right">
                    {formatVnd(room.rentPrice)}/tháng
                  </span>
                </div>
                <div className="grid grid-cols-2 px-4 py-3">
                  <span className="text-slate-600">Tiền điện</span>
                  <span className="font-mono tabular-nums font-medium text-slate-900 text-right">
                    {formatElectricityRate(room.electricityPrice)}
                  </span>
                </div>
                <div className="grid grid-cols-2 px-4 py-3">
                  <span className="text-slate-600">Tiền nước</span>
                  <span className="font-mono tabular-nums font-medium text-slate-900 text-right">
                    {formatWaterRate(room.waterPrice, room.waterUnit)}
                  </span>
                </div>
                <div className="grid grid-cols-2 px-4 py-3">
                  <span className="text-slate-600">Phí dịch vụ</span>
                  <span className="font-mono tabular-nums font-medium text-slate-900 text-right">
                    {formatServiceFee(room.serviceFee)}
                  </span>
                </div>
                <div className="grid grid-cols-2 px-4 py-3">
                  <span className="text-slate-600">Diện tích sử dụng</span>
                  <span className="font-mono tabular-nums font-medium text-slate-900 text-right">
                    {room.areaSqm} m²
                  </span>
                </div>
                <div className="grid grid-cols-2 px-4 py-3">
                  <span className="text-slate-600">Đặt cọc giữ phòng</span>
                  <span className="font-mono tabular-nums font-medium text-slate-900 text-right">
                    {room.depositMonths} tháng ({formatVnd(estimate.depositAmount)})
                  </span>
                </div>
                <div className="grid grid-cols-2 px-4 py-3">
                  <span className="text-slate-600">Vị trí tầng · Số người ở</span>
                  <span className="font-medium text-slate-900 text-right">
                    {room.floorLabel} · Tối đa {room.maxOccupants} người
                  </span>
                </div>
              </div>

              {room.serviceNote && (
                <div className="px-4 py-3 bg-[#F8F9FA] border-t border-slate-200 text-xs text-slate-600">
                  <strong className="font-semibold text-slate-800">
                    Chi tiết phí dịch vụ:{' '}
                  </strong>
                  {room.serviceNote}
                </div>
              )}
            </div>

            {/* Description & Amenities */}
            <div className="space-y-3">
              <h3 className="font-display text-base font-bold text-slate-900">
                Mô tả thực tế &amp; tiện ích có sẵn
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {room.description}
              </p>

              {room.amenities.length > 0 && (
                <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-700">
                  {room.amenities.map((amenity) => (
                    <div key={amenity} className="flex items-center gap-2 py-1">
                      <Check className="w-3.5 h-3.5 text-teal-700 shrink-0" aria-hidden="true" />
                      <span>{amenity}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Exact Map Location */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-base font-bold text-slate-900">
                  Vị trí cụ thể trên bản đồ
                </h3>
                <span className="text-xs text-slate-500 inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-teal-700" aria-hidden="true" />
                  {room.address}
                </span>
              </div>
              <InteractiveMap
                rooms={[room]}
                selectedRoomId={room.id}
                onSelectRoomPin={() => {}}
                heightClassName="h-60"
              />
            </div>
          </div>

          {/* Right column: Contiguous Cost Simulator + Viewing Booking Form */}
          <div className="lg:col-span-5 space-y-6">
            {/* Monthly Cost Simulator */}
            <div className="bg-[#F8F9FA] border border-slate-200 rounded-xl p-5">
              <h3 className="font-display text-base font-bold text-slate-900 mb-1">
                Dự toán tổng chi phí hàng tháng
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Điều chỉnh mức dùng điện và số người ở để biết tổng tiền thực trả.
              </p>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                    <label htmlFor="modal-kwh-range">Mức dùng điện dự kiến</label>
                    <span className="font-mono tabular-nums font-semibold text-slate-900">
                      {kwhPerMonth} kWh/tháng
                    </span>
                  </div>
                  <input
                    id="modal-kwh-range"
                    type="range"
                    min={30}
                    max={350}
                    step={10}
                    value={kwhPerMonth}
                    onChange={(e) => setKwhPerMonth(Number(e.target.value))}
                    className="w-full accent-teal-700 cursor-pointer"
                  />
                </div>

                {room.waterUnit === 'khoi' ? (
                  <div>
                    <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                      <label htmlFor="modal-water-cubic">Lượng nước sinh hoạt</label>
                      <span className="font-mono tabular-nums font-semibold text-slate-900">
                        {waterCubic} m³/tháng
                      </span>
                    </div>
                    <input
                      id="modal-water-cubic"
                      type="range"
                      min={2}
                      max={25}
                      step={1}
                      value={waterCubic}
                      onChange={(e) => setWaterCubic(Number(e.target.value))}
                      className="w-full accent-teal-700 cursor-pointer"
                    />
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                      <label htmlFor="modal-occupants-range">Số người ở</label>
                      <span className="font-mono tabular-nums font-semibold text-slate-900">
                        {Math.min(occupants, room.maxOccupants)} người
                      </span>
                    </div>
                    <input
                      id="modal-occupants-range"
                      type="range"
                      min={1}
                      max={room.maxOccupants}
                      step={1}
                      value={Math.min(occupants, room.maxOccupants)}
                      onChange={(e) => setOccupants(Number(e.target.value))}
                      className="w-full accent-teal-700 cursor-pointer"
                    />
                  </div>
                )}

                <div className="pt-3 border-t border-slate-200 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Tiền phòng cố định</span>
                    <span className="font-mono tabular-nums">{formatVnd(estimate.rent)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Tiền điện ({kwhPerMonth} kWh)</span>
                    <span className="font-mono tabular-nums">
                      {formatVnd(estimate.electricity)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Tiền nước</span>
                    <span className="font-mono tabular-nums">{formatVnd(estimate.water)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Phí dịch vụ</span>
                    <span className="font-mono tabular-nums">{formatVnd(estimate.service)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                    <span className="text-sm font-semibold text-slate-900">
                      Tổng dự kiến / tháng
                    </span>
                    <span className="font-mono tabular-nums text-lg font-bold text-teal-700">
                      {formatVnd(estimate.totalMonthly)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Viewing Appointment Booking Module */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-display text-base font-bold text-slate-900 mb-1">
                Đặt lịch hẹn xem phòng trực tiếp
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Xem phòng miễn phí 100% cùng {siteSettings.agentName} ({siteSettings.publicPhone}).
              </p>

              {confirmedBooking ? (
                <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-teal-800">
                      Đã ghi nhận lịch xem phòng
                    </span>
                    <span className="font-mono tabular-nums text-xs font-bold text-teal-900">
                      {confirmedBooking.bookingCode}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Hẹn gặp <strong>{confirmedBooking.customerName}</strong> vào lúc{' '}
                    <strong>{confirmedBooking.preferredTime}</strong> ngày{' '}
                    <strong>{confirmedBooking.preferredDate}</strong> tại{' '}
                    <strong>{confirmedBooking.roomAddress}</strong>.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCopyBookingText}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>
                        {copiedCode ? 'Đã sao chép nội dung hẹn' : 'Sao chép phiếu hẹn gửi Zalo'}
                      </span>
                    </button>
                    <a
                      href={`tel:${siteSettings.publicPhone.replace(/\s+/g, '')}`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg hover:bg-slate-50"
                    >
                      <Phone className="w-3.5 h-3.5 text-teal-700" aria-hidden="true" />
                      <span>Gọi {siteSettings.publicPhone}</span>
                    </a>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleBookingSubmit} noValidate className="space-y-3.5">
                  <div>
                    <label
                      htmlFor="booking-name"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      Họ và tên của bạn
                    </label>
                    <input
                      id="booking-name"
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="VD: Nguyễn Minh Anh"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-teal-700 focus:outline-none"
                    />
                    {formErrors.customerName && (
                      <p className="text-xs text-rose-600 mt-1">{formErrors.customerName}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="booking-phone"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      Số điện thoại / Zalo liên hệ
                    </label>
                    <input
                      id="booking-phone"
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="VD: 0908 123 456"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-teal-700 focus:outline-none"
                    />
                    {formErrors.customerPhone && (
                      <p className="text-xs text-rose-600 mt-1">{formErrors.customerPhone}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="booking-date"
                        className="block text-xs font-medium text-slate-700 mb-1"
                      >
                        Ngày xem phòng
                      </label>
                      <input
                        id="booking-date"
                        type="date"
                        value={preferredDate}
                        onChange={(e) => setPreferredDate(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-teal-700 focus:outline-none"
                      />
                      {formErrors.preferredDate && (
                        <p className="text-xs text-rose-600 mt-1">{formErrors.preferredDate}</p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="booking-time"
                        className="block text-xs font-medium text-slate-700 mb-1"
                      >
                        Khung giờ
                      </label>
                      <select
                        id="booking-time"
                        value={preferredTime}
                        onChange={(e) => setPreferredTime(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-teal-700 focus:outline-none bg-white"
                      >
                        <option value="09:00">09:00 sáng</option>
                        <option value="11:30">11:30 trưa</option>
                        <option value="15:00">15:00 chiều</option>
                        <option value="18:30">18:30 tối</option>
                        <option value="20:00">20:00 tối</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="booking-note"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      Ghi chú thêm (tùy chọn)
                    </label>
                    <input
                      id="booking-note"
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="VD: Đi 2 người, có nuôi 1 mèo nhỏ..."
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-teal-700 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Xác nhận đặt lịch xem phòng
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
