# Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Exclusive Owner Write Authority**: Only the verified owner account (`stolarczykmagdalena437@gmail.com` with `email_verified == true` or trusted `/admins/{uid}` document) may create, update, or delete `/rooms/{roomId}` or `/siteSettings/public`.
2. **Public Query Enforcer**: Unauthenticated viewers and non-admin users may only `get` or `list` `/rooms/{roomId}` documents where `resource.data.isPublished == true`. Draft/hidden rooms (`isPublished == false`) are strictly invisible to non-admins.
3. **Immutable Provenance & Server Timestamps**: `ownerUid` and `createdAt` must match `request.auth.uid` and `request.time` on `create`, and must never change on `update`. `updatedAt` must equal `request.time` on every write.
4. **Strict Schema & Volumetric Guards**: Every write must pass `hasAll` + `hasOnly` key checks, bounded array checks (`images` 1..5, `amenities` 0..12), numeric bounds (`rentPrice`, `electricityPrice`, `waterPrice`, `serviceFee`, `areaSqm`, `lat`, `lng`), and string `.size()` limits to prevent shadow fields and resource exhaustion.
5. **No Privilege Escalation**: `/admins/{adminId}` forbids all client writes (`allow write: if false`).

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Room Creation**: `auth = null` attempting `create` on `/rooms/room-1` -> `PERMISSION_DENIED`.
2. **Spoofed Unverified Owner Email**: `auth = { uid: 'u1', email: 'stolarczykmagdalena437@gmail.com', email_verified: false }` attempting `update` on `/siteSettings/public` -> `PERMISSION_DENIED`.
3. **Verified Non-Owner Account Write**: `auth = { uid: 'u2', email: 'intruder@gmail.com', email_verified: true }` attempting `create` on `/rooms/room-2` -> `PERMISSION_DENIED`.
4. **Shadow Ghost Field Injection**: Owner sending valid room + `{ isFeaturedHack: true }` on `create` or `update` -> `PERMISSION_DENIED` via `keys().hasOnly(...)` and `affectedKeys().hasOnly(...)`.
5. **Owner UID Spoofing on Create**: Owner setting `ownerUid: 'someone-else'` during `create` -> `PERMISSION_DENIED`.
6. **Immortal Field Mutation (`createdAt` / `ownerUid`)**: Owner mutating `createdAt` or `ownerUid` during `update` -> `PERMISSION_DENIED`.
7. **Forged Client Timestamp**: Owner passing past/future `updatedAt` != `request.time` -> `PERMISSION_DENIED`.
8. **ID Poisoning Attack**: Creating `/rooms/invalid$path#id` or >128-char ID -> `PERMISSION_DENIED` via `isValidId()`.
9. **Array Exhaustion (`images` > 5 or empty)**: Sending `images: []` or 20 images -> `PERMISSION_DENIED`.
10. **Value Poisoning on Whitelisted Update Key**: Updating `status` to `'hacked'` or `rentPrice` to `-5000` -> `PERMISSION_DENIED` via `isValidRoomListing(incoming())` wrapping `allow update`.
11. **Unfiltered Draft Scraping (`list`)**: Public client running unfiltered `getDocs(collection(db, 'rooms'))` when unpublished rooms exist -> `PERMISSION_DENIED` via `existing().isPublished == true`.
12. **Self-Admin Escalation**: Authenticated user writing `/admins/u2` -> `PERMISSION_DENIED`.

## 3. Red Team Conflict Report
- **`/rooms/{roomId}`**:
  - Identity Spoofing: Blocked (`incoming().ownerUid == request.auth.uid` on create; `incoming().ownerUid == existing().ownerUid` on update; `isAdmin()` enforces verified owner email).
  - Shadow Update: Blocked (`affectedKeys().hasOnly(...)` + `isValidRoomListing(incoming())`).
  - Resource Poisoning: Blocked (`isValidId(roomId)` + `.size()` bounds on every string & array).
  - Query Trust: Enforced (`allow list: if existing().isPublished == true || isAdmin();`).
- **`/siteSettings/{settingId}`**:
  - Singleton Lock: Locked strictly to `settingId == 'public'`, `allow list: if false`, `allow delete: if false`.
  - Phone/Zalo Regex Validation: Enforced identically in blueprint, rules, and frontend (`^[0-9+\\-\\s().]{8,20}$`).
- **`/admins/{adminId}`**:
  - Escalation: Blocked (`allow create, update, delete: if false; allow list: if false;`).
