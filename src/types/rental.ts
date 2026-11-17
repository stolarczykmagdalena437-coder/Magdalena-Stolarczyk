export type PropertyType =
  | 'phong-tro'
  | 'chung-cu-mini'
  | 'studio'
  | 'can-ho-1pn'
  | 'can-ho-2pn';

export type WaterUnit = 'nguoi' | 'khoi' | 'mien-phi';

export type RoomStatus = 'available' | 'soon' | 'rented';

export interface RoomListing {
  id: string;
  title: string;
  propertyType: PropertyType;
  district: string;
  address: string;
  rentPrice: number;
  electricityPrice: number;
  waterPrice: number;
  waterUnit: WaterUnit;
  serviceFee: number;
  serviceNote: string;
  areaSqm: number;
  depositMonths: number;
  maxOccupants: number;
  floorLabel: string;
  status: RoomStatus;
  description: string;
  images: string[];
  amenities: string[];
  lat: number;
  lng: number;
  isPublished: boolean;
  ownerUid: string;
  updatedAtMs: number;
}

export type RoomFormInput = Omit<RoomListing, 'id' | 'ownerUid' | 'updatedAtMs'>;

export interface SiteSettings {
  brandName: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  agentName: string;
  agentRole: string;
  publicPhone: string;
  publicZalo: string;
  officeAddress: string;
}

export type SiteSettingsInput = SiteSettings;

export type PriceFilterRange = 'all' | 'under-4m' | '4m-6m' | '6m-9m' | 'over-9m';
export type AreaFilterRange = 'all' | 'under-25' | '25-35' | '35-50' | 'over-50';
export type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'area-desc';
export type ViewLayoutMode = 'split' | 'grid' | 'map';

export interface RoomFilterState {
  searchQuery: string;
  propertyType: PropertyType | 'all';
  district: string;
  priceRange: PriceFilterRange;
  areaRange: AreaFilterRange;
  onlyAvailable: boolean;
  selectedAmenities: string[];
  sortBy: SortOption;
}

export interface ViewingBooking {
  id: string;
  bookingCode: string;
  roomId: string;
  roomTitle: string;
  roomAddress: string;
  customerName: string;
  customerPhone: string;
  preferredDate: string;
  preferredTime: string;
  note: string;
  createdAtIso: string;
}

export const OWNER_ADMIN_EMAIL = 'stolarczykmagdalena437@gmail.com';

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  'phong-tro': 'Phòng trọ',
  'chung-cu-mini': 'Chung cư mini',
  'studio': 'Căn hộ Studio',
  'can-ho-1pn': 'Căn hộ 1PN',
  'can-ho-2pn': 'Căn hộ 2PN',
};

export const STATUS_LABELS: Record<RoomStatus, string> = {
  available: 'Còn phòng trống',
  soon: 'Sắp trống',
  rented: 'Đã cho thuê',
};

export const WATER_UNIT_LABELS: Record<WaterUnit, string> = {
  nguoi: 'VNĐ/người',
  khoi: 'VNĐ/m³',
  'mien-phi': 'Miễn phí',
};

export const COMMON_AMENITIES: string[] = [
  'Máy lạnh Inverter',
  'Tủ lạnh riêng',
  'Máy giặt riêng',
  'Ban công thoáng',
  'Cửa sổ lớn',
  'Kệ bếp nấu ăn',
  'Thang máy',
  'Khóa vân tay 24/7',
  'Giờ giấc tự do',
  'Cho nuôi thú cưng',
  'Hầm để xe rộng',
  'Nội thất đầy đủ',
];

export const HCMC_DISTRICTS: string[] = [
  'Quận Bình Thạnh',
  'TP. Thủ Đức',
  'Quận Phú Nhuận',
  'Quận 7',
  'Quận 3',
  'Quận 1',
  'Quận Tân Bình',
  'Quận 10',
  'Quận Gò Vấp',
  'Quận 4',
];
