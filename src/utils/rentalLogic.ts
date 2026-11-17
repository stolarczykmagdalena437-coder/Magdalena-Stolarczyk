import {
  OWNER_ADMIN_EMAIL,
  PropertyType,
  RoomFilterState,
  RoomFormInput,
  RoomListing,
  RoomStatus,
  SiteSettingsInput,
  WATER_UNIT_LABELS,
  WaterUnit,
} from '../types/rental';

const VALID_PROPERTY_TYPES: PropertyType[] = [
  'phong-tro',
  'chung-cu-mini',
  'studio',
  'can-ho-1pn',
  'can-ho-2pn',
];

const VALID_WATER_UNITS: WaterUnit[] = ['nguoi', 'khoi', 'mien-phi'];
const VALID_STATUSES: RoomStatus[] = ['available', 'soon', 'rented'];
const PHONE_REGEX = /^[0-9+\-\s().]{8,20}$/;

export function normalizeVietnameseText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

export function formatVnd(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    return '0đ';
  }
  return `${Math.round(amount).toLocaleString('vi-VN')}đ`;
}

export function formatMillionsCompact(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    return '0 tr';
  }
  const millions = amount / 1_000_000;
  const formatted = Number.isInteger(millions)
    ? millions.toString()
    : millions.toFixed(1).replace('.', ',');
  return `${formatted} tr`;
}

export function formatElectricityRate(price: number): string {
  if (price <= 0) {
    return 'Giá nhà nước';
  }
  return `${formatVnd(price)}/kWh`;
}

export function formatWaterRate(price: number, unit: WaterUnit): string {
  if (unit === 'mien-phi' || price <= 0) {
    return 'Miễn phí';
  }
  const suffix = unit === 'nguoi' ? '/người' : '/m³';
  return `${formatVnd(price)}${suffix}`;
}

export function formatServiceFee(fee: number): string {
  if (fee <= 0) {
    return 'Miễn phí';
  }
  return `${formatVnd(fee)}/phòng`;
}

export function getWaterUnitSummary(unit: WaterUnit): string {
  return WATER_UNIT_LABELS[unit];
}

export function isAuthorizedOwner(
  user: { email?: string | null; emailVerified?: boolean | null } | null | undefined
): boolean {
  if (!user || !user.email) {
    return false;
  }
  return (
    user.email.trim().toLowerCase() === OWNER_ADMIN_EMAIL.toLowerCase() &&
    user.emailVerified === true
  );
}

export function filterAndSortRooms(
  rooms: RoomListing[],
  filters: RoomFilterState,
  includeUnpublished = false
): RoomListing[] {
  const normalizedQuery = normalizeVietnameseText(filters.searchQuery);

  const filtered = rooms.filter((room) => {
    if (!includeUnpublished && !room.isPublished) {
      return false;
    }

    if (filters.onlyAvailable && room.status !== 'available') {
      return false;
    }

    if (filters.propertyType !== 'all' && room.propertyType !== filters.propertyType) {
      return false;
    }

    if (filters.district !== 'all' && room.district !== filters.district) {
      return false;
    }

    if (filters.priceRange !== 'all') {
      if (filters.priceRange === 'under-4m' && room.rentPrice >= 4_000_000) return false;
      if (
        filters.priceRange === '4m-6m' &&
        (room.rentPrice < 4_000_000 || room.rentPrice > 6_000_000)
      ) {
        return false;
      }
      if (
        filters.priceRange === '6m-9m' &&
        (room.rentPrice <= 6_000_000 || room.rentPrice > 9_000_000)
      ) {
        return false;
      }
      if (filters.priceRange === 'over-9m' && room.rentPrice <= 9_000_000) return false;
    }

    if (filters.areaRange !== 'all') {
      if (filters.areaRange === 'under-25' && room.areaSqm >= 25) return false;
      if (filters.areaRange === '25-35' && (room.areaSqm < 25 || room.areaSqm > 35)) {
        return false;
      }
      if (filters.areaRange === '35-50' && (room.areaSqm <= 35 || room.areaSqm > 50)) {
        return false;
      }
      if (filters.areaRange === 'over-50' && room.areaSqm <= 50) return false;
    }

    if (filters.selectedAmenities.length > 0) {
      const hasAllAmenities = filters.selectedAmenities.every((amenity) =>
        room.amenities.includes(amenity)
      );
      if (!hasAllAmenities) return false;
    }

    if (normalizedQuery.length > 0) {
      const searchableBlob = normalizeVietnameseText(
        `${room.title} ${room.district} ${room.address} ${room.description} ${room.amenities.join(' ')}`
      );
      if (!searchableBlob.includes(normalizedQuery)) {
        return false;
      }
    }

    return true;
  });

  return [...filtered].sort((a, b) => {
    // Always prioritize available rooms over rented rooms when sorting by newest
    if (filters.sortBy === 'price-asc') {
      return a.rentPrice - b.rentPrice;
    }
    if (filters.sortBy === 'price-desc') {
      return b.rentPrice - a.rentPrice;
    }
    if (filters.sortBy === 'area-desc') {
      return b.areaSqm - a.areaSqm;
    }
    return b.updatedAtMs - a.updatedAtMs;
  });
}

