# JBP Agrawal Sabha - Admin Panel Documentation (`ADMIN_README.md`)

This document provides a comprehensive, itemized feature-by-feature specification of the **JBP Agrawal Sabha Admin Panel** (`jbp-admin`), traces its full integration with the **Main Mobile App** (`jbp-agrawal-sabha`), and details database relationships, file maps, and known architectural gaps. All details herein are verified directly from source code inspection.

---

## 🏗 Project Overview & Technical Stack

- **Framework**: Next.js 16.1.4 (App Router) with React 19 & TypeScript (`tsconfig.json`)
- **Styling & Components**: Tailwind CSS v4 (`@tailwindcss/postcss`), Radix UI primitives (`@radix-ui/*`), Lucide React icons (`lucide-react`), React Hot Toast (`react-hot-toast`)
- **UI Helper**: Class merging utility `cn()` in [`lib/utils.ts`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/lib/utils.ts) via `clsx` & `tailwind-merge`
- **Backend & Database**: Supabase BaaS (PostgreSQL + Supabase Auth) via `@supabase/supabase-js` (`^2.86.0`) & `@supabase/ssr`
- **File & Image Storage**: Cloudinary REST API (`ds0bvuv2p`) & Supabase Storage
- **Data Analytics & Tools**: Recharts (`recharts` ^3.5.1 for Pie & Line charts), XLSX (`xlsx` ^0.18.5 for Excel import), jsPDF (`jspdf` & `jspdf-autotable`)

---

## 🖼 Image & File Management Architecture

### 1. Storage Providers & Configuration
- **Primary Media Provider**: **Cloudinary** (Cloud Name: `ds0bvuv2p`).
  - Unsigned Upload Presets: `jbp-agrawal-uploads` (configured in `.env`) & `jbp_events`.
  - Target API Endpoint: `https://api.cloudinary.com/v1_1/ds0bvuv2p/image/upload`
- **Secondary / Static Provider**: **Supabase Storage** (`https://mtudvgoueeldtnrccvyw.supabase.co/storage/v1/object/public/...`).
- **Allowed Next.js Image Hostnames** (in [`jbp-admin/next.config.js`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/next.config.js)):
  - `res.cloudinary.com`
  - `mtudvgoueeldtnrccvyw.supabase.co`

---

### 2. Image Upload Flows & Functions

