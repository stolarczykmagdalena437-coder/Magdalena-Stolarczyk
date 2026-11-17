import React, { useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  CalendarCheck,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import {
  RoomFilterState,
  RoomFormInput,
  RoomListing,
  SiteSettings,
  SiteSettingsInput,
  ViewingBooking,
  ViewLayoutMode,
} from './types/rental';
import { DEFAULT_SITE_SETTINGS, SEED_ROOMS } from './data/seedData';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  testConnection,
} from './lib/firebase';
import {
  filterAndSortRooms,
  isAuthorizedOwner,
} from './utils/rentalLogic';
import { TopNav } from './components/TopNav';
import { HeroSection } from './components/HeroSection';
import { FilterBar } from './components/FilterBar';
import { RoomCard } from './components/RoomCard';
import { InteractiveMap } from './components/InteractiveMap';
import { RoomDetailModal } from './components/RoomDetailModal';
import { CostEstimatorSection } from './components/CostEstimatorSection';
import {
  AdminAccountModal,
  RoomEditorModal,
  SiteSettingsModal,
} from './components/OwnerAdminModals';

const DEFAULT_FILTERS: RoomFilterState = {
  searchQuery: '',
  propertyType: 'all',
  district: 'all',
  priceRange: 'all',
  areaRange: 'all',
  onlyAvailable: false,
  selectedAmenities: [],
  sortBy: 'newest',
};

