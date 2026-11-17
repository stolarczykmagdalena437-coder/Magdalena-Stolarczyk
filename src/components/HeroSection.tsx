import React from 'react';
import { SiteSettings } from '../types/rental';
import { ResilientImage } from './ResilientImage';
import { formatMillionsCompact } from '../utils/rentalLogic';

interface HeroSectionProps {
  settings: SiteSettings;
  totalRoomsCount: number;
  availableRoomsCount: number;
  minRentPrice: number;
  onExploreClick: () => void;
  onMapClick: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  settings,
  totalRoomsCount,
  availableRoomsCount,
  minRentPrice,
  onExploreClick,
  onMapClick,
}) => {
  return (
    <section id="trang-chu" className="scroll-mt-16 bg-white border-b border-slate-200">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          {/* Left proposition column */}
          <div className="lg:col-span-6 flex flex-col justify-between py-1">
            <div>
              <p className="text-xs font-medium text-teal-800 mb-3">
                {settings.agentName} · {settings.agentRole}
              </p>
              <h1 className="font-display text-[clamp(2rem,3.6vw,3.25rem)] font-bold text-slate-900 leading-[1.15] tracking-tight [text-wrap:balance] mb-4">
                {settings.heroTitle}
              </h1>
              <p className="text-base text-slate-600 leading-relaxed max-w-[60ch] mb-8">
                {settings.heroSubtitle}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onExploreClick}
                className="px-6 py-3 bg-teal-700 text-white text-sm font-semibold rounded-lg hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
              >
                Xem {availableRoomsCount} phòng đang trống
              </button>
              <button
                type="button"
                onClick={onMapClick}
                className="px-5 py-3 bg-slate-100 text-slate-800 text-sm font-semibold rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
              >
                Mở bản đồ vị trí
              </button>
            </div>
          </div>

          {/* Right visual carrier */}
          <div className="lg:col-span-6">
            <div className="relative h-64 sm:h-80 lg:h-full min-h-[280px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
              <ResilientImage
                src={settings.heroImageUrl}
                alt={settings.heroTitle}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/55 to-transparent p-5 sm:p-6">
                <p className="text-xs text-slate-100 mb-1">
                  Cam kết thông tin thực tế từ chuyên viên quản lý
                </p>
                <p className="text-sm sm:text-base font-semibold text-white">
                  Hotline / Zalo xem phòng trực tiếp: {settings.publicPhone}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Full-width 4-column quantitative proof strip below split */}
        <div className="mt-10 pt-8 border-t border-slate-200 grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="font-mono tabular-nums text-2xl font-bold text-slate-900">
              {totalRoomsCount} căn
            </p>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Đang quản lý tại các quận trung tâm
            </p>
          </div>
          <div>
            <p className="font-mono tabular-nums text-2xl font-bold text-teal-700">
              {availableRoomsCount} phòng trống
            </p>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Sẵn sàng dọn vào ở ngay trong tuần
            </p>
          </div>
          <div>
            <p className="font-mono tabular-nums text-2xl font-bold text-slate-900">
              Từ {formatMillionsCompact(minRentPrice)}/tháng
            </p>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Đa dạng từ phòng trọ đến căn hộ 2PN
            </p>
          </div>
          <div>
            <p className="font-mono tabular-nums text-2xl font-bold text-slate-900">
              100% công khai
            </p>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Rõ tiền điện, nước, dịch vụ &amp; diện tích
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
