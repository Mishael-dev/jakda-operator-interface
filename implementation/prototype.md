# Jakada Backend — How It Works

## What This Is

Jakada is a crisis response platform for Plateau State, Nigeria. This backend
is a FastAPI server that sits between the mobile app, the operator dashboard,
and the Supabase database. It handles authentication, alerts, location tracking,
crowd verification, and dispatching response teams.

---

## Folder Structure

```
jakada-server/
├── main.py          # Entry point. Registers all routers and CORS settings.
├── config.py        # Reads environment variables (.env file).
├── database.py      # Creates the Supabase client used across all files.
├── auth.py          # Passkey (FIDO2) registration and login endpoints.
├── routers/
│   ├── location.py  # Location ping endpoint.
│   ├── alerts.py    # Alert trigger, fetch, and status update endpoints.
│   ├── crowd.py     # Crowd verification endpoint.
│   └── dispatches.py # Dispatch creation, status updates, responder view.
```

---

## The Three User Types

| Type | What They Do |
|---|---|
| **Civilian** | Downloads the app, triggers panic alerts |
| **Responder** | Receives dispatch, goes to the scene |
| **Operator** | Sits at the web dashboard, assigns responders |

Every user has a `role` column in the database. Endpoints check this role
before allowing certain actions. For example, only operators can assign
dispatches and only responders can call `/dispatches/mine`.

---

## How Authentication Works

We use **FIDO2 passkeys** — no passwords. Here is the flow:

**Registration:**
1. User submits username and phone number
2. Backend creates the user and returns a cryptographic challenge
3. The device (phone or browser) signs the challenge using biometrics
4. Backend verifies the signature and saves the credential

**Login:**
1. User submits their username
2. Backend returns a challenge
3. Device signs it with the saved passkey
4. Backend verifies and returns the user ID

After login, the frontend stores the `user_id` and sends it as a
`user-id` header on every request. The backend uses this header to
identify who is making each request.

---

## How the Database Is Structured

```
users
  ├── id, username, phone_number
  ├── role (civilian | responder | operator)
  ├── is_available (for responders — are they free to take a job?)
  └── last_lat, last_lng, last_seen (location tracking)

alerts
  ├── id, user_id (who triggered it)
  ├── status (pending → active → dispatched → resolved | ignored)
  ├── lat, lng (where it happened)
  ├── legitimacy_score (0–100, based on crowd responses)
  └── triggered_at, resolved_at

crowd_verifications
  ├── alert_id, user_id
  ├── question ("Did you notice anything unusual nearby?")
  └── answer (true = yes, false = no)

dispatches
  ├── alert_id, operator_id, responder_id
  └── status (en_route → arrived → completed)
```

---

## The Core Flow — Step by Step

```
1. Civilian taps PANIC on their phone
         ↓
2. App calls POST /alerts/trigger with their GPS location
   → Alert created in database with status: active
         ↓
3. Nearby users receive a push notification asking:
   "Did you notice anything unusual nearby?"
   → They answer via POST /alerts/:id/verify
   → Legitimacy score is calculated from their answers
         ↓
4. Operator sees the alert on the web dashboard in real time
   (Supabase Realtime pushes updates without page refresh)
         ↓
5. Operator reviews the alert and assigns a responder
   → POST /dispatches { alert_id, responder_id }
   → Alert status becomes: dispatched
   → Responder's is_available becomes: false
         ↓
6. Responder gets a push notification and opens the mission screen
   → GET /dispatches/mine shows their active assignment
         ↓
7. Responder arrives → PATCH /dispatches/:id/status { status: arrived }
   Responder completes → PATCH /dispatches/:id/status { status: completed }
   → Alert status becomes: resolved
   → Responder's is_available becomes: true again
         ↓
8. Civilian sees a "Help is on the way" message
```

---

## How Location Tracking Works

Every 60 seconds the mobile app calls `POST /location/ping` with the
device's current GPS coordinates. The backend saves `last_lat`, `last_lng`,
and `last_seen` on the user record. This is how the operator dashboard
knows where responders are on the map.

---

## Environment Variables You Need

```
SUPABASE_URL          → Your Supabase project URL
SUPABASE_SERVICE_KEY  → Supabase service role key (full access)
RP_ID                 → Domain for passkeys (e.g. jakada-server.onrender.com)
RP_NAME               → App name shown during passkey prompt
ORIGIN                → Your backend's full URL
ANDROID_ORIGIN        → android:apk-key-hash:... (from your APK signing key)
```

---

## Running the Server

```bash
# Local development (inside the project folder)
docker compose up

# The server runs at http://localhost:8000
# Interactive API docs at http://localhost:8000/docs
```

---

## One Thing to Know About Supabase

We use the **service role key** which bypasses all Supabase security rules.
This means the backend has full read and write access to every table.
Row Level Security (RLS) is disabled on all tables for the prototype.
When this goes to production, RLS policies should be re-enabled and
the backend should validate permissions itself before every write.

---

*Jakada Backend — v1.0 Prototype*