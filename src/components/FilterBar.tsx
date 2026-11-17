import React from 'react';
import { RotateCcw, Search } from 'lucide-react';
import {
  AreaFilterRange,
  COMMON_AMENITIES,
  PriceFilterRange,
  PROPERTY_TYPE_LABELS,
  PropertyType,
  RoomFilterState,
  SortOption,
  ViewLayoutMode,
} from '../types/rental';

interface FilterBarProps {
  filters: RoomFilterState;
  availableDistricts: string[];
  resultCount: number;
  totalCount: number;
  viewMode: ViewLayoutMode;
  onChangeFilters: (next: Partial<RoomFilterState>) => void;
  onResetFilters: () => void;
  onChangeViewMode: (mode: ViewLayoutMode) => void;
}

const PROPERTY_TABS: { value: PropertyType | 'all'; label: string }[] = [
  { value: 'all', label: 'Tất cả loại phòng' },
  { value: 'phong-tro', label: PROPERTY_TYPE_LABELS['phong-tro'] },
  { value: 'chung-cu-mini', label: PROPERTY_TYPE_LABELS['chung-cu-mini'] },
  { value: 'studio', label: PROPERTY_TYPE_LABELS['studio'] },
  { value: 'can-ho-1pn', label: PROPERTY_TYPE_LABELS['can-ho-1pn'] },
  { value: 'can-ho-2pn', label: PROPERTY_TYPE_LABELS['can-ho-2pn'] },
];

