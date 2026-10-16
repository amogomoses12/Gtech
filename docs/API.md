# Gtech API Reference

Base URL: `/api` on the same origin as the website. Development Vite proxies to Express on port 3001. Production Express serves both frontend and API.

Responses are JSON except file streaming. Errors use `{ "error": "Readable explanation" }`. Statuses include 400 validation, 401 unauthenticated, 403 forbidden, 404 missing, 409 conflict, 413 too large, 429 rate limit, and 503 unconfigured service.

## Sessions and CSRF

Login/registration set an HTTP-only `gtech_session` cookie and return `{ user, csrfToken }`. Send the cookie with authenticated requests. `/auth/me` returns the current user/token or null values. Sessions expire in seven days; production cookies require HTTPS.

All writes require `X-Gtech-Request: 1`. Authenticated writes also require `X-CSRF-Token` from the session response. Origin checks apply. Stripe webhooks instead require a valid raw-body Stripe signature.

```sh
curl -c cookies.txt -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' -H 'X-Gtech-Request: 1' \
  -d '{"email":"your-admin@example.com","password":"your-own-password"}'
```

Use the returned CSRF token for later writes. Do not commit cookies or tokens.

## Public and Account

| Method | Endpoint            | Purpose / Body                                            |
| ------ | ------------------- | --------------------------------------------------------- |
| GET    | `/health`           | API and database status                                   |
| GET    | `/config`           | Public settings, payment mode, upload limit               |
| GET    | `/auth/me`          | Current session                                           |
| POST   | `/auth/register`    | `{ name, email, password }`; always creates a learner     |
| POST   | `/auth/login`       | `{ email, password }`                                     |
| POST   | `/auth/logout`      | Revoke session                                            |
| PATCH  | `/account`          | Authenticated; `{ name }`                                 |
| POST   | `/account/password` | `{ current_password, password }`; revoke other sessions   |
| POST   | `/contact`          | `{ name, email, subject, message }`; save support message |

Passwords require 10-128 characters. Login is rate-limited. Passwords use salted scrypt hashes.

## Learning

| Method | Endpoint                | Purpose                                                           |
| ------ | ----------------------- | ----------------------------------------------------------------- |
| GET    | `/courses`              | Published courses; filters `subject`, `q`, `price=free/paid`      |
| GET    | `/courses/:slugOrId`    | Course, lesson metadata, and material summaries                   |
| POST   | `/courses/:id/enroll`   | Authenticated free enrollment; paid courses return 402            |
| GET    | `/lessons/:id`          | Public preview or enrolled lesson                                 |
| POST   | `/lessons/:id/progress` | `{ completed: true/false }`; enrolled users only                  |
| GET    | `/resources`            | Published materials; filters `subject`, `q`                       |
| GET    | `/resources/:id`        | Full material when authorized; protected fields omitted otherwise |
| GET    | `/files/:id`            | Authorized file; supports Range requests                          |
| GET    | `/files/:id?download=1` | Authorized attachment download                                    |
| GET    | `/quizzes`              | Published practice sessions; optional `subject`                   |
| GET    | `/quizzes/:id`          | Questions/options without correct answers                         |
| POST   | `/quizzes/:id/attempts` | Authenticated server-side grading                                 |
| GET    | `/attempts/:id`         | Attempt owner's score and explanations                            |
| GET    | `/my-learning`          | Own courses, progress, practice history, and orders               |

Subjects: `Mathematics`, `Physics`, `Technology`, `Scholarships`. Standalone published materials are public. Course-linked materials require enrollment. Preview lesson files are publicly accessible. Unpublishing a course preserves existing learners' access.

Practice submission uses zero-based choices and must answer every question exactly once:

```json
{
  "answers": [
    { "question_id": 1, "choice": 1 },
    { "question_id": 2, "choice": 0 }
  ]
}
```

The server calculates scores and stores a complete review snapshot. Editing a quiz does not change historical answer explanations.

## Payments

| Method | Endpoint                      | Purpose                                              |
| ------ | ----------------------------- | ---------------------------------------------------- |
| POST   | `/checkout`                   | `{ course_id }`; returns checkout URL/order ID       |
| GET    | `/orders/:id`                 | Authenticated owner only                             |
| GET    | `/orders/:id?verify=1`        | Verify stored session directly with Stripe           |
| POST   | `/orders/:id/cancel`          | Cancel a pending owned order                         |
| POST   | `/orders/:id/development-pay` | Simulate a development order; disabled in production |
| POST   | `/webhooks/stripe`            | Raw signed Stripe events                             |

Prices are integer USD cents from the database, not the browser. Order statuses: `pending`, `paid`, `test_paid`, `cancelled`, `failed`, `refunded`. Payment mode is `live` or `test`. No admin endpoint can manually mark a Stripe order paid.

## Administration

All endpoints below require an active administrator session and CSRF verification on writes.

