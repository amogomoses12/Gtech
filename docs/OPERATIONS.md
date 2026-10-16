# Local and Production Operations

## Local State

`npm run dev` starts the API and frontend together. Frontend files hot reload. Restart the development command after editing backend files or `.env`. For API-only development with automatic restart, use `npm run dev:api` separately on its own configured port.

Starter courses and readings are seeded once, not on every edit. There are no default credentials. Create your first administrator with `npm run admin:create` before registering a learner if you want that account to be the first user in the database.

The database and uploads must be backed up together. Never delete `storage/` if it contains records or files you want to retain.

## Before Going Live

1. Choose a persistent Node host or VPS. A static-only host or an ephemeral serverless instance is not sufficient.
2. Mount persistent storage at `DATABASE_PATH` and `UPLOAD_DIR`; test file permissions under the runtime user.
3. Set `NODE_ENV=production`, an HTTPS `PUBLIC_URL`, and the correct proxy trust setting. Never expose the development server publicly as your production server.
4. Configure TLS, request-size limits, request timeouts, process restarts, and health monitoring.
5. Update your business name/support email and review all starter educational content and uploaded-media rights.
6. Replace the starter privacy/terms text with policies appropriate to your jurisdiction, including refund, tax, retention, and account-deletion requirements.
7. Configure Stripe test mode and signed webhooks. Complete purchase, delayed-payment, cancellation, and refund tests using your Stripe account.
8. Verify the simulated checkout is unavailable in production and test purchases never appear as live revenue.
9. Configure live Stripe keys and their separate webhook secret only when you are ready to receive real payments.
10. Back up the database and uploads, restore into a separate instance, and verify records and file playback after restoration.

## Features Requiring External Services

- Stripe is implemented, but account activation, live/test credentials, your public URL, webhook registration, tax configuration, and actual real-network payment testing require your account.
- Contact requests are saved in the database. Admin replies use the administrator's email application. Transactional email, email verification, and email-based password reset are not connected to an email provider.
- File uploads have size, type, extension, and signature validation. Antivirus scanning, object-storage replication, media transcoding, captions generation, and DRM are not included.
- The database is suitable for a single persistent application instance. PostgreSQL/object storage migration is required before horizontally scaling across independent machines.
- Docker and Nginx files are supplied as configuration starting points. They still need environment-specific validation, certificates, domain setup, and hosting resources.

## Payment Checks

Stripe webhook events are signature verified. The API retrieves provider session data instead of trusting redirect query values. Order amount and currency must match the database. Fulfillment writes the order state and enrollment in one transaction. Duplicate success events do not create duplicate enrollments.

`checkout.session.completed` with `payment_status=unpaid` does not grant access. `checkout.session.async_payment_succeeded` can fulfill later. A full `charge.refunded` event revokes a Stripe-sourced enrollment unless another paid order for the same learner/course exists. A late success event does not reactivate a refunded order.

Server-side order verification is available through the learner's purchase page if the provider webhook is delayed. Access is never granted just because a browser visited the success page.

## Access Model

- Public visitors can discover published content, read standalone free resources, and view explicitly marked lesson previews.
- Signed-in learners can enroll in free courses, buy paid courses, save progress, and submit practice sessions.
- Enrolled learners can access their course content and linked documents. Unpublishing a course hides it from discovery while preserving existing enrollment access.
- Administrators manage content, media, projects, settings, and support. They may inspect learner accounts but cannot turn a learner into an administrator through the public API.
- Account suspension immediately revokes sessions. Historical enrollments, transactions, and attempts remain stored.

If the same file is attached to both a public preview and a paid lesson, it is accessible through the public preview. Avoid sharing the same asset between content with different intended confidentiality.

## Test Coverage

`npm run test:api` uses temporary databases. It covers authentication and CSRF, role restrictions, relational persistence, private files, quiz grading, order ownership, cancellation, duplicate fulfillment, signed Stripe events using mocked provider network calls, full refunds, and production checkout restrictions.

`npm run test:e2e` uses the built frontend and an isolated API instance. It tests administrator sign-in, real video/PDF uploads, course and resource publishing, learner registration, paid/free enrollment, browser video metadata/playback readiness, file downloads, progress persistence, quizzes, support, exports, and responsive routes.

Mocked provider calls prove the local integration logic, not the availability or eligibility of an actual Stripe account. Always run an end-to-end transaction against Stripe's test environment before launch.
