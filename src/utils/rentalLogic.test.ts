import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMonthlyEstimate,
  filterAndSortRooms,
  formatElectricityRate,
  formatMillionsCompact,
  formatWaterRate,
  isAuthorizedOwner,
  validateRoomInput,
  validateSiteSettingsInput,
} from './rentalLogic';
import { DEFAULT_SITE_SETTINGS, SEED_ROOMS } from '../data/seedData';
import { RoomFilterState } from '../types/rental';

const BASE_FILTERS: RoomFilterState = {
  searchQuery: '',
  propertyType: 'all',
  district: 'all',
  priceRange: 'all',
  areaRange: 'all',
  onlyAvailable: false,
  selectedAmenities: [],
  sortBy: 'newest',
};

test('Vietnamese diacritic-insensitive search finds Thảo Điền and Bình Thạnh listings', () => {
  const thaoDienResults = filterAndSortRooms(SEED_ROOMS, {
    ...BASE_FILTERS,
    searchQuery: 'thao dien',
  });
  assert.equal(thaoDienResults.length, 1);
  assert.equal(thaoDienResults[0].id, 'studio-thao-dien-ban-cong');

  const binhThanhResults = filterAndSortRooms(SEED_ROOMS, {
    ...BASE_FILTERS,
    searchQuery: 'hang xanh',
  });
  assert.equal(binhThanhResults.length, 1);
  assert.equal(binhThanhResults[0].district, 'Quận Bình Thạnh');
});

test('Multi-criteria filtering by property type, price range, area, and availability works accurately', () => {
  const affordableAvailable = filterAndSortRooms(SEED_ROOMS, {
    ...BASE_FILTERS,
    priceRange: '4m-6m',
    onlyAvailable: true,
    sortBy: 'price-asc',
  });
  // Duplex Bình Thạnh (5.2m, available) matches; Studio Q3 (5.8m, 'soon') excluded by onlyAvailable
  assert.equal(affordableAvailable.length, 1);
  assert.equal(affordableAvailable[0].id, 'duplex-binh-thanh-hang-xanh');

  const largeCondos = filterAndSortRooms(SEED_ROOMS, {
    ...BASE_FILTERS,
    areaRange: 'over-50',
  });
  assert.equal(largeCondos.length, 1);
  assert.equal(largeCondos[0].propertyType, 'can-ho-2pn');
});

test('Monthly utility cost calculator handles per-person and per-cubic-meter water and state electricity', () => {
  const studio = SEED_ROOMS[0]; // 6.5m rent, 3800/kWh, 100k/person, 180k service, 1 month deposit
  const est1 = calculateMonthlyEstimate(studio, {
    kwhPerMonth: 120,
    occupants: 2,
    waterCubicMeters: 8,
  });
  assert.equal(est1.electricity, 120 * 3_800);
  assert.equal(est1.water, 2 * 100_000);
  assert.equal(est1.service, 180_000);
  assert.equal(est1.totalMonthly, 6_500_000 + 456_000 + 200_000 + 180_000);
  assert.equal(est1.depositAmount, 6_500_000);

  const condo = SEED_ROOMS[4]; // 11.5m rent, 0 (state rate 2800), 18k/m3, 450k service, 2 months deposit
  const est2 = calculateMonthlyEstimate(condo, {
    kwhPerMonth: 150,
    occupants: 3,
    waterCubicMeters: 10,
  });
  assert.equal(est2.electricity, 150 * 2_800);
  assert.equal(est2.water, 10 * 18_000);
  assert.equal(est2.depositAmount, 23_000_000);
});

test('Owner RBAC strictly authorizes only verified runtime owner email', () => {
  assert.equal(
    isAuthorizedOwner({
      email: 'stolarczykmagdalena437@gmail.com',
      emailVerified: true,
    }),
    true
  );
  assert.equal(
    isAuthorizedOwner({
      email: 'stolarczykmagdalena437@gmail.com',
      emailVerified: false,
    }),
    false
  );
  assert.equal(
    isAuthorizedOwner({
      email: 'other.agent@gmail.com',
      emailVerified: true,
    }),
    false
  );
  assert.equal(isAuthorizedOwner(null), false);
});

test('Room and SiteSettings validators enforce blueprint constraints and formatting helpers format accurately', () => {
  assert.equal(formatMillionsCompact(5_200_000), '5,2 tr');
  assert.equal(formatElectricityRate(0), 'Giá nhà nước');
  assert.equal(formatWaterRate(100_000, 'nguoi'), '100.000đ/người');

  const validSeed = validateRoomInput(SEED_ROOMS[0]);
  assert.equal(validSeed.valid, true);

  const invalidRoom = validateRoomInput({
    ...SEED_ROOMS[0],
    title: 'Ngắn',
    rentPrice: 100_000,
    images: [],
    lat: 45.0,
  });
  assert.equal(invalidRoom.valid, false);
  assert.ok(invalidRoom.errors.title);
  assert.ok(invalidRoom.errors.rentPrice);
  assert.ok(invalidRoom.errors.images);
  assert.ok(invalidRoom.errors.lat);

  const validSite = validateSiteSettingsInput(DEFAULT_SITE_SETTINGS);
  assert.equal(validSite.valid, true);

  const invalidSite = validateSiteSettingsInput({
    ...DEFAULT_SITE_SETTINGS,
    publicPhone: 'abc',
  });
  assert.equal(invalidSite.valid, false);
  assert.ok(invalidSite.errors.publicPhone);
});
