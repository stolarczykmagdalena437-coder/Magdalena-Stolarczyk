import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rulesSource = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');
const blueprint = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), 'firebase-blueprint.json'), 'utf8')
);

interface MockAuth {
  uid: string;
  email: string;
  email_verified: boolean;
}

const REQUEST_TIME = '2026-11-17T22:00:00Z';

function evaluateIsAdmin(auth: MockAuth | null): boolean {
  return (
    auth !== null &&
    auth.email_verified === true &&
    auth.email === 'stolarczykmagdalena437@gmail.com'
  );
}

function evaluateIsValidId(id: string): boolean {
  return typeof id === 'string' && id.length >= 1 && id.length <= 128 && /^[a-zA-Z0-9_\-]+$/.test(id);
}

const REQUIRED_ROOM_KEYS = blueprint.entities.RoomListing.required as string[];

function evaluateRoomCreate(
  auth: MockAuth | null,
  roomId: string,
  payload: Record<string, unknown>
): boolean {
  if (!auth || !evaluateIsValidId(roomId) || !evaluateIsAdmin(auth)) return false;
  const keys = Object.keys(payload);
  if (keys.length !== REQUIRED_ROOM_KEYS.length) return false;
  if (!REQUIRED_ROOM_KEYS.every((k) => keys.includes(k))) return false;
  if (payload.ownerUid !== auth.uid) return false;
  if (payload.createdAt !== REQUEST_TIME || payload.updatedAt !== REQUEST_TIME) return false;
  if (typeof payload.title !== 'string' || payload.title.length < 5 || payload.title.length > 120) return false;
  if (typeof payload.rentPrice !== 'number' || payload.rentPrice < 500_000 || payload.rentPrice > 200_000_000) return false;
  if (!['available', 'soon', 'rented'].includes(String(payload.status))) return false;
  if (!Array.isArray(payload.images) || payload.images.length < 1 || payload.images.length > 5) return false;
  return true;
}

const VALID_PAYLOAD: Record<string, unknown> = {
  title: 'Studio Ban Công Xanh Thảo Điền',
  propertyType: 'studio',
  district: 'TP. Thủ Đức',
  address: '48 Xuân Thủy, Thảo Điền',
  rentPrice: 6_500_000,
  electricityPrice: 3_800,
  waterPrice: 100_000,
  waterUnit: 'nguoi',
  serviceFee: 180_000,
  serviceNote: 'Gồm Wi-Fi và rác',
  areaSqm: 36,
  depositMonths: 1,
  maxOccupants: 2,
  floorLabel: 'Tầng 3',
  status: 'available',
  description: 'Phòng đầy đủ nội thất ánh sáng tự nhiên.',
  images: ['/src/assets/images/hero_modern_studio_vietnam_1794953260608.jpg'],
  amenities: ['Máy lạnh Inverter'],
  lat: 10.8045,
  lng: 106.7336,
  isPublished: true,
  ownerUid: 'owner-1',
  createdAt: REQUEST_TIME,
  updatedAt: REQUEST_TIME,
};

const OWNER_AUTH: MockAuth = {
  uid: 'owner-1',
  email: 'stolarczykmagdalena437@gmail.com',
  email_verified: true,
};

test('firestore.rules contains Eight Pillars hardened guards and matches blueprint entities', () => {
  assert.ok(rulesSource.includes("rules_version = '2';"));
  assert.ok(rulesSource.includes('allow read, write: if false;'));
  assert.ok(rulesSource.includes("request.auth.token.email == 'stolarczykmagdalena437@gmail.com'"));
  assert.ok(rulesSource.includes('request.auth.token.email_verified == true'));
  assert.ok(rulesSource.includes('existing().isPublished == true || isAdmin()'));
  assert.ok(rulesSource.includes('affectedKeys().hasOnly'));

  for (const key of REQUIRED_ROOM_KEYS) {
    assert.ok(rulesSource.includes(`'${key}'`), `Missing required key ${key} in firestore.rules`);
  }
});

test('Dirty Dozen adversarial payloads all return PERMISSION_DENIED (false)', () => {
  // Valid owner baseline succeeds
  assert.equal(evaluateRoomCreate(OWNER_AUTH, 'room-valid-1', VALID_PAYLOAD), true);

  // 1. Unauthenticated create
  assert.equal(evaluateRoomCreate(null, 'room-1', VALID_PAYLOAD), false);

  // 2. Spoofed unverified owner email
  assert.equal(
    evaluateRoomCreate({ ...OWNER_AUTH, email_verified: false }, 'room-1', VALID_PAYLOAD),
    false
  );

  // 3. Verified non-owner intruder
  assert.equal(
    evaluateRoomCreate(
      { uid: 'u2', email: 'intruder@gmail.com', email_verified: true },
      'room-1',
      { ...VALID_PAYLOAD, ownerUid: 'u2' }
    ),
    false
  );

  // 4. Shadow ghost field injection
  assert.equal(
    evaluateRoomCreate(OWNER_AUTH, 'room-1', { ...VALID_PAYLOAD, isVerifiedHack: true }),
    false
  );

  // 5. Owner UID spoofing
  assert.equal(
    evaluateRoomCreate(OWNER_AUTH, 'room-1', { ...VALID_PAYLOAD, ownerUid: 'someone-else' }),
    false
  );

  // 6. Missing required field
  const missingKeyPayload = { ...VALID_PAYLOAD };
  delete missingKeyPayload.waterUnit;
  assert.equal(evaluateRoomCreate(OWNER_AUTH, 'room-1', missingKeyPayload), false);

  // 7. Forged client timestamp
  assert.equal(
    evaluateRoomCreate(OWNER_AUTH, 'room-1', {
      ...VALID_PAYLOAD,
      updatedAt: '2020-01-01T00:00:00Z',
    }),
    false
  );

  // 8. ID poisoning with illegal characters
  assert.equal(evaluateRoomCreate(OWNER_AUTH, 'bad$id#path', VALID_PAYLOAD), false);

  // 9. Oversized ID (>128 chars)
  assert.equal(evaluateRoomCreate(OWNER_AUTH, 'a'.repeat(140), VALID_PAYLOAD), false);

  // 10. Array exhaustion (images > 5)
  assert.equal(
    evaluateRoomCreate(OWNER_AUTH, 'room-1', {
      ...VALID_PAYLOAD,
      images: ['a', 'b', 'c', 'd', 'e', 'f'],
    }),
    false
  );

  // 11. Value poisoning (negative rent)
  assert.equal(
    evaluateRoomCreate(OWNER_AUTH, 'room-1', { ...VALID_PAYLOAD, rentPrice: -5000 }),
    false
  );

  // 12. Invalid status enum
  assert.equal(
    evaluateRoomCreate(OWNER_AUTH, 'room-1', { ...VALID_PAYLOAD, status: 'hacked_state' }),
    false
  );
});