| Method       | Endpoint                       | Purpose                                                     |
| ------------ | ------------------------------ | ----------------------------------------------------------- |
| GET          | `/admin/overview?days=7/30/90` | Counts, daily activity, courses, recent events              |
| GET / POST   | `/admin/courses`               | List or create courses                                      |
| PUT / DELETE | `/admin/courses/:id`           | Edit/delete; dependencies block deletion                    |
| GET / POST   | `/admin/courses/:id/lessons`   | List or create course lessons                               |
| PUT / DELETE | `/admin/lessons/:id`           | Edit/delete a lesson                                        |
| GET / POST   | `/admin/resources`             | List/create materials or scholarship resources              |
| PUT / DELETE | `/admin/resources/:id`         | Edit/delete a material                                      |
| GET / POST   | `/admin/quizzes`               | List/create practice sessions, including answer keys        |
| PUT / DELETE | `/admin/quizzes/:id`           | Replace/delete a quiz                                       |
| GET / POST   | `/admin/uploads`               | List files or upload multipart `file`                       |
| DELETE       | `/admin/uploads/:id`           | Delete unused media; attached files return 409              |
| GET          | `/admin/learners`              | Accounts and learning counts                                |
| PATCH        | `/admin/learners/:id`          | `{ status: "active" / "suspended" }`; cannot suspend admins |
| GET          | `/admin/orders`                | All transactions and account details                        |
| GET          | `/admin/messages`              | Support inbox                                               |
| PATCH        | `/admin/messages/:id`          | `{ status: "new" / "read" / "resolved" }`                   |
| GET / PUT    | `/admin/settings`              | Public website settings; never secret keys                  |
| GET / POST   | `/admin/projects`              | Workspace projects                                          |
| PUT / DELETE | `/admin/projects/:id`          | Update/delete a project                                     |

## Request Formats

Course creation/update:

```json
{
  "title": "A clear start with physics",
  "subject": "Physics",
  "summary": "Motion through practical examples.",
  "description": "# What you will learn\n\nStart with motion and forces.",
  "image": "/images/physics.jpg",
  "price_cents": 1900,
  "level": "Beginner",
  "instructor": "Gtech Learning Team",
  "duration": "4 lessons",
  "published": false
}
```

Cover choices: `/images/mathematics.jpg`, `/images/physics.jpg`, `/images/technology.jpg`, `/images/scholarships.jpg`. Levels: `Beginner`, `Intermediate`, `Advanced`, `All levels`. Slugs are server-generated and stable on edits.

Lesson creation/update:

```json
{
  "title": "Understanding velocity",
  "content": "# Velocity\n\nVelocity includes speed and direction.",
  "kind": "reading",
  "video_url": "",
  "video_file_id": null,
  "document_file_id": null,
  "duration": 10,
  "position": 0,
  "preview": false
}
```

`kind` is `reading` or `video`. Video requires an uploaded file UUID or an HTTPS YouTube/Vimeo URL. Upload first, then attach the ID. Lower positions appear first. The server checks file MIME compatibility.

Material creation/update:

```json
{
  "title": "Your personal statement workbook",
  "description": "A thoughtful place to begin.",
  "subject": "Scholarships",
  "kind": "Scholarship guide",
  "content": "# Start with your story\n\nWrite your goals clearly.",
  "file_id": null,
  "course_id": null,
  "external_url": "",
  "published": true
}
```

Kinds: `Study guide`, `Worksheet`, `Scholarship guide`, `Reading notes`. At least text, a file, or an external HTTPS URL is required. A non-null course ID applies enrollment protection.

Practice creation/update:

```json
{
  "title": "Algebra warm-up",
  "subject": "Mathematics",
  "description": "Build a little more confidence.",
  "duration": 5,
  "published": true,
  "questions": [
    {
      "prompt": "Solve x + 2 = 5.",
      "options": ["1", "2", "3", "4"],
      "correct_index": 2,
      "explanation": "Subtract 2 from both sides: x = 3."
    }
  ]
}
```

A quiz contains 1-50 questions, each with 2-6 choices and a valid correct index. The duration is guidance for self-paced practice, not an enforced exam timer.

Upload:

```sh
curl -b cookies.txt -X POST http://localhost:3001/api/admin/uploads \
  -H 'X-Gtech-Request: 1' -H 'X-CSRF-Token: YOUR_CSRF_TOKEN' \
  -F 'file=@lesson.pdf'
```

Returns `{ id, original_name, mime, size, created_at }`. Server filenames are random UUIDs. Unattached uploads are private to admins.

Site settings:

```json
{
  "site_name": "Gtech",
  "support_email": "support@your-domain.example",
  "tagline": "A little curiosity. A world of possibility."
}
```

Workspace project:

```json
{
  "name": "Learning platform launch",
  "category": "Product development",
  "status": "Planning",
  "progress": 0,
  "dueDate": "2027-01-31",
  "budget": 1000,
  "description": "Prepare our next chapter.",
  "members": [1]
}
```

Statuses: `Planning`, `In progress`, `In review`, `Completed`. Completed projects have 100% progress. The team picker uses administrator account IDs.