const QUICK_AMENITIES = COMMON_AMENITIES.slice(0, 6);

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  availableDistricts,
  resultCount,
  totalCount,
  viewMode,
  onChangeFilters,
  onResetFilters,
  onChangeViewMode,
}) => {
  const hasActiveFilters =
    filters.searchQuery.trim().length > 0 ||
    filters.propertyType !== 'all' ||
    filters.district !== 'all' ||
    filters.priceRange !== 'all' ||
    filters.areaRange !== 'all' ||
    filters.onlyAvailable ||
    filters.selectedAmenities.length > 0;

  const toggleAmenity = (amenity: string) => {
    const exists = filters.selectedAmenities.includes(amenity);
    const next = exists
      ? filters.selectedAmenities.filter((a) => a !== amenity)
      : [...filters.selectedAmenities, amenity];
    onChangeFilters({ selectedAmenities: next });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 mb-6">
      {/* Row 1: Property type segmented controls + View mode switch */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div
          role="group"
          aria-label="Lọc theo loại hình phòng"
          className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0"
        >
          {PROPERTY_TABS.map((tab) => {
            const active = filters.propertyType === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => onChangeFilters({ propertyType: tab.value })}
                className={`px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-teal-700 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div
          role="group"
          aria-label="Chế độ hiển thị danh sách và bản đồ"
          className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start lg:self-auto shrink-0"
        >
          <button
            type="button"
            onClick={() => onChangeViewMode('split')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              viewMode === 'split'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Phòng &amp; Bản đồ
          </button>
          <button
            type="button"
            onClick={() => onChangeViewMode('grid')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Lưới 3 cột
          </button>
          <button
            type="button"
            onClick={() => onChangeViewMode('map')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              viewMode === 'map'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Bản đồ lớn
          </button>
        </div>
      </div>

      {/* Row 2: Search + District + Price + Area + Sort */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 pt-5">
        <div className="sm:col-span-2 lg:col-span-4">
          <label
            htmlFor="filter-search-input"
            className="block text-xs font-medium text-slate-700 mb-1.5"
          >
            Tìm kiếm nhanh
          </label>
          <div className="relative">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="filter-search-input"
              type="search"
              value={filters.searchQuery}
              onChange={(e) => onChangeFilters({ searchQuery: e.target.value })}
              placeholder="Tên đường, quận, Thảo Điền, ban công..."
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-[#F8F9FA] border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-teal-700 focus:outline-none"
            />
          </div>
        </div>

        <div className="lg:col-span-2">
          <label
            htmlFor="filter-district-select"
            className="block text-xs font-medium text-slate-700 mb-1.5"
          >
            Khu vực / Quận
          </label>
          <select
            id="filter-district-select"
            value={filters.district}
            onChange={(e) => onChangeFilters({ district: e.target.value })}
            className="w-full px-3 py-2.5 text-sm bg-[#F8F9FA] border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-teal-700 focus:outline-none cursor-pointer"
          >
            <option value="all">Tất cả khu vực</option>
            {availableDistricts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-2">
          <label
            htmlFor="filter-price-select"
            className="block text-xs font-medium text-slate-700 mb-1.5"
          >
            Mức giá thuê
          </label>
          <select
            id="filter-price-select"
            value={filters.priceRange}
            onChange={(e) =>
              onChangeFilters({ priceRange: e.target.value as PriceFilterRange })
            }
            className="w-full px-3 py-2.5 text-sm bg-[#F8F9FA] border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-teal-700 focus:outline-none cursor-pointer"
          >
            <option value="all">Mọi mức giá</option>
            <option value="under-4m">Dưới 4 triệu</option>
            <option value="4m-6m">Từ 4 – 6 triệu</option>
            <option value="6m-9m">Từ 6 – 9 triệu</option>
            <option value="over-9m">Trên 9 triệu</option>
          </select>
        </div>

        <div className="lg:col-span-2">
          <label
            htmlFor="filter-area-select"
            className="block text-xs font-medium text-slate-700 mb-1.5"
          >
            Diện tích phòng
          </label>
          <select
            id="filter-area-select"
            value={filters.areaRange}
            onChange={(e) =>
              onChangeFilters({ areaRange: e.target.value as AreaFilterRange })
            }
            className="w-full px-3 py-2.5 text-sm bg-[#F8F9FA] border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-teal-700 focus:outline-none cursor-pointer"
          >
            <option value="all">Mọi diện tích</option>
            <option value="under-25">Dưới 25 m²</option>
            <option value="25-35">Từ 25 – 35 m²</option>
            <option value="35-50">Từ 35 – 50 m²</option>
            <option value="over-50">Trên 50 m²</option>
          </select>
        </div>

        <div className="lg:col-span-2">
          <label
            htmlFor="filter-sort-select"
            className="block text-xs font-medium text-slate-700 mb-1.5"
          >
            Sắp xếp theo
          </label>
          <select
            id="filter-sort-select"
            value={filters.sortBy}
            onChange={(e) => onChangeFilters({ sortBy: e.target.value as SortOption })}
            className="w-full px-3 py-2.5 text-sm bg-[#F8F9FA] border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-teal-700 focus:outline-none cursor-pointer"
          >
            <option value="newest">Mới cập nhật</option>
            <option value="price-asc">Giá thấp đến cao</option>
            <option value="price-desc">Giá cao đến thấp</option>
            <option value="area-desc">Rộng nhất trước</option>
          </select>
        </div>
      </div>

      {/* Row 3: Quick amenity filter buttons + Availability checkbox + Result summary */}
      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 mr-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filters.onlyAvailable}
              onChange={(e) => onChangeFilters({ onlyAvailable: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700 cursor-pointer"
            />
            <span>Chỉ hiện phòng trống</span>
          </label>

          {QUICK_AMENITIES.map((amenity) => {
            const selected = filters.selectedAmenities.includes(amenity);
            return (
              <button
                key={amenity}
                type="button"
                onClick={() => toggleAmenity(amenity)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selected
                    ? 'bg-teal-50 border-teal-700 text-teal-800'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                {amenity}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
          <p className="text-xs sm:text-sm text-slate-600">
            Hiển thị{' '}
            <span className="font-mono tabular-nums font-semibold text-slate-900">
              {resultCount}
            </span>{' '}
            / <span className="font-mono tabular-nums">{totalCount}</span> phòng
          </p>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Xóa bộ lọc</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