export function calculateMonthlyEstimate(
  room: Pick<
    RoomListing,
    'rentPrice' | 'electricityPrice' | 'waterPrice' | 'waterUnit' | 'serviceFee' | 'depositMonths'
  >,
  usage: {
    kwhPerMonth: number;
    occupants: number;
    waterCubicMeters: number;
  }
): {
  rent: number;
  electricity: number;
  water: number;
  service: number;
  totalMonthly: number;
  depositAmount: number;
} {
  const safeKwh = Math.max(0, Math.round(usage.kwhPerMonth));
  const safeOccupants = Math.max(1, Math.round(usage.occupants));
  const safeCubic = Math.max(0, Math.round(usage.waterCubicMeters));

  const effectiveElectricityRate =
    room.electricityPrice > 0 ? room.electricityPrice : 2_800;
  const electricity = safeKwh * effectiveElectricityRate;

  let water = 0;
  if (room.waterUnit === 'nguoi') {
    water = room.waterPrice * safeOccupants;
  } else if (room.waterUnit === 'khoi') {
    water = room.waterPrice * safeCubic;
  }

  const service = Math.max(0, room.serviceFee);
  const rent = Math.max(0, room.rentPrice);
  const totalMonthly = rent + electricity + water + service;
  const depositAmount = Math.round(rent * Math.max(0, room.depositMonths));

  return {
    rent,
    electricity,
    water,
    service,
    totalMonthly,
    depositAmount,
  };
}

export function validateRoomInput(raw: RoomFormInput): {
  valid: boolean;
  errors: Record<string, string>;
  sanitized: RoomFormInput;
} {
  const errors: Record<string, string> = {};

  const sanitized: RoomFormInput = {
    title: raw.title.trim().slice(0, 120),
    propertyType: raw.propertyType,
    district: raw.district.trim().slice(0, 60),
    address: raw.address.trim().slice(0, 180),
    rentPrice: Number(raw.rentPrice),
    electricityPrice: Number(raw.electricityPrice),
    waterPrice: Number(raw.waterPrice),
    waterUnit: raw.waterUnit,
    serviceFee: Number(raw.serviceFee),
    serviceNote: raw.serviceNote.trim().slice(0, 160),
    areaSqm: Number(raw.areaSqm),
    depositMonths: Number(raw.depositMonths),
    maxOccupants: Math.round(Number(raw.maxOccupants)),
    floorLabel: raw.floorLabel.trim().slice(0, 30),
    status: raw.status,
    description: raw.description.trim().slice(0, 1500),
    images: raw.images
      .map((img) => img.trim())
      .filter((img) => img.length >= 5 && img.length <= 160_000)
      .slice(0, 5),
    amenities: raw.amenities
      .map((item) => item.trim().slice(0, 50))
      .filter((item) => item.length > 0)
      .slice(0, 12),
    lat: Number(raw.lat),
    lng: Number(raw.lng),
    isPublished: Boolean(raw.isPublished),
  };

  if (sanitized.title.length < 5) {
    errors.title = 'Tiêu đề phòng phải có ít nhất 5 ký tự.';
  }
  if (!VALID_PROPERTY_TYPES.includes(sanitized.propertyType)) {
    errors.propertyType = 'Loại hình phòng không hợp lệ.';
  }
  if (sanitized.district.length < 2) {
    errors.district = 'Vui lòng chọn hoặc nhập quận/khu vực.';
  }
  if (sanitized.address.length < 5) {
    errors.address = 'Địa chỉ cụ thể phải có ít nhất 5 ký tự.';
  }
  if (
    !Number.isFinite(sanitized.rentPrice) ||
    sanitized.rentPrice < 500_000 ||
    sanitized.rentPrice > 200_000_000
  ) {
    errors.rentPrice = 'Giá thuê phòng phải từ 500.000đ đến 200.000.000đ.';
  }
  if (
    !Number.isFinite(sanitized.electricityPrice) ||
    sanitized.electricityPrice < 0 ||
    sanitized.electricityPrice > 50_000
  ) {
    errors.electricityPrice = 'Giá điện phải từ 0đ đến 50.000đ/kWh.';
  }
  if (
    !Number.isFinite(sanitized.waterPrice) ||
    sanitized.waterPrice < 0 ||
    sanitized.waterPrice > 1_000_000
  ) {
    errors.waterPrice = 'Giá nước phải từ 0đ đến 1.000.000đ.';
  }
  if (!VALID_WATER_UNITS.includes(sanitized.waterUnit)) {
    errors.waterUnit = 'Đơn vị tính nước không hợp lệ.';
  }
  if (
    !Number.isFinite(sanitized.serviceFee) ||
    sanitized.serviceFee < 0 ||
    sanitized.serviceFee > 5_000_000
  ) {
    errors.serviceFee = 'Phí dịch vụ phải từ 0đ đến 5.000.000đ.';
  }
  if (
    !Number.isFinite(sanitized.areaSqm) ||
    sanitized.areaSqm < 8 ||
    sanitized.areaSqm > 500
  ) {
    errors.areaSqm = 'Diện tích phòng phải từ 8 m² đến 500 m².';
  }
  if (
    !Number.isFinite(sanitized.depositMonths) ||
    sanitized.depositMonths < 0 ||
    sanitized.depositMonths > 12
  ) {
    errors.depositMonths = 'Số tháng cọc phải từ 0 đến 12 tháng.';
  }
  if (
    !Number.isFinite(sanitized.maxOccupants) ||
    sanitized.maxOccupants < 1 ||
    sanitized.maxOccupants > 10
  ) {
    errors.maxOccupants = 'Số người ở tối đa từ 1 đến 10 người.';
  }
  if (sanitized.floorLabel.length < 1) {
    errors.floorLabel = 'Vui lòng nhập thông tin tầng (VD: Tầng 3).';
  }
  if (!VALID_STATUSES.includes(sanitized.status)) {
    errors.status = 'Trạng thái phòng không hợp lệ.';
  }
  if (sanitized.description.length < 10) {
    errors.description = 'Mô tả chi tiết phải có ít nhất 10 ký tự.';
  }
  if (sanitized.images.length < 1) {
    errors.images = 'Vui lòng tải lên hoặc chọn ít nhất 1 ảnh phòng.';
  }
  if (!Number.isFinite(sanitized.lat) || sanitized.lat < 8.0 || sanitized.lat > 24.0) {
    errors.lat = 'Vĩ độ (Lat) phải nằm trong lãnh thổ Việt Nam (8.0 – 24.0).';
  }
  if (!Number.isFinite(sanitized.lng) || sanitized.lng < 102.0 || sanitized.lng > 110.0) {
    errors.lng = 'Kinh độ (Lng) phải nằm trong lãnh thổ Việt Nam (102.0 – 110.0).';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized,
  };
}