const BOOKINGS_STORAGE_KEY = 'troxanh_customer_bookings_v1';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [cloudRooms, setCloudRooms] = useState<RoomListing[] | null>(null);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [hasCloudSettings, setHasCloudSettings] = useState(false);

  const [filters, setFilters] = useState<RoomFilterState>(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<ViewLayoutMode>('split');
  const [selectedMapRoomId, setSelectedMapRoomId] = useState<string | null>(
    SEED_ROOMS[0]?.id || null
  );
  const [detailRoom, setDetailRoom] = useState<RoomListing | null>(null);

  // Modals & Owner state
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [roomEditorOpen, setRoomEditorOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomListing | null>(null);
  const [siteSettingsOpen, setSiteSettingsOpen] = useState(false);
  const [savingData, setSavingData] = useState(false);
  const [syncingSeed, setSyncingSeed] = useState(false);
  const [deleteConfirmRoom, setDeleteConfirmRoom] = useState<RoomListing | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Saved viewing appointments on customer's browser
  const [myBookings, setMyBookings] = useState<ViewingBooking[]>(() => {
    try {
      const raw = localStorage.getItem(BOOKINGS_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as ViewingBooking[]) : [];
    } catch {
      return [];
    }
  });

  const isOwner = isAuthorizedOwner(currentUser);

  // Startup Firestore connectivity check + Auth state listener
  useEffect(() => {
    void testConnection();
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Load singleton public site settings (/siteSettings/public)
  useEffect(() => {
    const settingsRef = doc(db, 'siteSettings', 'public');
    const unsub = onSnapshot(
      settingsRef,
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setSiteSettings({
            brandName: String(d.brandName || DEFAULT_SITE_SETTINGS.brandName),
            heroTitle: String(d.heroTitle || DEFAULT_SITE_SETTINGS.heroTitle),
            heroSubtitle: String(d.heroSubtitle || DEFAULT_SITE_SETTINGS.heroSubtitle),
            heroImageUrl: String(d.heroImageUrl || DEFAULT_SITE_SETTINGS.heroImageUrl),
            agentName: String(d.agentName || DEFAULT_SITE_SETTINGS.agentName),
            agentRole: String(d.agentRole || DEFAULT_SITE_SETTINGS.agentRole),
            publicPhone: String(d.publicPhone || DEFAULT_SITE_SETTINGS.publicPhone),
            publicZalo: String(d.publicZalo || DEFAULT_SITE_SETTINGS.publicZalo),
            officeAddress: String(d.officeAddress || DEFAULT_SITE_SETTINGS.officeAddress),
          });
          setHasCloudSettings(true);
        } else {
          setSiteSettings(DEFAULT_SITE_SETTINGS);
          setHasCloudSettings(false);
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, 'siteSettings/public');
      }
    );
    return () => unsub();
  }, []);

  // Load rooms collection (Owner reads all; public visitors query isPublished == true)
  useEffect(() => {
    if (!authReady) return;

    const roomsCol = collection(db, 'rooms');
    const roomsQuery = isOwner
      ? roomsCol
      : query(roomsCol, where('isPublished', '==', true));

    const unsub = onSnapshot(
      roomsQuery,
      (snapshot) => {
        const items: RoomListing[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          const updatedTs = d.updatedAt instanceof Timestamp ? d.updatedAt.toMillis() : 0;
          return {
            id: docSnap.id,
            title: String(d.title || ''),
            propertyType: d.propertyType,
            district: String(d.district || ''),
            address: String(d.address || ''),
            rentPrice: Number(d.rentPrice || 0),
            electricityPrice: Number(d.electricityPrice || 0),
            waterPrice: Number(d.waterPrice || 0),
            waterUnit: d.waterUnit || 'nguoi',
            serviceFee: Number(d.serviceFee || 0),
            serviceNote: String(d.serviceNote || ''),
            areaSqm: Number(d.areaSqm || 0),
            depositMonths: Number(d.depositMonths || 1),
            maxOccupants: Number(d.maxOccupants || 2),
            floorLabel: String(d.floorLabel || ''),
            status: d.status || 'available',
            description: String(d.description || ''),
            images: Array.isArray(d.images) ? d.images.map(String) : [],
            amenities: Array.isArray(d.amenities) ? d.amenities.map(String) : [],
            lat: Number(d.lat || 10.788),
            lng: Number(d.lng || 106.702),
            isPublished: Boolean(d.isPublished),
            ownerUid: String(d.ownerUid || ''),
            updatedAtMs: updatedTs,
          };
        });
        setCloudRooms(items);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'rooms');
      }
    );

    return () => unsub();
  }, [authReady, isOwner]);

  const hasCloudRooms = cloudRooms !== null && cloudRooms.length > 0;
  const activeRooms: RoomListing[] = hasCloudRooms ? cloudRooms : SEED_ROOMS;

  const availableDistricts = useMemo(() => {
    const set = new Set<string>(activeRooms.map((r) => r.district));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [activeRooms]);

  const filteredRooms = useMemo(
    () => filterAndSortRooms(activeRooms, filters, isOwner),
    [activeRooms, filters, isOwner]
  );

  const availableRoomsCount = useMemo(
    () => activeRooms.filter((r) => r.isPublished && r.status === 'available').length,
    [activeRooms]
  );

  const minRentPrice = useMemo(() => {
    const prices = activeRooms.filter((r) => r.isPublished).map((r) => r.rentPrice);
    return prices.length > 0 ? Math.min(...prices) : 3_500_000;
  }, [activeRooms]);

  // Keep selectedMapRoomId pointing to a visible room if current filter excludes it
  useEffect(() => {
    if (filteredRooms.length === 0) {
      setSelectedMapRoomId(null);
      return;
    }
    if (!selectedMapRoomId || !filteredRooms.some((r) => r.id === selectedMapRoomId)) {
      setSelectedMapRoomId(filteredRooms[0].id);
    }
  }, [filteredRooms, selectedMapRoomId]);

  const showToast = (msg: string) => {
    setStatusBanner(msg);
    window.setTimeout(() => {
      setStatusBanner((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const handleGoogleLogin = async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? err.message
          : 'Đăng nhập Google không thành công. Vui lòng thử lại.'
      );
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setAdminModalOpen(false);
    showToast('Đã đăng xuất khỏi chế độ quản trị.');
  };

  const ensureSeedSyncedIfNeeded = async (uid: string) => {
    if (hasCloudRooms) return;
    const batch = writeBatch(db);
    for (const seed of SEED_ROOMS) {
      const ref = doc(db, 'rooms', seed.id);
      const { id: _id, ownerUid: _o, updatedAtMs: _u, ...fields } = seed;
      batch.set(ref, {
        ...fields,
        ownerUid: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'rooms');
    }
  };

  const handleSyncSeedToCloud = async () => {
    if (!currentUser || !isOwner) return;
    setSyncingSeed(true);
    try {
      await ensureSeedSyncedIfNeeded(currentUser.uid);
      showToast('Đã đồng bộ 6 phòng mẫu lên cơ sở dữ liệu đám mây.');
    } finally {
      setSyncingSeed(false);
    }
  };

  const handleSaveRoom = async (input: RoomFormInput, existingId?: string) => {
    if (!currentUser || !isOwner) {
      throw new Error('Chỉ tài khoản chủ quản trị mới được phép lưu phòng.');
    }
    setSavingData(true);
    try {
      if (!hasCloudRooms) {
        await ensureSeedSyncedIfNeeded(currentUser.uid);
      }

      if (existingId) {
        const roomRef = doc(db, 'rooms', existingId);
        const snap = await getDoc(roomRef);
        if (snap.exists()) {
          await updateDoc(roomRef, {
            ...input,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(roomRef, {
            ...input,
            ownerUid: currentUser.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        showToast('Đã cập nhật thông tin phòng thành công.');
      } else {
        const newId = `room-${Date.now()}`;
        const roomRef = doc(db, 'rooms', newId);
        await setDoc(roomRef, {
          ...input,
          ownerUid: currentUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setSelectedMapRoomId(newId);
        showToast('Đã đăng phòng mới lên trang web.');
      }
    } catch (err) {
      handleFirestoreError(
        err,
        existingId ? OperationType.UPDATE : OperationType.CREATE,
        existingId ? `rooms/${existingId}` : 'rooms'
      );
    } finally {
      setSavingData(false);
    }
  };

  const handleConfirmDeleteRoom = async () => {
    if (!deleteConfirmRoom || !currentUser || !isOwner) return;
    setSavingData(true);
    try {
      if (!hasCloudRooms) {
        await ensureSeedSyncedIfNeeded(currentUser.uid);
      }
      await deleteDoc(doc(db, 'rooms', deleteConfirmRoom.id));
      setDeleteConfirmRoom(null);
      showToast('Đã xóa phòng khỏi danh sách.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `rooms/${deleteConfirmRoom.id}`);
    } finally {
      setSavingData(false);
    }
  };

  const handleSaveSiteSettings = async (next: SiteSettingsInput) => {
    if (!currentUser || !isOwner) {
      throw new Error('Chỉ chủ quản trị mới được thay đổi thông tin trang web.');
    }
    setSavingData(true);
    const ref = doc(db, 'siteSettings', 'public');
    try {
      if (hasCloudSettings) {
        await updateDoc(ref, {
          ...next,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(ref, {
          ...next,
          ownerUid: currentUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      showToast('Đã cập nhật giao diện & thông tin liên hệ của trang web.');
    } catch (err) {
      handleFirestoreError(
        err,
        hasCloudSettings ? OperationType.UPDATE : OperationType.CREATE,
        'siteSettings/public'
      );
    } finally {
      setSavingData(false);
    }
  };

  const handleCreateBooking = (booking: ViewingBooking) => {
    setMyBookings((prev) => {
      const updated = [booking, ...prev].slice(0, 10);
      try {
        localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage quota issues
      }
      return updated;
    });
  };

  const handleFocusRoomOnMap = (room: RoomListing) => {
    setSelectedMapRoomId(room.id);
    if (viewMode === 'grid') {
      setViewMode('split');
    }
    const mapAnchor = document.getElementById('ban-do-vi-tri');
    mapAnchor?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-slate-900">
      <TopNav
        brandName={siteSettings.brandName}
        isOwner={isOwner}
        isLoggedIn={Boolean(currentUser)}
        onOpenAdminModal={() => setAdminModalOpen(true)}
      />

      {/* Owner Exclusive Management Workspace Bar (visible ONLY to stolarczykmagdalena437@gmail.com) */}
      {isOwner && (
        <div className="bg-slate-900 text-white border-b border-slate-800">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" aria-hidden="true" />
              <span>
                Chế độ Chủ quản trị: chỉ tài khoản của bạn mới thấy thanh công cụ thêm/sửa
                phòng và đổi ảnh web này.
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setEditingRoom(null);
                  setRoomEditorOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Đăng phòng mới</span>
              </button>
              <button
                type="button"
                onClick={() => setSiteSettingsOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold rounded-lg border border-slate-700 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Sửa thông tin Web</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {statusBanner && (
        <div
          role="status"
          className="bg-teal-800 text-white text-xs sm:text-sm text-center px-4 py-2.5 font-medium"
        >
          {statusBanner}
        </div>
      )}

      <main className="flex-1">
        <HeroSection
          settings={siteSettings}
          totalRoomsCount={activeRooms.filter((r) => r.isPublished).length}
          availableRoomsCount={availableRoomsCount}
          minRentPrice={minRentPrice}
          onExploreClick={() => {
            document
              .getElementById('danh-sach-phong')
              ?.scrollIntoView({ behavior: 'smooth' });
          }}
          onMapClick={() => {
            setViewMode('map');
            document
              .getElementById('ban-do-vi-tri')
              ?.scrollIntoView({ behavior: 'smooth' });
          }}
        />

        {/* Main Listings + Filter + Interactive Map Section */}
        <section id="danh-sach-phong" className="scroll-mt-20 py-12">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  Danh sách phòng trọ, studio &amp; căn hộ đang mở thuê
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Lọc nhanh theo khu vực, tầm giá, diện tích m² hoặc nhấp vào ghim giá trên
                  bản đồ để xem vị trí thực tế.
                </p>
              </div>
            </div>

            <FilterBar
              filters={filters}
              availableDistricts={availableDistricts}
              resultCount={filteredRooms.length}
              totalCount={activeRooms.filter((r) => isOwner || r.isPublished).length}
              viewMode={viewMode}
              onChangeFilters={(patch) =>
                setFilters((prev) => ({ ...prev, ...patch }))
              }
              onResetFilters={() => setFilters(DEFAULT_FILTERS)}
              onChangeViewMode={setViewMode}
            />

            {filteredRooms.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                <h3 className="font-display text-lg font-bold text-slate-900 mb-2">
                  Không tìm thấy phòng phù hợp với bộ lọc hiện tại
                </h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
                  Bạn hãy thử mở rộng khoảng giá thuê, chọn khu vực lân cận hoặc xóa bộ lọc
                  để xem toàn bộ danh sách phòng đang trống.
                </p>
                <button
                  type="button"
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold rounded-lg cursor-pointer"
                >
                  Xem lại tất cả phòng
                </button>
              </div>
            ) : viewMode === 'map' ? (
              <div id="ban-do-vi-tri">
                <InteractiveMap
                  rooms={filteredRooms}
                  selectedRoomId={selectedMapRoomId}
                  onSelectRoomPin={(room) => setSelectedMapRoomId(room.id)}
                  onOpenRoomDetail={(room) => setDetailRoom(room)}
                  heightClassName="h-[620px]"
                />
              </div>
            ) : viewMode === 'grid' ? (
              <div id="ban-do-vi-tri" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRooms.map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    isSelectedOnMap={room.id === selectedMapRoomId}
                    isOwner={isOwner}
                    onSelectDetail={setDetailRoom}
                    onFocusOnMap={handleFocusRoomOnMap}
                    onEditRoom={(r) => {
                      setEditingRoom(r);
                      setRoomEditorOpen(true);
                    }}
                    onDeleteRoom={setDeleteConfirmRoom}
                  />
                ))}
              </div>
            ) : (
              /* Default Split View: 2-column cards left + Sticky Interactive Map right */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {filteredRooms.map((room) => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      isSelectedOnMap={room.id === selectedMapRoomId}
                      isOwner={isOwner}
                      onSelectDetail={setDetailRoom}
                      onFocusOnMap={(r) => setSelectedMapRoomId(r.id)}
                      onEditRoom={(r) => {
                        setEditingRoom(r);
                        setRoomEditorOpen(true);
                      }}
                      onDeleteRoom={setDeleteConfirmRoom}
                    />
                  ))}
                </div>

                <div
                  id="ban-do-vi-tri"
                  className="scroll-mt-20 lg:col-span-5 lg:sticky lg:top-20"
                >
                  <InteractiveMap
                    rooms={filteredRooms}
                    selectedRoomId={selectedMapRoomId}
                    onSelectRoomPin={(room) => setSelectedMapRoomId(room.id)}
                    onOpenRoomDetail={(room) => setDetailRoom(room)}
                    heightClassName="h-[460px] lg:h-[640px]"
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Customer's Scheduled Viewings Strip (if they booked any appointment) */}
        {myBookings.length > 0 && (
          <section className="pb-12">
            <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CalendarCheck className="w-5 h-5 text-teal-700" aria-hidden="true" />
                  <h3 className="font-display text-lg font-bold text-slate-900">
                    Lịch hẹn xem phòng đã đặt của bạn ({myBookings.length})
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myBookings.map((bk) => (
                    <div
                      key={bk.id}
                      className="p-4 rounded-xl bg-[#F8F9FA] border border-slate-200 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-mono tabular-nums">
                        <span className="font-bold text-teal-800">{bk.bookingCode}</span>
                        <span className="text-slate-600">
                          {bk.preferredTime} · {bk.preferredDate}
                        </span>
                      </div>
                      <p className="font-semibold text-slate-900 text-sm line-clamp-1">
                        {bk.roomTitle}
                      </p>
                      <p className="text-slate-500 truncate">{bk.roomAddress}</p>
                      <p className="text-slate-600 pt-1">
                        Khách hẹn: {bk.customerName} ({bk.customerPhone})
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Interactive Monthly Utility Cost Calculator Section */}
        <CostEstimatorSection
          rooms={activeRooms.filter((r) => isOwner || r.isPublished)}
          onOpenRoomDetail={setDetailRoom}
        />

        {/* Agent Contact & Rental Process Section */}
        <section id="lien-he-tu-van" className="scroll-mt-20 py-14 bg-[#F8F9FA] border-t border-slate-200">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-3">
                <p className="text-xs font-semibold text-teal-800">
                  Hỗ trợ tìm phòng &amp; dẫn xem thực tế miễn phí
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight [text-wrap:balance]">
                  Cần tư vấn nhanh phòng trống đúng ngân sách của bạn?
                </h2>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-[62ch]">
                  Liên hệ trực tiếp với <strong>{siteSettings.agentName}</strong> để nhận
                  video quay thực tế từng góc phòng, kiểm tra tình trạng trống trong ngày và
                  hẹn giờ mở cửa xem phòng thuận tiện nhất.
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-1.5 pt-1">
                  <MapPin className="w-4 h-4 text-teal-700 shrink-0" aria-hidden="true" />
                  <span>Văn phòng giao dịch: {siteSettings.officeAddress}</span>
                </p>
              </div>

              <div className="lg:col-span-5 flex flex-col sm:flex-row lg:flex-col gap-3">
                <a
                  href={`tel:${siteSettings.publicPhone.replace(/\s+/g, '')}`}
                  className="flex items-center justify-center gap-2.5 px-6 py-3.5 bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  <Phone className="w-4 h-4" aria-hidden="true" />
                  <span>Gọi trực tiếp: {siteSettings.publicPhone}</span>
                </a>
                <a
                  href={`https://zalo.me/${siteSettings.publicZalo.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 px-6 py-3.5 bg-[#F8F9FA] hover:bg-slate-100 text-slate-900 border border-slate-200 text-sm font-semibold rounded-xl transition-colors"
                >
                  <MessageSquare className="w-4 h-4 text-teal-700" aria-hidden="true" />
                  <span>Nhắn Zalo nhận video phòng: {siteSettings.publicZalo}</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <span className="font-display font-bold text-slate-900">
              {siteSettings.brandName}
            </span>{' '}
            <span>· Minh bạch giá phòng, điện nước và vị trí thực tế.</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="#danh-sach-phong" className="hover:text-slate-900">
              Danh sách phòng
            </a>
            <a href="#ban-do-vi-tri" className="hover:text-slate-900">
              Bản đồ
            </a>
            <a href="#uoc-tinh-chi-phi" className="hover:text-slate-900">
              Tính chi phí
            </a>
            <button
              type="button"
              onClick={() => setAdminModalOpen(true)}
              className="hover:text-slate-900 cursor-pointer"
            >
              Quản trị viên
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <RoomDetailModal
        room={detailRoom}
        siteSettings={siteSettings}
        onClose={() => setDetailRoom(null)}
        onCreateBooking={handleCreateBooking}
      />

      <AdminAccountModal
        isOpen={adminModalOpen}
        currentUser={currentUser}
        isOwner={isOwner}
        authBusy={authBusy}
        authError={authError}
        hasCloudRooms={hasCloudRooms}
        syncingSeed={syncingSeed}
        onClose={() => setAdminModalOpen(false)}
        onGoogleLogin={handleGoogleLogin}
        onLogout={handleLogout}
        onOpenNewRoom={() => {
          setEditingRoom(null);
          setRoomEditorOpen(true);
        }}
        onOpenSiteSettings={() => setSiteSettingsOpen(true)}
        onSyncSeedToCloud={handleSyncSeedToCloud}
      />

      {isOwner && (
        <>
          <RoomEditorModal
            isOpen={roomEditorOpen}
            editingRoom={editingRoom}
            saving={savingData}
            onClose={() => {
              setRoomEditorOpen(false);
              setEditingRoom(null);
            }}
            onSaveRoom={handleSaveRoom}
          />

          <SiteSettingsModal
            isOpen={siteSettingsOpen}
            currentSettings={siteSettings}
            saving={savingData}
            onClose={() => setSiteSettingsOpen(false)}
            onSaveSettings={handleSaveSiteSettings}
          />
        </>
      )}

      {/* Owner Delete Confirmation Dialog */}
      {isOwner && deleteConfirmRoom && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-room-dialog-title"
        >
          <div className="bg-white max-w-sm w-full rounded-2xl border border-slate-200 p-6 shadow-xl">
            <h3
              id="delete-room-dialog-title"
              className="font-display text-base font-bold text-slate-900 mb-2"
            >
              Xác nhận xóa phòng trọ?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-5">
              Bạn có chắc muốn xóa <strong>{deleteConfirmRoom.title}</strong> khỏi trang
              web? Thao tác này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmRoom(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Giữ lại
              </button>
              <button
                type="button"
                disabled={savingData}
                onClick={handleConfirmDeleteRoom}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
              >
                {savingData ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
