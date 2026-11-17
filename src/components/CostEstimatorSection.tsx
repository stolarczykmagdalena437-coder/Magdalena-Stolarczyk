import React, { useState } from 'react';
import { PROPERTY_TYPE_LABELS, RoomListing } from '../types/rental';
import {
  calculateMonthlyEstimate,
  formatElectricityRate,
  formatServiceFee,
  formatVnd,
  formatWaterRate,
} from '../utils/rentalLogic';

interface CostEstimatorSectionProps {
  rooms: RoomListing[];
  onOpenRoomDetail: (room: RoomListing) => void;
}

export const CostEstimatorSection: React.FC<CostEstimatorSectionProps> = ({
  rooms,
  onOpenRoomDetail,
}) => {
  const [selectedId, setSelectedId] = useState<string>(rooms[0]?.id || '');
  const [kwhPerMonth, setKwhPerMonth] = useState<number>(120);
  const [occupants, setOccupants] = useState<number>(2);
  const [waterCubicMeters, setWaterCubicMeters] = useState<number>(8);

  if (rooms.length === 0) return null;

  const currentRoom = rooms.find((r) => r.id === selectedId) || rooms[0];
  const estimate = calculateMonthlyEstimate(currentRoom, {
    kwhPerMonth,
    occupants: Math.min(occupants, currentRoom.maxOccupants),
    waterCubicMeters,
  });

  return (
    <section id="uoc-tinh-chi-phi" className="scroll-mt-20 py-14 bg-white border-t border-slate-200">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-8">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight [text-wrap:balance]">
            Bảng tính nhẩm tổng chi phí thuê trọ thực tế mỗi tháng
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mt-2">
            Không lo phí ẩn: chọn bất kỳ phòng nào trong danh sách để tính trước tiền phòng
            cộng điện, nước, phí dịch vụ và tiền cọc ban đầu.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Controls */}
          <div className="lg:col-span-6 bg-[#F8F9FA] border border-slate-200 rounded-2xl p-6 space-y-5">
            <div>
              <label
                htmlFor="estimator-room-select"
                className="block text-xs font-semibold text-slate-700 mb-2"
              >
                Chọn phòng muốn tính thử chi phí
              </label>
              <select
                id="estimator-room-select"
                value={currentRoom.id}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:border-teal-700 focus:outline-none cursor-pointer"
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} ({formatVnd(r.rentPrice)}/tháng · {r.areaSqm}m²)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-700 mb-1.5">
                  <label htmlFor="estimator-kwh-input">Điện tiêu thụ (kWh)</label>
                  <span className="font-mono tabular-nums font-semibold text-slate-900">
                    {kwhPerMonth} kWh
                  </span>
                </div>
                <input
                  id="estimator-kwh-input"
                  type="range"
                  min={30}
                  max={350}
                  step={10}
                  value={kwhPerMonth}
                  onChange={(e) => setKwhPerMonth(Number(e.target.value))}
                  className="w-full accent-teal-700 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Đơn giá phòng này: {formatElectricityRate(currentRoom.electricityPrice)}
                </p>
              </div>

              {currentRoom.waterUnit === 'khoi' ? (
                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-700 mb-1.5">
                    <label htmlFor="estimator-water-m3">Nước sinh hoạt (m³)</label>
                    <span className="font-mono tabular-nums font-semibold text-slate-900">
                      {waterCubicMeters} m³
                    </span>
                  </div>
                  <input
                    id="estimator-water-m3"
                    type="range"
                    min={2}
                    max={25}
                    step={1}
                    value={waterCubicMeters}
                    onChange={(e) => setWaterCubicMeters(Number(e.target.value))}
                    className="w-full accent-teal-700 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Đơn giá nước: {formatWaterRate(currentRoom.waterPrice, currentRoom.waterUnit)}
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-700 mb-1.5">
                    <label htmlFor="estimator-people-input">Số người ở thực tế</label>
                    <span className="font-mono tabular-nums font-semibold text-slate-900">
                      {Math.min(occupants, currentRoom.maxOccupants)} người
                    </span>
                  </div>
                  <input
                    id="estimator-people-input"
                    type="range"
                    min={1}
                    max={currentRoom.maxOccupants}
                    step={1}
                    value={Math.min(occupants, currentRoom.maxOccupants)}
                    onChange={(e) => setOccupants(Number(e.target.value))}
                    className="w-full accent-teal-700 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Đơn giá nước: {formatWaterRate(currentRoom.waterPrice, currentRoom.waterUnit)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Receipt Breakdown */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <p className="text-xs text-slate-500">
                  {PROPERTY_TYPE_LABELS[currentRoom.propertyType]} · {currentRoom.district} ·{' '}
                  {currentRoom.areaSqm} m²
                </p>
                <h3 className="font-display text-lg font-bold text-slate-900 mt-0.5">
                  {currentRoom.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onOpenRoomDetail(currentRoom)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
              >
                Xem ảnh &amp; đặt lịch
              </button>
            </div>

            <div className="py-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">01. Tiền thuê phòng cố định</span>
                <span className="font-mono tabular-nums font-medium text-slate-900">
                  {formatVnd(estimate.rent)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">
                  02. Tiền điện ({kwhPerMonth} kWh ×{' '}
                  {formatElectricityRate(currentRoom.electricityPrice)})
                </span>
                <span className="font-mono tabular-nums font-medium text-slate-900">
                  {formatVnd(estimate.electricity)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">
                  03. Tiền nước ({formatWaterRate(currentRoom.waterPrice, currentRoom.waterUnit)})
                </span>
                <span className="font-mono tabular-nums font-medium text-slate-900">
                  {formatVnd(estimate.water)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">
                  04. Phí dịch vụ ({formatServiceFee(currentRoom.serviceFee)})
                </span>
                <span className="font-mono tabular-nums font-medium text-slate-900">
                  {formatVnd(estimate.service)}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Tổng chi phí sinh hoạt ước tính / tháng
                </p>
                <p className="text-xs text-slate-500">
                  Tiền cọc ban đầu ({currentRoom.depositMonths} tháng):{' '}
                  <span className="font-mono tabular-nums font-medium text-slate-700">
                    {formatVnd(estimate.depositAmount)}
                  </span>
                </p>
              </div>
              <p className="font-mono tabular-nums text-2xl font-bold text-teal-700">
                {formatVnd(estimate.totalMonthly)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