export function validateSiteSettingsInput(raw: SiteSettingsInput): {
  valid: boolean;
  errors: Record<string, string>;
  sanitized: SiteSettingsInput;
} {
  const errors: Record<string, string> = {};

  const sanitized: SiteSettingsInput = {
    brandName: raw.brandName.trim().slice(0, 60),
    heroTitle: raw.heroTitle.trim().slice(0, 140),
    heroSubtitle: raw.heroSubtitle.trim().slice(0, 280),
    heroImageUrl: raw.heroImageUrl.trim().slice(0, 160_000),
    agentName: raw.agentName.trim().slice(0, 60),
    agentRole: raw.agentRole.trim().slice(0, 80),
    publicPhone: raw.publicPhone.trim().slice(0, 20),
    publicZalo: raw.publicZalo.trim().slice(0, 20),
    officeAddress: raw.officeAddress.trim().slice(0, 180),
  };

  if (sanitized.brandName.length < 2) {
    errors.brandName = 'Tên thương hiệu phải từ 2 ký tự trở lên.';
  }
  if (sanitized.heroTitle.length < 10) {
    errors.heroTitle = 'Tiêu đề chính phải từ 10 ký tự trở lên.';
  }
  if (sanitized.heroSubtitle.length < 10) {
    errors.heroSubtitle = 'Mô tả giới thiệu phải từ 10 ký tự trở lên.';
  }
  if (sanitized.heroImageUrl.length < 5) {
    errors.heroImageUrl = 'Vui lòng cung cấp ảnh bìa hợp lệ.';
  }
  if (sanitized.agentName.length < 2) {
    errors.agentName = 'Tên người quản lý/sale phải từ 2 ký tự.';
  }
  if (sanitized.agentRole.length < 2) {
    errors.agentRole = 'Chức danh phải từ 2 ký tự.';
  }
  if (!PHONE_REGEX.test(sanitized.publicPhone)) {
    errors.publicPhone = 'Số điện thoại không hợp lệ (8–20 chữ số).';
  }
  if (!PHONE_REGEX.test(sanitized.publicZalo)) {
    errors.publicZalo = 'Số Zalo không hợp lệ (8–20 chữ số).';
  }
  if (sanitized.officeAddress.length < 5) {
    errors.officeAddress = 'Địa chỉ khu vực hoạt động phải từ 5 ký tự.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized,
  };
}

export function validateViewingBooking(input: {
  customerName: string;
  customerPhone: string;
  preferredDate: string;
  preferredTime: string;
  note: string;
}): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  if (input.customerName.trim().length < 2) {
    errors.customerName = 'Vui lòng nhập họ tên của bạn (ít nhất 2 ký tự).';
  }
  if (!PHONE_REGEX.test(input.customerPhone.trim())) {
    errors.customerPhone = 'Vui lòng nhập số điện thoại liên hệ hợp lệ (8–15 số).';
  }
  if (!input.preferredDate.trim()) {
    errors.preferredDate = 'Vui lòng chọn ngày muốn xem phòng.';
  }
  if (!input.preferredTime.trim()) {
    errors.preferredTime = 'Vui lòng chọn khung giờ xem phòng.';
  }
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
