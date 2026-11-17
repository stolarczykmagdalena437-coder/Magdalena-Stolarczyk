import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  CloudUpload,
  ImagePlus,
  Lock,
  LogIn,
  LogOut,
  Plus,
  Settings,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';
import {
  COMMON_AMENITIES,
  HCMC_DISTRICTS,
  OWNER_ADMIN_EMAIL,
  PROPERTY_TYPE_LABELS,
  PropertyType,
  RoomFormInput,
  RoomListing,
  RoomStatus,
  SiteSettings,
  SiteSettingsInput,
  WaterUnit,
} from '../types/rental';
import { PRESET_GALLERY_IMAGES } from '../data/seedData';
import { compressImageFileToDataUrl } from '../lib/firebase';
import {
  validateRoomInput,
  validateSiteSettingsInput,
} from '../utils/rentalLogic';
import { ResilientImage } from './ResilientImage';
import { InteractiveMap } from './InteractiveMap';

/* ============================================================================
 * 1. Owner Auth & Dashboard Control Modal
 * ============================================================================ */
interface AdminAccountModalProps {
  isOpen: boolean;
  currentUser: User | null;
  isOwner: boolean;
  authBusy: boolean;
  authError: string | null;
  hasCloudRooms: boolean;
  syncingSeed: boolean;
  onClose: () => void;
  onGoogleLogin: () => void;
  onLogout: () => void;
  onOpenNewRoom: () => void;
  onOpenSiteSettings: () => void;
  onSyncSeedToCloud: () => void;
}