#### A. Admin UI Event Poster Upload
- **File**: [`jbp-admin/app/dashboard/events/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/dashboard/events/page.tsx) (`handleImageUpload`)
- **Flow**:
  1. Admin selects a file using `<input type="file" accept="image/*">`.
  2. Client validates file MIME type starts with `image/` and file size <= 5MB.
  3. Constructs `FormData` with `file` and `upload_preset: 'jbp_events'`.
  4. Makes `POST` fetch request to `https://api.cloudinary.com/v1_1/ds0bvuv2p/image/upload`.
  5. Obtains `data.secure_url` and updates local component state (`newEvent.poster_url` or `editEvent.poster_url`).
  6. On save, writes URL to `events.poster_url` column in Supabase PostgreSQL.

#### B. Admin UI Payment QR Code Upload
- **File**: [`jbp-admin/app/dashboard/settings/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/dashboard/settings/page.tsx) (`handleQrUpload`)
- **Flow**:
  1. Admin selects QR code image <= 5MB.
  2. Constructs `FormData` with `file`, `upload_preset: 'jbp_events'`, and `folder: 'jbp-agrawal-sabha/qr-codes'`.
  3. Sends `POST` request to Cloudinary REST API.
  4. Obtains `data.secure_url` and stores it in app settings state (`upiQrCode`).

#### C. Main Mobile App Image Uploads
- **File**: [`jbp-agrawal-sabha/src/config/cloudinary.js`](file:///c:/Users/vedag/Desktop/final_app/jbp-agrawal-sabha/src/config/cloudinary.js) (`uploadImageToCloudinary`)
- **Flow**:
  1. React Native constructs `FormData` with object `{ uri, type, name }`, `upload_preset`, `folder: 'jbp-agrawal/${folder}'`, `cloud_name`.
  2. Executes `POST` request to Cloudinary upload endpoint.
  3. Returns `{ success: true, url: result.secure_url, publicId: result.public_id }`.

---

### 3. Database Tables & Fields Storing Image URLs

| Database Table | Field Name | Data Type | Description |
| :--- | :--- | :--- | :--- |
| `events` | `poster_url` | `text` (`null`) | Public URL of event poster/banner image |
| `users` | `photo_url` | `text` (`null`) | Public URL of user profile avatar photo |
| `matrimonial_profiles` | `photos` | `jsonb` (array of `text`) | Array of candidate profile photo URLs |
| `matrimonial_profiles` | `horoscope_url` | `text` (`null`) | Public URL of candidate horoscope image |
| `donations` | `receipt_url` | `text` (`null`) | Public URL of payment receipt screenshot |
| App Settings State | `upiQrCode` | `string` | Public URL of donation UPI payment QR Code |

---

### 4. How Uploaded Images Are Displayed in Main Mobile App

- **Event Posters**: Rendered via `<Image source={{ uri: event.poster_url }} />` in [`jbp-agrawal-sabha/src/screens/Events/EventsScreen.js`](file:///c:/Users/vedag/Desktop/final_app/jbp-agrawal-sabha/src/screens/Events/EventsScreen.js) and [`EventDetailScreen.js`](file:///c:/Users/vedag/Desktop/final_app/jbp-agrawal-sabha/src/screens/Events/EventDetailScreen.js).
- **Matrimonial Photos**: Rendered via `<Image source={{ uri: profile.photos[0] }} />` in [`jbp-agrawal-sabha/src/screens/Matrimonial/MatrimonialListScreen.js`](file:///c:/Users/vedag/Desktop/final_app/jbp-agrawal-sabha/src/screens/Matrimonial/MatrimonialListScreen.js) and gallery view in [`MatrimonialDetailScreen.js`](file:///c:/Users/vedag/Desktop/final_app/jbp-agrawal-sabha/src/screens/Matrimonial/MatrimonialDetailScreen.js).
- **User Avatars**: Rendered via `<Image source={{ uri: user.photo_url }} />` in [`DirectoryScreen.js`](file:///c:/Users/vedag/Desktop/final_app/jbp-agrawal-sabha/src/screens/Profile/DirectoryScreen.js) and [`ProfileScreen.js`](file:///c:/Users/vedag/Desktop/final_app/jbp-agrawal-sabha/src/screens/Profile/ProfileScreen.js); falls back to initial letter avatar icon if `null`.
- **Donation Payment QR Code**: Rendered in [`DonationsScreen.js`](file:///c:/Users/vedag/Desktop/final_app/jbp-agrawal-sabha/src/screens/Donations/DonationsScreen.js).

---

### 5. Existing Image Update & Delete Behavior

- **Update Behavior**:
  - In Admin UI ([`events/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/dashboard/events/page.tsx) & [`settings/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/dashboard/settings/page.tsx)), re-uploading an image replaces the stored HTTPS URL string in state.
  - Clicking "Remove Image" sets the state and database field (`poster_url` or `upiQrCode`) to `null` or `''`.
- **Deletion Behavior (Cloudinary & Database)**:
  - Database row fields are updated to `null` when an image is detached.
  - **Cloudinary Asset Retention**: Physical image files on Cloudinary servers are **not deleted** when removed from the database (documented in [`cloudinary.js`](file:///c:/Users/vedag/Desktop/final_app/jbp-agrawal-sabha/src/config/cloudinary.js): `deleteImageFromCloudinary` logs "Delete not implemented - image retained"). Because client-side unsigned uploads do not use Cloudinary API secrets, asset destruction requires server-side admin API calls or manual dashboard cleanup.

---

## 🔍 Detailed Feature Inspection & Documentation

### 1. 🔐 Admin Authentication & Role Enforcement
* **What the admin can do**:
  * Sign in using email and password credentials.
  * System automatically verifies if the authenticated user has `is_admin === true` in the `users` database table.
  * If `is_admin` is false, access is blocked, session is terminated via `signOut()`, and user is shown an unauthorized error.
  * Sign out via sidebar logout button.
  * Non-authenticated users accessing `/dashboard/*` are redirected to `/login`.
* **UI/Page Responsible**:
  * Login Page: [`app/login/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/login/page.tsx)
  * Root Redirect: [`app/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/page.tsx)
  * Access Denied Notice: [`app/unauthorized/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/unauthorized/page.tsx)
* **API/Backend Responsible**:
  * Supabase Auth SDK (`supabase.auth.signInWithPassword`, `supabase.auth.signOut`, `supabase.auth.getUser`)
* **Database/Storage Involved**:
  * `users` table (`id`, `is_admin`, `full_name`, `email`, `phone`)
  * Supabase Auth system (`auth.users`)
* **Important Files**:
  * [`app/login/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/login/page.tsx)
  * [`middleware.ts`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/middleware.ts)
  * [`lib/supabase.ts`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/lib/supabase.ts)

---

### 2. 📊 Dashboard Overview & Community Analytics
* **What the admin can do**:
  * View summary metrics: Total Users, Verified Users, Pending Approvals, Total Events, Matrimonial Profiles, Total Jobs, Total Donations sum.
  * View interactive Pie Chart: Pending Approvals broken down by category (Matrimonial, Events, Jobs).
  * View interactive Pie Chart: User Verification Status ratio (Verified vs Unverified).
  * View real-time recent activity panels (Recent 5 Users, Recent 5 Events, Recent 5 Donations).
* **UI/Page Responsible**:
  * Dashboard Page: [`app/dashboard/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/dashboard/page.tsx)
* **API/Backend Responsible**:
  * Supabase Client exact count queries (`head: true`), aggregation queries, and sorted limits (`.order().limit(5)`)
* **Database/Storage Involved**:
  * `users`, `matrimonial_profiles`, `events`, `jobs`, `donations` tables
* **Important Files**:
  * [`app/dashboard/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/dashboard/page.tsx)
  * [`lib/supabase.ts`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/lib/supabase.ts)

---

### 3. 👥 User / Member Management
* **What the admin can do**:
  * Search registered users by Name, Phone, or Email.
  * Filter users by Verification Status (`all`, `verified`, `unverified`) and Role (`all`, `admin`, `user`).
  * Toggle Verification status (`is_verified` boolean) for any member.
  * Promote any member to Admin or revoke Admin status (`is_admin` boolean).
  * Open detailed modal to inspect user profile (photo, occupation, location, contact, registration date).
  * Permanently delete user accounts.
* **UI/Page Responsible**:
  * User Management Page: [`app/dashboard/users/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/dashboard/users/page.tsx)
* **API/Backend Responsible**:
  * Supabase Client (`.from('users').select()`, `.update()`, `.delete()`)
* **Database/Storage Involved**:
  * `users` table
* **Important Files**:
  * [`app/dashboard/users/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/dashboard/users/page.tsx)
  * [`lib/supabase.ts`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/lib/supabase.ts)

---

### 4. 💍 Matrimonial Profiles Management
* **What the admin can do**:
  * Search matrimonial profiles by candidate Name or City.
  * Filter by Status (`pending`, `approved`, `rejected`) and Gender (`all`, `male`, `female`).
  * Open full review modal displaying candidate photos, age, gotra, education, occupation, city, family details, and additional info.
  * Approve pending profiles (`status = 'approved'`, records `approved_by`).
  * Reject pending profiles (`status = 'rejected'`, requiring mandatory admin notes).
  * Permanently delete matrimonial profiles.
* **UI/Page Responsible**:
  * Matrimonial Page: [`app/dashboard/matrimonial/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/dashboard/matrimonial/page.tsx)
* **API/Backend Responsible**:
  * Supabase Client (`.from('matrimonial_profiles').select('*, users!matrimonial_profiles_user_id_fkey(...)')`, `.update()`, `.delete()`)
* **Database/Storage Involved**:
  * `matrimonial_profiles` table, `users` table (`user_id` FK relation), Cloudinary / Supabase Storage for photos
* **Important Files**:
  * [`app/dashboard/matrimonial/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/dashboard/matrimonial/page.tsx)
  * [`lib/supabase.ts`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/lib/supabase.ts)

---

### 5. 📅 Events & Announcements Management
* **What the admin can do**:
  * Create new events/announcements (title, description, event date, type: `event`/`festival`/`meeting`, announcement flag `is_announcement`, poster image upload).
  * Edit existing event details and update poster image.
  * Search events by Title or Creator.
  * Filter events by Status (`pending`, `approved`, `rejected`) and Type.
  * Toggle Featured status (`is_featured`) and Visibility to mobile users (`is_visible`).
  * Modal review for approving/rejecting user-submitted community events.
  * Delete events.
* **UI/Page Responsible**:
  * Events Page: [`app/dashboard/events/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/dashboard/events/page.tsx)
* **API/Backend Responsible**:
  * Supabase Client (`.from('events').select('*, posted_user:users!events_posted_by_fkey(...)')`, `.insert()`, `.update()`, `.delete()`)
  * Cloudinary Multipart REST API (`https://api.cloudinary.com/v1_1/ds0bvuv2p/image/upload`)
* **Database/Storage Involved**:
  * `events` table, `users` table (`posted_by` FK relation), Cloudinary Storage (`jbp_events` preset)
* **Important Files**:
  * [`app/dashboard/events/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/dashboard/events/page.tsx)
  * [`lib/supabase.ts`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/lib/supabase.ts)
  * [`next.config.js`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/next.config.js)

---

### 6. 💼 Job Postings Management
* **What the admin can do**:
  * Search job postings by Job Title or Location.
  * Filter postings by Status (`pending`, `approved`, `rejected`).
  * Open job review modal displaying description, location, contact info, poster details, and date.
  * Approve pending jobs (`status = 'approved'`).
  * Reject jobs (`status = 'rejected'`) with optional admin review notes.
  * Delete job postings.
* **UI/Page Responsible**:
  * Jobs Page: [`app/dashboard/jobs/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/dashboard/jobs/page.tsx)
* **API/Backend Responsible**:
  * Supabase Client (`.from('jobs').select('*, users!jobs_posted_by_fkey(...)')`, `.update()`, `.delete()`)
* **Database/Storage Involved**:
  * `jobs` table, `users` table (`posted_by` FK relation)
* **Important Files**:
  * [`app/dashboard/jobs/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/dashboard/jobs/page.tsx)
  * [`lib/supabase.ts`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/lib/supabase.ts)

---

### 7. 🩸 Blood Donors Directory
* **What the admin can do**:
  * View donor metrics: Total Donors, Available Donors, Cities count, Blood Groups count.
  * Search donors by Name, Phone, or City.
  * Filter by Blood Group (`A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`), City, and Availability.
  * Toggle Donor Availability status (`is_available`).
  * Update last donation date (`last_donation_date`).
  * View detailed donor modal.
  * Export filtered blood donor directory to a CSV file (`blood-donors-[date].csv`).
  * Delete donor records.
* **UI/Page Responsible**:
  * Blood Donors Page: [`app/dashboard/blood-donors/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/dashboard/blood-donors/page.tsx)
* **API/Backend Responsible**:
  * Supabase Client (`.from('blood_donors').select('*, users(...)')`, `.update()`, `.delete()`)
  * Browser Blob API for CSV generation and client download
* **Database/Storage Involved**:
  * `blood_donors` table, `users` table (`user_id` FK relation)
* **Important Files**:
  * [`app/dashboard/blood-donors/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/dashboard/blood-donors/page.tsx)
  * [`lib/supabase.ts`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/lib/supabase.ts)

---

### 8. 💰 Donations Management & Financial Tracking
* **What the admin can do**:
  * View financial metrics: Total Amount, Total Donors, Average Donation, Current Month Total.
  * View monthly donation trend line chart powered by Recharts (last 6 months).
  * Search donations by Donor Name, Transaction ID, or UPI Reference.
  * Filter by Date Range (`From` / `To`) and Verification status (`all`, `verified`, `unverified`).
  * Open detailed modal displaying payment receipt link, transaction ID, UPI reference, and verification status.
  * Mark donation verified/unverified (`is_verified`, `verified_by`, `verified_at`, `admin_notes`).
  * Export donation records to a CSV file (`donations-[date].csv`).
  * Delete donation records.
* **UI/Page Responsible**:
  * Donations Page: [`app/dashboard/donations/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/dashboard/donations/page.tsx)
* **API/Backend Responsible**:
  * Supabase Client (`.from('donations').select()`, `.update()`, `.delete()`)
  * Browser Blob API for CSV export
* **Database/Storage Involved**:
  * `donations` table, Supabase/External Storage for receipt URLs
* **Important Files**:
  * [`app/dashboard/donations/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/dashboard/donations/page.tsx)
  * [`lib/supabase.ts`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/lib/supabase.ts)

---

### 9. 🎖 Post Holders (Executive Office Bearers)
* **What the admin can do**:
  * View grid of community office bearers and leadership.
  * Add new post holder (select existing verified user or manual entry, pick designation: President, Senior Vice President, Vice President, Women Vice President, Secretary, Treasurer, Joint Secretary, Secretary (Publicity), Deputy Secretary, set term start/end dates, bio, and display order).
  * Edit post holder details and display order.
  * Delete post holders.
* **UI/Page Responsible**:
  * Post Holders Page: [`app/dashboard/post-holders/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/dashboard/post-holders/page.tsx)
* **API/Backend Responsible**:
  * Supabase Client (`.from('post_holders').select('*, users(...)')`, `.insert()`, `.update()`, `.delete()`)
* **Database/Storage Involved**:
  * `post_holders` table, `users` table (`user_id` FK relation)
* **Important Files**:
  * [`app/dashboard/post-holders/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/dashboard/post-holders/page.tsx)
  * [`lib/supabase.ts`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/lib/supabase.ts)

---

### 10. 💌 Contact Requests Tracking (Matrimonial)
* **What the admin can do**:
  * View request metrics: Total, Pending, Accepted, Rejected.
  * Filter requests by Status.
  * See **which** profile the requester sent: one of their own matrimonial profiles, or their personal details ("Other / Personal Profile").
  * **Accept** or **Reject** a request, with an optional note. The decision is written by `public.review_contact_request()` (admin-only).
  * Every decision is written to `admin_logs` (`contact_request_accepted` / `contact_request_rejected`).
* **Spam control**: one open request per (requester, target profile), enforced by a UNIQUE index in the database.
* **UI/Page Responsible**:
  * Contact Requests Page: [`app/dashboard/contact-requests/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/dashboard/contact-requests/page.tsx)
* **API/Backend Responsible**:
  * [`app/api/admin/contact-requests/route.ts`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/api/admin/contact-requests/route.ts) — GET list, PATCH accept/reject
  * `public.get_contact_requests_for_admin()` — admin-only RPC
* **Database/Storage Involved**:
  * `contact_requests` table (`requester_profile_id`, `use_personal_profile`, `personal_*`, `status`, `reviewed_at`, `reviewed_by`, `admin_notes`)
* **Important Files**:
  * [`app/dashboard/contact-requests/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/dashboard/contact-requests/page.tsx)
  * [`lib/supabase.ts`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/lib/supabase.ts)

---

### 10a. 🔒 Matrimonial Phone Privacy
* **What it is**: a permanent "Hide my phone number from members" switch on each matrimonial profile.
  * It is **on by default for a female candidate** and off for others.
  * The owner can change it at any time, including on an already-approved profile (the only field that stays editable after approval).
* **How it is enforced**: RLS cannot blank a single column, so the member-facing read path is the `matrimonial_profiles_public` VIEW (`security_invoker = true`, so the underlying RLS row rules still apply). It returns `whatsapp_number`, `father_mobile` and the owner's phone as **NULL** for every reader except the profile owner and admins.
  * The app reads profiles through this view only — reading the raw table would bypass the rule.
* **What the admin can do**: see every number, as before. An admin's view of the raw table is unaffected.

---

### 10b. ⭐ Event Reviews
* **What the admin can do**:
  * See every review for every event, with the rating (Good / Normal / Bad), the optional comment, the reviewer and the date.
  * Filter by rating.
  * Edit a review's rating/comment, or delete a review outright.
  * Every moderation action is written to `admin_logs` (`event_review_moderated`).
* **Access**: only **verified members** may review, and only **one review per member per event** (a UNIQUE constraint, not just a UI rule). Reviews of published events are public.
* **UI/Page Responsible**:
  * Event Reviews Page: [`app/dashboard/event-reviews/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/dashboard/event-reviews/page.tsx)
* **API/Backend Responsible**:
  * [`app/api/admin/event-reviews/route.ts`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/api/admin/event-reviews/route.ts) — GET list, PATCH moderate
  * `public.get_event_reviews_for_admin()` / `public.admin_update_event_review()` — admin-only RPCs
* **Database/Storage Involved**:
  * `event_reviews` table

---

### 10c. 🛡 Request Help / Harassment Reports
* **What the admin can do**:
  * See every report with its type (harassment / threat / safety concern / other), the description, the supporting details, the reporter and the reported person.
  * Filter by status and by type.
  * Move a report through `under_review` → `action_taken` → `closed` (or `dismissed`), assign it to an admin, keep internal notes and publish a resolution summary the reporter can read in the app.
  * Every status change is written to `admin_logs` (`help_request_<decision>`).
* **Confidentiality**:
  * Only the **reporter** and **admins** can read a report. The reported user has no policy that would expose the row, so they can never discover that they were reported, nor who reported them.
  * The reporter may add detail while the report is open, but can never change its status.
  * Reports are never included in member-facing notifications (only a generic "New Help Request" broadcast).
* **UI/Page Responsible**:
  * Help Requests Page: [`app/dashboard/help-requests/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/dashboard/help-requests/page.tsx)
* **API/Backend Responsible**:
  * [`app/api/admin/help-requests/route.ts`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/api/admin/help-requests/route.ts) — GET list, PATCH review
  * `public.get_help_requests_for_admin()` / `public.review_help_request()` — admin-only RPCs
* **Database/Storage Involved**:
  * `help_requests` table

---

### 11. 🗑 Account Deletion Requests & Cascading Purge
* **What the admin can do**:
  * Review pending account deletion requests submitted by users via mobile app or public form.
  * Filter requests by status (`pending`, `approved`, `rejected`).
  * Reject request with admin notes.
  * Approve request: Triggers a cascading deletion process removing records from `matrimonial_profiles`, `events`, `jobs`, `blood_donors`, `contact_requests`, and `users`.
  * Public web users can submit deletion requests via the public request page ([`app/account-deletion/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/account-deletion/page.tsx)).
* **UI/Page Responsible**:
  * Admin Review Page: [`app/dashboard/deletion-requests/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/dashboard/deletion-requests/page.tsx)
  * Public Form Page: [`app/account-deletion/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/account-deletion/page.tsx)
* **API/Backend Responsible**:
  * Supabase Client (`.from('deletion_requests').select()`, `.update()`, and multi-table `.delete()`)
* **Database/Storage Involved**:
  * `deletion_requests`, `users`, `matrimonial_profiles`, `events`, `jobs`, `blood_donors`, `contact_requests`
* **Important Files**:
  * [`app/dashboard/deletion-requests/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/dashboard/deletion-requests/page.tsx)
  * [`app/account-deletion/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/account-deletion/page.tsx)
  * [`lib/supabase.ts`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/lib/supabase.ts)

---

### 12. 📥 Bulk Member Import
* **What the admin can do**:
  * Upload Excel (`.xlsx`, `.xls`) or CSV files containing pre-approved member records with columns: `Phone`, `Full Name`, `City`, `Gotra`.
  * View data preview table of loaded records before importing.
  * Execute bulk import: Inserts records into `approved_members` table and automatically sets `is_verified = true` for existing registered users matching the imported phone numbers.
  * View import result summary (success count, failure count, detailed error logs).
* **UI/Page Responsible**:
  * Member Import Page: [`app/dashboard/import/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/dashboard/import/page.tsx)
* **API/Backend Responsible**:
  * XLSX library (`xlsx`) for client-side Excel parsing
  * Supabase Client (`.from('approved_members').insert()`, `.from('users').update({ is_verified: true })`)
* **Database/Storage Involved**:
  * `approved_members` table, `users` table
* **Important Files**:
  * [`app/dashboard/import/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/dashboard/import/page.tsx)
  * [`lib/supabase.ts`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/lib/supabase.ts)

---

### 13. ⚙ Settings & Administration
* **What the admin can do**:
  * **App Settings Tab**: Update App Name, Contact Email, Contact Phone, UPI ID for Donations, and upload UPI Payment QR Code image to Cloudinary.
  * **Membership Plans Tab**: set the fee for each of the two society membership plans independently:
    * **Lifetime Membership** — `app_settings.membership.fee` (currently 1,000)
    * **Lifetime Membership with Spouse** — `app_settings.membership.fee_spouse` (currently 1,500)
    * Both are validated server-side (a positive amount with up to 2 decimals) before being written, and every save is written to `admin_logs` (`update_setting`).
    * A plan with an **empty** fee cannot be bought: the app shows "not configured" and the database refuses the payment.
    * Changing a fee only affects applications submitted **afterwards** — every existing request keeps the fee that was due at submission (`membership_requests.fee_amount` is an immutable snapshot), so a pending payment is never repriced.
  * **Notifications Tab**: Toggle Preferences for Email alerts, SMS alerts, and Auto-approve verified users.
  * **Security Tab**: View current admin profile details, access password update form, view 2FA placeholder.
  * **Data Management Tab**: Export Database (fetches all core tables and downloads a formatted JSON backup file), clear browser local cache, view safety-disabled "Delete All Data" control.
* **UI/Page Responsible**:
  * Settings Page: [`app/dashboard/settings/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/dashboard/settings/page.tsx)
* **API/Backend Responsible**:
  * [`app/api/admin/settings/route.ts`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/api/admin/settings/route.ts) — GET/POST of the writable `app_settings` keys
  * Supabase Client (`.from(table).select('*')` across all tables)
  * Cloudinary Multipart REST API (`https://api.cloudinary.com/v1_1/ds0bvuv2p/image/upload`)
  * Browser Blob JSON download API
* **Database/Storage Involved**:
  * All 8 core database tables (`users`, `matrimonial_profiles`, `events`, `jobs`, `blood_donors`, `donations`, `post_holders`, `approved_members`), Cloudinary Storage (`qr-codes` folder)
* **Important Files**:
  * [`app/dashboard/settings/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/dashboard/settings/page.tsx)
  * [`lib/supabase.ts`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/lib/supabase.ts)

---

## 🌐 End-to-End Application Architecture Trace

```
+---------------------------------------------------------------------------------------+
|                                    ADMIN PANEL UI                                     |
|                       Next.js App Router (jbp-admin)                                  |
|   Dashboard | Users | Matrimonial | Events | Jobs | Blood | Donations | Settings ... |
+---------------------------------------------------------------------------------------+
        |                                                                 |
        | Supabase JS SDK Client                                          | REST API Multipart Upload
        | (jbp-admin/lib/supabase.ts)                                     | (events/page.tsx, settings/page.tsx)
        v                                                                 v
+---------------------------------------------------+     +-----------------------------+
|              SHARED SUPABASE BACKEND              |     |   CLOUDINARY IMAGE CLOUD    |
|       (mtudvgoueeldtnrccvyw.supabase.co)          |     |        (ds0bvuv2p)          |
|                                                   |     |                             |
| Tables:                                           |     | Unsigned Presets:           |
| - users                                           |     | - jbp-agrawal-uploads       |
| - matrimonial_profiles                            |     | - jbp_events                |
| - events                                          |     |                             |
| - jobs                                            |     | Stores:                     |
| - blood_donors                                    |     | - Event poster images       |
| - donations                                       |     | - UPI Payment QR code       |
| - post_holders                                    |     | - Matrimonial photos        |
| - approved_members                                |     +-----------------------------+
| - contact_requests                                |                     ^
| - deletion_requests                               |                     |
| - admin_logs                                      |                     | Direct Uploads / Image URLs
+---------------------------------------------------+                     |
        ^                                                                 |
        | Supabase JS SDK + AsyncStorage                                  |
        | (jbp-agrawal-sabha/src/config/supabase.js)                      |
+---------------------------------------------------------------------------------------+
|                                  MAIN MOBILE APP                                      |
|                           Expo React Native App (src/)                                |
|    Home | Directory | Matrimonial | Events | Jobs | Blood | Donations | Profile ...   |
+---------------------------------------------------------------------------------------+
```

---

## 🧭 File & Component Map Across Repositories

| Feature Area | Admin Panel File (`jbp-admin`) | Main App File (`jbp-agrawal-sabha`) | Supabase DB Table |
| :--- | :--- | :--- | :--- |
| **Auth & Config** | [`jbp-admin/lib/supabase.ts`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/lib/supabase.ts) | [`jbp-agrawal-sabha/src/config/supabase.js`](file:///c:/Users/vedag/Desktop/final_app/jbp-agrawal-sabha/src/config/supabase.js) | `users` |
| **User Management** | [`jbp-admin/app/dashboard/users/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/dashboard/users/page.tsx) | [`jbp-agrawal-sabha/src/screens/Auth/PhoneVerificationScreen.js`](file:///c:/Users/vedag/Desktop/final_app/jbp-agrawal-sabha/src/screens/Auth/PhoneVerificationScreen.js) | `users` |
| **Member Import** | [`jbp-admin/app/dashboard/import/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/dashboard/import/page.tsx) | [`jbp-agrawal-sabha/src/screens/Auth/PhoneVerificationScreen.js`](file:///c:/Users/vedag/Desktop/final_app/jbp-agrawal-sabha/src/screens/Auth/PhoneVerificationScreen.js) | `approved_members` |
| **Matrimonial** | [`jbp-admin/app/dashboard/matrimonial/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/dashboard/matrimonial/page.tsx) | [`jbp-agrawal-sabha/src/screens/Matrimonial/MatrimonialListScreen.js`](file:///c:/Users/vedag/Desktop/final_app/jbp-agrawal-sabha/src/screens/Matrimonial/MatrimonialListScreen.js) | `matrimonial_profiles` |
| **Events & Notices** | [`jbp-admin/app/dashboard/events/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/dashboard/events/page.tsx) | [`jbp-agrawal-sabha/src/screens/Events/EventsScreen.js`](file:///c:/Users/vedag/Desktop/final_app/jbp-agrawal-sabha/src/screens/Events/EventsScreen.js) | `events` |
| **Job Postings** | [`jbp-admin/app/dashboard/jobs/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/dashboard/jobs/page.tsx) | [`jbp-agrawal-sabha/src/screens/Jobs/JobsScreen.js`](file:///c:/Users/vedag/Desktop/final_app/jbp-agrawal-sabha/src/screens/Jobs/JobsScreen.js) | `jobs` |
| **Blood Donors** | [`jbp-admin/app/dashboard/blood-donors/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/dashboard/blood-donors/page.tsx) | [`jbp-agrawal-sabha/src/screens/Blood/BloodDonorsScreen.js`](file:///c:/Users/vedag/Desktop/final_app/jbp-agrawal-sabha/src/screens/Blood/BloodDonorsScreen.js) | `blood_donors` |
| **Donations** | [`jbp-admin/app/dashboard/donations/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/dashboard/donations/page.tsx) | [`jbp-agrawal-sabha/src/screens/Donations/DonationsScreen.js`](file:///c:/Users/vedag/Desktop/final_app/jbp-agrawal-sabha/src/screens/Donations/DonationsScreen.js) | `donations` |
| **Post Holders** | [`jbp-admin/app/dashboard/post-holders/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/dashboard/post-holders/page.tsx) | [`jbp-agrawal-sabha/src/screens/PostHolders/PostHoldersScreen.js`](file:///c:/Users/vedag/Desktop/final_app/jbp-agrawal-sabha/src/screens/PostHolders/PostHoldersScreen.js) | `post_holders` |
| **Account Deletion** | [`jbp-admin/app/dashboard/deletion-requests/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/dashboard/deletion-requests/page.tsx) | [`jbp-admin/app/account-deletion/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/account-deletion/page.tsx) | `deletion_requests` |

---

## ❓ Architectural Gaps & Items Requiring Investigation

1. **`admin_logs` Table Utilization**:
   - The database schema in [`lib/supabase.ts`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/lib/supabase.ts) defines an `admin_logs` table (`id`, `admin_id`, `action`, `target_type`, `target_id`, `details`, `created_at`).
   - *Gap*: None of the admin pages (`matrimonial`, `events`, `jobs`, `users`, `donations`, `deletion-requests`) currently write audit log records into `admin_logs` when approving, rejecting, modifying, or deleting records.

2. **`matrimonial_profiles.approval_notes` Database Schema Alignment**:
   - In [`app/dashboard/matrimonial/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/dashboard/matrimonial/page.tsx) (line 110), the code notes: `// approval_notes temporarily removed until column is added to database`.
   - *Gap*: `approval_notes` is defined in TypeScript types (`lib/supabase.ts`), but omitted during profile approvals in `matrimonial/page.tsx`. Needs verification whether the live PostgreSQL database instance has executed this column migration.

3. **Cloudinary Physical File Purging**:
   - Detaching an image from an event or setting updates the database row to `null`, but physical image assets on Cloudinary are **retained indefinitely** (documented in [`cloudinary.js`](file:///c:/Users/vedag/Desktop/final_app/jbp-agrawal-sabha/src/config/cloudinary.js): `deleteImageFromCloudinary` logs "Delete not implemented - image retained").
   - *Gap*: Unsigned client-side upload presets do not possess the Cloudinary API secret needed for deletion. Physical deletion requires a server-side route handler or Cloudinary Admin SDK integration.

4. **Edge Middleware Authorization Enforcement**:
   - [`middleware.ts`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/middleware.ts) targets `/dashboard/:path*`, but currently passes all requests through (`return NextResponse.next()`).
   - *Gap*: Auth enforcement relies on client-side React code checks (`LoginPage` and dashboard component state). Next.js server/edge token verification is not currently active in `middleware.ts`.

5. **App Settings Persistence**:
   - App-wide settings (App Name, Contact Email, Contact Phone, UPI ID) in [`app/dashboard/settings/page.tsx`](file:///c:/Users/vedag/Desktop/final_app/jbp-admin/app/dashboard/settings/page.tsx) are stored in React component state (`useState`) and show simulated success toasts.
   - *Gap*: There is no dedicated `settings` table in Supabase to persist these configuration values across browser sessions or sync them dynamically to the mobile app.

6. **2FA & SMS Integration Placeholders**:
   - Two-Factor Authentication and SMS Notifications switches in Settings are UI toggles.
   - *Gap*: Third-party SMS gateway (e.g. Twilio / MSG91) and 2FA authenticator integrations are not implemented in the current codebase.
