# Gtech Learning Platform

A full-stack Gtech website with the green-and-ivory **Option A admin dashboard**, public courses, a lesson reader, video tutorials, study materials, scholarship guides, practice sessions, and checkout.

**Frontend:** React, TypeScript, Tailwind CSS v4, React Router, Recharts. **Backend:** Node.js, Express, persistent relational SQLite through `better-sqlite3`. Authentication, permissions, grading, file access, and payment fulfillment are enforced on the server.

## Start Locally

Use Node.js 20.19+ or 22.12+ and npm:

```sh
npm install
cp .env.example .env
npm run dev
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

Open **http://localhost:5173**. This starts BOTH the frontend and API and proxies `/api` to Express on port 3001. Do not run plain Vite alone; the website needs its backend.

Database tables and starter content are created automatically. No external database account is needed. The database is `storage/gtech.sqlite`; uploaded files are in `storage/uploads/`. Both persist across restarts. If SQLite's native dependency cannot find a prebuilt binary, install your platform's C++ build tools and Python, or use the Dockerfile with Node 22.

## Create Your Administrator

In a second terminal:

```sh
npm run admin:create
```

Enter a name, email, and password of at least 10 characters, then sign in at **/login**. Administrators open **/admin**; learners open **/my-learning**.

There is intentionally no default administrator password. Public registration creates learners only. Run the same command with a different email to create another administrator. `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` can be supplied through a secure environment for noninteractive provisioning. Never commit credentials. The interactive command explicitly indicates whether password input is visible.

## Included Features

- Public homepage, searchable courses, subject/price filters, about, contact, privacy, and terms.
- Registration, login/logout, profile editing, and password changes with session revocation.
- Free enrollment and paid enrollment with server-controlled prices and access.
- Reading lessons, uploaded MP4/WebM tutorials, and YouTube/Vimeo embeds.
- Private lesson handouts, PDF/image downloads, and course-linked learning materials.
- Persistent lesson completion and a personal learning library.
- Quiz authoring, server-side scoring, explanations, and saved practice attempts.
- Scholarship preparation guides and an editable resource library.
- Admin course, lesson, resource, quiz, media, and workspace-project management.
- Learner suspension, transactions, CSV reports, support inbox, and website settings.
- Secure sessions, role checks, CSRF protection, validated uploads, and backups.

The six starter courses, six readings, and three practice sessions contain editable example learning content. They are not an accredited curriculum. There are no fabricated sales, learner accounts, testimonials, or analytics. Upload your own video tutorials; no unrelated stock video is presented as a course lesson.

## Publish Your Content

1. In **Admin > Courses**, create a course and choose its subject, description, and price.
2. Select **Lessons** beside the course. Add reading or video lessons. Use `# Heading`, `## Subheading`, and blank lines for safe text formatting.
3. Upload videos in the lesson editor or **Media library**. MP4/WebM must use a browser-compatible codec, such as H.264/AAC in MP4.
4. Attach optional PDF/image handouts. Enable **Free preview** only for lessons you want everyone to access before enrollment.
5. Publish when the content is ready. Set the price to `0` for free enrollment.
6. Use **Materials** or **Scholarships** for standalone readings, documents, or external links. Choose **Enrolled learners only** to protect a resource behind a course.
7. Use **Practice** to enter questions, choices, correct answers, and explanations.

Files are private by default. Uploading alone does not publish them. Access follows their attached lesson/material. Reusing a file in a free preview makes that file publicly accessible through the preview; do not reuse confidential paid files in free content. Existing learners retain access when a course is unpublished. Courses with enrollments, orders, or linked resources cannot be deleted accidentally.

Uploads default to 250 MB. Adjust `MAX_UPLOAD_MB` and the reverse proxy's request-size limit together. PDF, MP4, WebM, JPG, and PNG extensions, MIME types, and signatures are validated. Only admins can upload. Videos are served through authorized endpoints with HTTP Range support.

## Payments

### Development Checkout

Without Stripe credentials, local development has a clearly labeled simulated checkout. **Complete test purchase** records a `test_paid` order and grants access. It requests no card details and charges no money. Test purchases never count as live revenue.

The simulated payment endpoint is always disabled with `NODE_ENV=production`, even if `ENABLE_DEV_CHECKOUT=true` is set.

### Stripe Checkout

Add your own test credentials to `.env`:

```dotenv
STRIPE_SECRET_KEY=sk_test_your_own_key
STRIPE_WEBHOOK_SECRET=whsec_your_own_secret
PUBLIC_URL=http://localhost:5173
```

Restart after changing server settings. Run the Stripe CLI in another terminal:

```sh
stripe login
stripe listen --forward-to localhost:3001/api/webhooks/stripe
```