export const AdminAccountModal: React.FC<AdminAccountModalProps> = ({
  isOpen,
  currentUser,
  isOwner,
  authBusy,
  authError,
  hasCloudRooms,
  syncingSeed,
  onClose,
  onGoogleLogin,
  onLogout,
  onOpenNewRoom,
  onOpenSiteSettings,
  onSyncSeedToCloud,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-account-modal-title"
    >
      <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2
            id="admin-account-modal-title"
            className="font-display text-lg font-bold text-slate-900"
          >
            Quản trị hệ thống phòng trọ
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bảng quản trị"
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {!currentUser ? (
            <>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-[#F8F9FA] border border-slate-200">
                <Lock className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="text-xs text-slate-600 leading-relaxed">
                  <p className="font-semibold text-slate-900 mb-1">
                    Bảo mật quyền chỉnh sửa độc quyền
                  </p>
                  <p>
                    Khách tìm phòng có thể xem danh sách, lọc phòng và xem bản đồ tự do.
                    Chỉ duy nhất tài khoản chủ quản lý đã xác thực mới được phép đăng
                    phòng, cập nhật ảnh và thay đổi thông tin trang web.
                  </p>
                </div>
              </div>

              {authError && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-3">
                  {authError}
                </p>
              )}

              <button
                type="button"
                disabled={authBusy}
                onClick={onGoogleLogin}
                className="w-full inline-flex items-center justify-center gap-2.5 px-4 py-3 bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
              >
                <LogIn className="w-4 h-4" aria-hidden="true" />
                <span>{authBusy ? 'Đang xác thực Google...' : 'Đăng nhập bằng Google'}</span>
              </button>
            </>
          ) : isOwner ? (
            <>
              <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200">
                <p className="text-xs font-semibold text-teal-900">
                  Đã xác thực quyền Chủ quản trị
                </p>
                <p className="text-xs text-teal-800 mt-0.5 truncate">{currentUser.email}</p>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenNewRoom();
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  <span>Đăng phòng trọ / căn hộ mới</span>
                  <Plus className="w-4 h-4" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSiteSettings();
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 bg-[#F8F9FA] hover:bg-slate-100 text-slate-900 border border-slate-200 text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  <span>Thay đổi thông tin &amp; ảnh bìa Web</span>
                  <Settings className="w-4 h-4 text-slate-600" aria-hidden="true" />
                </button>

                {!hasCloudRooms && (
                  <button
                    type="button"
                    disabled={syncingSeed}
                    onClick={onSyncSeedToCloud}
                    className="w-full flex items-center justify-between px-4 py-3 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    <span>
                      {syncingSeed
                        ? 'Đang lưu dữ liệu mẫu lên Cloud...'
                        : 'Lưu 6 phòng mẫu lên cơ sở dữ liệu để sửa/xóa'}
                    </span>
                    <CloudUpload className="w-4 h-4 text-teal-700" aria-hidden="true" />
                  </button>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-rose-700 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Đăng xuất quản trị</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-semibold mb-1">Tài khoản không có quyền quản trị</p>
                  <p className="leading-relaxed">
                    Bạn đang đăng nhập bằng <strong>{currentUser.email}</strong>. Hệ thống
                    bảo mật chỉ cho phép tài khoản chủ sở hữu ({OWNER_ADMIN_EMAIL}) cập
                    nhật hình ảnh, giá phòng và thông tin website.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl cursor-pointer"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                <span>Đăng xuất để đổi tài khoản</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * 2. Room Add / Edit Modal (Owner Exclusive)
 * ============================================================================ */
const DISTRICT_DEFAULT_COORDS: Record<string, [number, number]> = {
  'Quận Bình Thạnh': [10.8012, 106.7114],
  'TP. Thủ Đức': [10.8045, 106.7336],
  'Quận Phú Nhuận': [10.7968, 106.6889],
  'Quận 7': [10.7385, 106.7182],
  'Quận 3': [10.7736, 106.6872],
  'Quận 1': [10.7769, 106.7009],
  'Quận Tân Bình': [10.8024, 106.6418],
  'Quận 10': [10.7726, 106.6679],
  'Quận Gò Vấp': [10.8387, 106.6653],
  'Quận 4': [10.7578, 106.7013],
};

const EMPTY_ROOM_FORM: RoomFormInput = {
  title: '',
  propertyType: 'studio',
  district: 'Quận Bình Thạnh',
  address: '',
  rentPrice: 5_500_000,
  electricityPrice: 3_500,
  waterPrice: 100_000,
  waterUnit: 'nguoi',
  serviceFee: 150_000,
  serviceNote: 'Đã gồm Wi-Fi, rác sinh hoạt, vệ sinh hành lang và thang máy',
  areaSqm: 30,
  depositMonths: 1,
  maxOccupants: 2,
  floorLabel: 'Tầng 3 (Thang máy)',
  status: 'available',
  description: '',
  images: [PRESET_GALLERY_IMAGES.heroStudio],
  amenities: [
    'Máy lạnh Inverter',
    'Tủ lạnh riêng',
    'Cửa sổ lớn',
    'Kệ bếp nấu ăn',
    'Khóa vân tay 24/7',
  ],
  lat: 10.8012,
  lng: 106.7114,
  isPublished: true,
};

interface RoomEditorModalProps {
  isOpen: boolean;
  editingRoom: RoomListing | null;
  saving: boolean;
  onClose: () => void;
  onSaveRoom: (input: RoomFormInput, existingId?: string) => Promise<void>;
}

export const RoomEditorModal: React.FC<RoomEditorModalProps> = ({
  isOpen,
  editingRoom,
  saving,
  onClose,
  onSaveRoom,
}) => {
  const [form, setForm] = useState<RoomFormInput>(EMPTY_ROOM_FORM);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (editingRoom) {
      const { id: _id, ownerUid: _ownerUid, updatedAtMs: _updatedAtMs, ...rest } = editingRoom;
      setForm(rest);
    } else {
      setForm(EMPTY_ROOM_FORM);
    }
    setErrors({});
    setSubmitError(null);
    setCustomImageUrl('');
  }, [editingRoom, isOpen]);

  if (!isOpen) return null;

  const handleDistrictChange = (district: string) => {
    const coords = DISTRICT_DEFAULT_COORDS[district];
    setForm((prev) => ({
      ...prev,
      district,
      lat: coords ? coords[0] : prev.lat,
      lng: coords ? coords[1] : prev.lng,
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhoto(true);
    setSubmitError(null);
    try {
      const remainingSlots = 5 - form.images.length;
      if (remainingSlots <= 0) {
        setSubmitError('Mỗi phòng tối đa 5 ảnh để đảm bảo tốc độ tải nhanh nhất.');
        return;
      }
      const selectedFiles = Array.from(files).slice(0, remainingSlots);
      const compressedList: string[] = [];
      for (const file of selectedFiles) {
        const dataUrl = await compressImageFileToDataUrl(file);
        compressedList.push(dataUrl);
      }
      setForm((prev) => ({
        ...prev,
        images: [...prev.images, ...compressedList].slice(0, 5),
      }));
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Lỗi khi nén ảnh tải lên.');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleAddUrlImage = () => {
    const trimmed = customImageUrl.trim();
    if (trimmed.length < 5) return;
    if (form.images.length >= 5) {
      setSubmitError('Tối đa 5 ảnh cho mỗi phòng.');
      return;
    }
    setForm((prev) => ({ ...prev, images: [...prev.images, trimmed] }));
    setCustomImageUrl('');
  };

  const handleRemoveImage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== index),
    }));
  };

  const toggleAmenity = (amenity: string) => {
    setForm((prev) => {
      const exists = prev.amenities.includes(amenity);
      if (exists) {
        return { ...prev, amenities: prev.amenities.filter((a) => a !== amenity) };
      }
      if (prev.amenities.length >= 12) return prev;
      return { ...prev, amenities: [...prev.amenities, amenity] };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const check = validateRoomInput(form);
    if (!check.valid) {
      setErrors(check.errors);
      return;
    }
    setErrors({});
    try {
      await onSaveRoom(check.sanitized, editingRoom?.id);
      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Không thể lưu thông tin phòng. Vui lòng thử lại.'
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs overflow-y-auto flex items-start justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="room-editor-modal-title"
    >
      <div className="bg-white w-full max-w-4xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h2
            id="room-editor-modal-title"
            className="font-display text-lg font-bold text-slate-900"
          >
            {editingRoom ? 'Cập nhật thông tin & ảnh phòng' : 'Đăng phòng trọ / căn hộ mới'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng biểu mẫu phòng"
            className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-6">
          {submitError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {submitError}
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-8">
              <label
                htmlFor="room-title-input"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Tiêu đề phòng / căn hộ
              </label>
              <input
                id="room-title-input"
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="VD: Studio Ban Công Thoáng Quận Bình Thạnh - Full Nội Thất"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:border-teal-700 focus:outline-none"
              />
              {errors.title && <p className="text-xs text-rose-600 mt-1">{errors.title}</p>}
            </div>

            <div className="sm:col-span-4">
              <label
                htmlFor="room-type-select"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Loại hình
              </label>
              <select
                id="room-type-select"
                value={form.propertyType}
                onChange={(e) =>
                  setForm({ ...form, propertyType: e.target.value as PropertyType })
                }
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-700 focus:outline-none"
              >
                {Object.entries(PROPERTY_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-4">
              <label
                htmlFor="room-district-select"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Quận / Khu vực
              </label>
              <select
                id="room-district-select"
                value={form.district}
                onChange={(e) => handleDistrictChange(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-700 focus:outline-none"
              >
                {HCMC_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-8">
              <label
                htmlFor="room-address-input"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Địa chỉ cụ thể
              </label>
              <input
                id="room-address-input"
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="VD: 168 Xô Viết Nghệ Tĩnh, Phường 21, Quận Bình Thạnh"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:border-teal-700 focus:outline-none"
              />
              {errors.address && <p className="text-xs text-rose-600 mt-1">{errors.address}</p>}
            </div>
          </div>

          {/* Pricing & Utilities */}
          <div className="bg-[#F8F9FA] border border-slate-200 rounded-xl p-5 space-y-4">
            <h3 className="font-display text-sm font-bold text-slate-900">
              Giá thuê, điện, nước, phí dịch vụ &amp; diện tích
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="room-rent-input"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Giá phòng (VNĐ/tháng)
                </label>
                <input
                  id="room-rent-input"
                  type="number"
                  step={100000}
                  value={form.rentPrice}
                  onChange={(e) => setForm({ ...form, rentPrice: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-lg"
                />
                {errors.rentPrice && (
                  <p className="text-xs text-rose-600 mt-1">{errors.rentPrice}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="room-elec-input"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Tiền điện (VNĐ/kWh, nhập 0 = giá NN)
                </label>
                <input
                  id="room-elec-input"
                  type="number"
                  step={100}
                  value={form.electricityPrice}
                  onChange={(e) =>
                    setForm({ ...form, electricityPrice: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-lg"
                />
                {errors.electricityPrice && (
                  <p className="text-xs text-rose-600 mt-1">{errors.electricityPrice}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="room-area-input"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Diện tích rộng (m²)
                </label>
                <input
                  id="room-area-input"
                  type="number"
                  value={form.areaSqm}
                  onChange={(e) => setForm({ ...form, areaSqm: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-lg"
                />
                {errors.areaSqm && (
                  <p className="text-xs text-rose-600 mt-1">{errors.areaSqm}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="room-water-input"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Tiền nước (VNĐ)
                </label>
                <input
                  id="room-water-input"
                  type="number"
                  step={5000}
                  value={form.waterPrice}
                  onChange={(e) => setForm({ ...form, waterPrice: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label
                  htmlFor="room-water-unit"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Cách tính nước
                </label>
                <select
                  id="room-water-unit"
                  value={form.waterUnit}
                  onChange={(e) => setForm({ ...form, waterUnit: e.target.value as WaterUnit })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                >
                  <option value="nguoi">VNĐ / người / tháng</option>
                  <option value="khoi">VNĐ / khối (m³)</option>
                  <option value="mien-phi">Miễn phí nước</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="room-service-input"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Phí dịch vụ (VNĐ/phòng)
                </label>
                <input
                  id="room-service-input"
                  type="number"
                  step={10000}
                  value={form.serviceFee}
                  onChange={(e) => setForm({ ...form, serviceFee: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <label
                  htmlFor="room-service-note"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Phí dịch vụ bao gồm những gì?
                </label>
                <input
                  id="room-service-note"
                  type="text"
                  value={form.serviceNote}
                  onChange={(e) => setForm({ ...form, serviceNote: e.target.value })}
                  placeholder="VD: Gồm Wi-Fi, rác, thang máy, giữ xe..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label
                  htmlFor="room-deposit-input"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Cọc (số tháng)
                </label>
                <input
                  id="room-deposit-input"
                  type="number"
                  min={0}
                  max={12}
                  value={form.depositMonths}
                  onChange={(e) =>
                    setForm({ ...form, depositMonths: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label
                  htmlFor="room-status-select"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Tình trạng phòng
                </label>
                <select
                  id="room-status-select"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as RoomStatus })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                >
                  <option value="available">Còn phòng trống</option>
                  <option value="soon">Sắp trống</option>
                  <option value="rented">Đã cho thuê</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="room-floor-input"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Tầng / Thang máy
                </label>
                <input
                  id="room-floor-input"
                  type="text"
                  value={form.floorLabel}
                  onChange={(e) => setForm({ ...form, floorLabel: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label
                  htmlFor="room-occupants-input"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Ở tối đa (người)
                </label>
                <input
                  id="room-occupants-input"
                  type="number"
                  min={1}
                  max={10}
                  value={form.maxOccupants}
                  onChange={(e) => setForm({ ...form, maxOccupants: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex items-end pb-2">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isPublished}
                    onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                    className="w-4 h-4 rounded text-teal-700 focus:ring-teal-700"
                  />
                  <span>Hiển thị công khai lên Web</span>
                </label>
              </div>
            </div>
          </div>

          {/* Photo Management */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-800">
                Hình ảnh thực tế ({form.images.length}/5 ảnh)
              </label>

              <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg cursor-pointer">
                <ImagePlus className="w-4 h-4" aria-hidden="true" />
                <span>
                  {uploadingPhoto ? 'Đang nén ảnh...' : 'Tải ảnh từ máy tính / điện thoại'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={uploadingPhoto || form.images.length >= 5}
                  onChange={handleFileUpload}
                  className="sr-only"
                />
              </label>
            </div>

            <div className="flex gap-2">
              <input
                type="url"
                value={customImageUrl}
                onChange={(e) => setCustomImageUrl(e.target.value)}
                placeholder="Hoặc dán đường dẫn URL hình ảnh phòng..."
                aria-label="Đường dẫn URL hình ảnh"
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
              <button
                type="button"
                onClick={handleAddUrlImage}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg shrink-0 cursor-pointer"
              >
                Thêm URL
              </button>
            </div>

            {errors.images && <p className="text-xs text-rose-600">{errors.images}</p>}

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {form.images.map((img, idx) => (
                <div
                  key={`${img.slice(0, 24)}-${idx}`}
                  className="relative aspect-[4/3] rounded-lg overflow-hidden border border-slate-200 bg-slate-100"
                >
                  <ResilientImage src={img} alt={`Ảnh ${idx + 1}`} />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    aria-label={`Xóa ảnh số ${idx + 1}`}
                    className="absolute top-1.5 right-1.5 p-1 bg-slate-900/80 hover:bg-rose-600 text-white rounded-md cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Amenities & Description */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-800">Tiện ích có sẵn trong phòng</p>
            <div className="flex flex-wrap gap-2">
              {COMMON_AMENITIES.map((amenity) => {
                const active = form.amenities.includes(amenity);
                return (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => toggleAmenity(amenity)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer ${
                      active
                        ? 'bg-teal-50 border-teal-700 text-teal-800'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {amenity}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="room-desc-textarea"
              className="block text-xs font-semibold text-slate-800 mb-1"
            >
              Mô tả chi tiết phòng, khu vực xung quanh &amp; lưu ý
            </label>
            <textarea
              id="room-desc-textarea"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Mô tả ánh sáng, nội thất bàn giao, khoảng cách tới trường đại học/văn phòng..."
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:border-teal-700 focus:outline-none"
            />
            {errors.description && (
              <p className="text-xs text-rose-600 mt-1">{errors.description}</p>
            )}
          </div>

          {/* Interactive Map Coordinate Picker */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-800">
                Định vị bản đồ (nhấp vào bản đồ để ghim đúng vị trí nhà)
              </p>
              <div className="flex items-center gap-2 text-xs">
                <label className="flex items-center gap-1 text-slate-600">
                  <span>Lat:</span>
                  <input
                    type="number"
                    step="0.0001"
                    value={form.lat}
                    onChange={(e) => setForm({ ...form, lat: Number(e.target.value) })}
                    className="w-24 px-2 py-1 font-mono border border-slate-200 rounded"
                  />
                </label>
                <label className="flex items-center gap-1 text-slate-600">
                  <span>Lng:</span>
                  <input
                    type="number"
                    step="0.0001"
                    value={form.lng}
                    onChange={(e) => setForm({ ...form, lng: Number(e.target.value) })}
                    className="w-24 px-2 py-1 font-mono border border-slate-200 rounded"
                  />
                </label>
              </div>
            </div>

            <InteractiveMap
              rooms={[]}
              selectedRoomId={null}
              onSelectRoomPin={() => {}}
              heightClassName="h-64"
              pickerMode
              pickedLat={form.lat}
              pickedLng={form.lng}
              onPickCoordinate={(lat, lng) => setForm((prev) => ({ ...prev, lat, lng }))}
            />
            {(errors.lat || errors.lng) && (
              <p className="text-xs text-rose-600">{errors.lat || errors.lng}</p>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving || uploadingPhoto}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-60 rounded-lg cursor-pointer"
            >
              {saving
                ? 'Đang lưu lên đám mây...'
                : editingRoom
                  ? 'Lưu cập nhật phòng'
                  : 'Đăng phòng ngay'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ============================================================================
 * 3. Website Branding & Contact Settings Modal (Owner Exclusive)
 * ============================================================================ */
interface SiteSettingsModalProps {
  isOpen: boolean;
  currentSettings: SiteSettings;
  saving: boolean;
  onClose: () => void;
  onSaveSettings: (next: SiteSettingsInput) => Promise<void>;
}

export const SiteSettingsModal: React.FC<SiteSettingsModalProps> = ({
  isOpen,
  currentSettings,
  saving,
  onClose,
  onSaveSettings,
}) => {
  const [form, setForm] = useState<SiteSettingsInput>(currentSettings);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setForm(currentSettings);
    setErrors({});
    setSubmitError(null);
  }, [currentSettings, isOpen]);

  if (!isOpen) return null;

  const handleHeroFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingHero(true);
    setSubmitError(null);
    try {
      const dataUrl = await compressImageFileToDataUrl(file);
      setForm((prev) => ({ ...prev, heroImageUrl: dataUrl }));
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Không thể xử lý ảnh bìa.');
    } finally {
      setUploadingHero(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const check = validateSiteSettingsInput(form);
    if (!check.valid) {
      setErrors(check.errors);
      return;
    }
    setErrors({});
    try {
      await onSaveSettings(check.sanitized);
      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Không thể cập nhật thông tin trang web.'
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs overflow-y-auto flex items-start justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="site-settings-modal-title"
    >
      <div className="bg-white w-full max-w-2xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2
            id="site-settings-modal-title"
            className="font-display text-lg font-bold text-slate-900"
          >
            Thay đổi thông tin &amp; giao diện trang web
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cài đặt trang web"
            className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
          {submitError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {submitError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="site-brand-input"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Tên thương hiệu trên thanh đầu trang
              </label>
              <input
                id="site-brand-input"
                type="text"
                value={form.brandName}
                onChange={(e) => setForm({ ...form, brandName: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
              {errors.brandName && (
                <p className="text-xs text-rose-600 mt-1">{errors.brandName}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="site-agent-input"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Tên của bạn (Sale / Quản lý)
              </label>
              <input
                id="site-agent-input"
                type="text"
                value={form.agentName}
                onChange={(e) => setForm({ ...form, agentName: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
              {errors.agentName && (
                <p className="text-xs text-rose-600 mt-1">{errors.agentName}</p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="site-role-input"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Chức danh / Khu vực chuyên trách
            </label>
            <input
              id="site-role-input"
              type="text"
              value={form.agentRole}
              onChange={(e) => setForm({ ...form, agentRole: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label
              htmlFor="site-hero-title"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Tiêu đề nổi bật trang chủ
            </label>
            <input
              id="site-hero-title"
              type="text"
              value={form.heroTitle}
              onChange={(e) => setForm({ ...form, heroTitle: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
            {errors.heroTitle && (
              <p className="text-xs text-rose-600 mt-1">{errors.heroTitle}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="site-hero-sub"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Đoạn giới thiệu ngắn
            </label>
            <textarea
              id="site-hero-sub"
              rows={2}
              value={form.heroSubtitle}
              onChange={(e) => setForm({ ...form, heroSubtitle: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
            {errors.heroSubtitle && (
              <p className="text-xs text-rose-600 mt-1">{errors.heroSubtitle}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="site-hero-img"
                className="block text-xs font-semibold text-slate-700"
              >
                Ảnh bìa trang chủ
              </label>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold rounded-lg cursor-pointer">
                <ImagePlus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{uploadingHero ? 'Đang nén...' : 'Đổi ảnh từ máy'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleHeroFile}
                  className="sr-only"
                />
              </label>
            </div>
            <input
              id="site-hero-img"
              type="text"
              value={form.heroImageUrl}
              onChange={(e) => setForm({ ...form, heroImageUrl: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
            />
            <div className="h-36 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
              <ResilientImage src={form.heroImageUrl} alt="Xem trước ảnh bìa" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="site-phone-input"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Số điện thoại gọi xem phòng
              </label>
              <input
                id="site-phone-input"
                type="tel"
                value={form.publicPhone}
                onChange={(e) => setForm({ ...form, publicPhone: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
              />
              {errors.publicPhone && (
                <p className="text-xs text-rose-600 mt-1">{errors.publicPhone}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="site-zalo-input"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Số Zalo tư vấn
              </label>
              <input
                id="site-zalo-input"
                type="tel"
                value={form.publicZalo}
                onChange={(e) => setForm({ ...form, publicZalo: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
              />
              {errors.publicZalo && (
                <p className="text-xs text-rose-600 mt-1">{errors.publicZalo}</p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="site-office-input"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Địa chỉ văn phòng / Khu vực làm việc
            </label>
            <input
              id="site-office-input"
              type="text"
              value={form.officeAddress}
              onChange={(e) => setForm({ ...form, officeAddress: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
            {errors.officeAddress && (
              <p className="text-xs text-rose-600 mt-1">{errors.officeAddress}</p>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving || uploadingHero}
              className="px-5 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-60 rounded-lg cursor-pointer"
            >
              {saving ? 'Đang lưu...' : 'Lưu thông tin trang web'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
