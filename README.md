# SmartAttendance

A web-based attendance management system for university lecture halls. Eliminates proxy attendance using Dynamic QR Codes, GPS geo-fencing, and device fingerprinting, with a machine learning layer that flags students at academic risk.

**Live:** https://smart-attendance-system-qr.vercel.app

---

## What It Does

When a lecturer starts an attendance session, the system captures their GPS location and generates an encrypted QR code that expires in 10 minutes. Students scan the code from their phones. Every scan is checked against three conditions:

1. **Identity** — is the student logged in with a valid account?
2. **Time** — is the QR code still active?
3. **Distance** — is the student within the configured radius of the lecturer (Haversine Formula)?

If all three pass, attendance is marked. If the same device is used by two different student accounts in the same session, both are flagged as a suspected proxy attempt.

After each session, a Brain.js neural network analyses each student's attendance rate, punctuality, and consistency to classify them as **On Track**, **Warning**, or **At Risk**. The lecturer receives an automatic email when at-risk students are detected.

---

## Features

- Dual-role system — separate dashboards for lecturers and students
- AES-encrypted, time-limited QR codes
- Configurable scanning radius (1–100 metres)
- FingerprintJS device fingerprinting for fraud detection
- Brain.js ML risk prediction with automated email alerts (Gmail SMTP)
- CSV attendance report export (per session or full course)
- Real-time course announcements with unread badge
- Student attendance history with present/absent breakdown
- Dark mode

---

## Tech Stack

| Layer           | Technology                           |
| --------------- | ------------------------------------ |
| Frontend        | React.js                             |
| Backend         | Node.js + Express.js                 |
| Database        | Supabase / PostgreSQL                |
| Auth            | Supabase Auth + JWT                  |
| QR Encryption   | CryptoJS AES                         |
| ML              | Brain.js                             |
| Fraud Detection | FingerprintJS                        |
| Email           | Nodemailer / Gmail SMTP              |
| Hosting         | Vercel (frontend) + Render (backend) |

---

## Running Locally

### Prerequisites

- Node.js v18+
- A Supabase project
- A Gmail App Password

### 1. Clone the repo

```bash
git clone https://github.com/ChampCode24/attendance-system.git
cd attendance-system
```

### 2. Backend setup

```bash
cd backend
npm install
```

Create `backend/.env`:

```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
JWT_SECRET=your_supabase_jwt_secret
PORT=5000
GMAIL_USER=your_gmail_address
GMAIL_PASS=your_gmail_app_password
```

```bash
npm start
```

### 3. Frontend setup

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
REACT_APP_API_URL=http://localhost:5000/api
```

```bash
npm start
```

The app runs at `http://localhost:3000`.

---

## How to Use

### As a Lecturer

1. Register and verify your email
2. Create a course — a 5-digit enrolment code is generated automatically
3. Share the code with your students
4. When ready to take attendance, open the course → Attendance tab
5. Set the scanning radius and click **Start Attendance**
6. Show the QR code to your class
7. Click **End Session** when done — At-Risk emails are sent automatically

### As a Student

1. Register and verify your email
2. Join a course using the enrolment code from your lecturer
3. When a session is active, go to the **Scan** tab → select the course
4. Allow camera and location permissions
5. Scan the QR code — you will get instant confirmation

---

## Known Limitations

- Desktop browsers use WiFi-based location which can be inaccurate by several kilometres. Lecturers should start sessions from a smartphone.
- The ML model is currently trained on synthetic data. Accuracy improves as real attendance data accumulates over semesters.

---