Use the signing secret printed by `stripe listen`. Purchase a paid course through the site. Stripe's test card is `4242 4242 4242 4242`, with a future expiry and any three-digit CVC. Never use a real card in test mode.

Register these events for your deployed webhook:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
- `charge.refunded`

Checkout prices and identity come from the database. Signed webhook events and authenticated server-side session retrieval fulfill orders. The browser cannot mark a Stripe order paid. Fulfillment is transactional and idempotent and verifies session, order, user, course, amount, currency, and mode. Full refunds in Stripe revoke the paid enrollment unless another paid order grants access; partial refunds do not revoke access.

**Real Stripe network checkout cannot be exercised without your account credentials.** Automated tests verify development checkout, payment fulfillment rules, and real Stripe SDK webhook signatures using mocked provider network calls. Complete an end-to-end Stripe test checkout and webhook/refund test with your own account before switching to live credentials. Confirm your business eligibility and configure your tax/refund policies. Course currency is USD.

## Verification

```sh
npm run build
npx tsc --noEmit
npm run test:api
npx playwright install --with-deps chromium
npm run test:e2e
```

The browser test serves the production frontend build using a temporary database and admin account. It uploads a valid PDF and video, publishes content, registers a learner, completes a test purchase, plays the video, downloads a protected file, saves progress, submits a quiz, and checks desktop/tablet/mobile routes. Tests do not modify your regular database.

The CC0 MDN flower video in `scripts/fixtures/` is only a playback test fixture, not public course content. API tests cover sessions, CSRF, permissions, hashing, protected content, ownership, grading, payments, suspension, and persistence.

## Database and Backups

```sh
npm run db:seed
npm run db:backup
```

Seeding is idempotent and does not reset content. Backups contain a consistent database snapshot and uploaded media under `backups/<timestamp>/`. Pause uploads/content editing while making or restoring a backup, and keep encrypted copies outside the host.

To restore, stop all server processes, preserve the current storage, copy the backup database to `DATABASE_PATH` and its uploads to `UPLOAD_DIR`, remove stale WAL/SHM files only while the database is stopped, and restart. Test restoration before relying on backups.

`server/schema.sql` defines users, sessions, courses, lessons, files, resources, enrollments, progress, quizzes, questions, attempts, orders, payment events, settings, messages, activity, and projects. Foreign keys, uniqueness checks, prepared statements, WAL mode, and an initial schema migration are included.

## Deployment Later

Host as **one persistent Node service**. Express serves the built frontend and API from one origin. Static-only hosting does not support this database, authentication, uploads, or payment backend.

```sh
npm ci
npm run build
NODE_ENV=production PUBLIC_URL=https://your-domain.example npm start
```

Configure environment values using your host's dashboard or `.env`; adapt inline environment syntax for your shell. Production requires an HTTPS `PUBLIC_URL`, uses secure cookies, disables development payments, and requires a webhook secret whenever Stripe is enabled. Set `TRUST_PROXY=1` only behind exactly one trusted reverse proxy.

The included `Dockerfile`, `compose.yaml`, and `deploy/nginx.conf.example` are deployment starting points. With production configuration in `.env`, run `docker compose up --build -d`, then `docker compose exec gtech npm run admin:create`.

Mount persistent storage for BOTH database and uploads. Do not use an ephemeral/serverless filesystem or multiple separate SQLite copies. For horizontal scaling, migrate to PostgreSQL and object storage with authorized file delivery; that infrastructure is not provisioned here.

Before launch, replace the example support email, review your course rights/content, adapt legal pages to your jurisdiction and business, publish a refund policy, configure HTTPS and Stripe, test payment/refund webhooks, and set up monitoring/backups. Uploads have validation but not antivirus scanning, video transcoding, or DRM. Outgoing email, email verification, and self-service password-reset delivery are not connected. Support requests are stored in the admin inbox; email replies open your email app.

## Source Map

- `src/App.tsx`: public, learner, and protected administrator routes.
- `src/platform/`: pages, real API client, auth context, dashboard, and editors.
- `src/index.css`: original Option A visual system and Tailwind CSS.
- `server/index.mjs`: Express API and production frontend serving.
- `server/schema.sql`, `db.mjs`, `seed.mjs`: relational data and starter resources.
- `server/security.mjs`: password hashing, sessions, CSRF, and access control.
- `server/payments.mjs`: Stripe and development checkout.
- `server/uploads.mjs`: validated private uploads and protected streaming.
- `server/admin.mjs`: administrator management API.
- `docs/API.md`: endpoint reference and request formats.
- `.env.example`: configuration reference without secrets.

Earlier local-storage dashboard demo records are not automatically imported. The integrated dashboard reads real database records instead of the earlier sample business metrics.
