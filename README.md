# 🎓 AIP211 Web Development Project — Online Examination System

An autonomous, secure, and proctored academic evaluation web portal engineered for **Indian Institute of Information Technology Kota (IIIT Kota)** for the course **AIP211: Web Development**. Built with a decoupled architecture utilizing **HTML5, Pure External CSS3, Vanilla JavaScript, Procedural PHP, and MySQL**.

---

## 👥 Project Team Members

| S.No. | Student ID (Roll No.) | Student Name | Role / Contribution |
|:---:|:---:|:---|:---|
| **1** | `2025KUCP1131` | **Deepanshu Lath** | Backend + Database |
| **2** | `2025KUCP1130` | **Ayush Raj** | Backend|
| **3** | `2025KUCP1132` | **Shahbaz Alam** |Frontend |
| **4** | `2025KUCP1129` | **Sanjeet Yadav** | Frontend |
| **5** | `2025KUCP1123` | **Manas Kumar** | JavaScript |

---

## 🌐 Live Production Deployment

| Resource | URL / Environment Details |
|---|---|
| **Live Deployed Website** | 🔗 **[http://iiitkota-exam.great-site.net/](http://iiitkota-exam.great-site.net/)** |
| **GitHub Repository** | 🔗 **[https://github.com/Deepanshu0896/ExamPortalAIP211](https://github.com/Deepanshu0896/ExamPortalAIP211)** |
| **Web Server & Hosting** | InfinityFree Apache Web Server with PHP 8.x execution |
| **Database Server** | MySQL 8.x Relational Database (`sql109.infinityfree.com`) |
| **Routing Architecture** | Automated root traffic routing (`index.php` / `index.html`) to responsive `frontend/` with procedural REST endpoints |

---

## 💻 Tech Stack Used

| Layer | Technologies & Tools | Key Technical Capabilities |
|---|---|---|
| **Frontend Presentation** | **HTML5 Semantics** | Semantic structure (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<footer>`), scientific/math notations (`<sub>`, `<sup>`), `<pre>` code formatting, `<hr>`, `<big>`, `<small>`, and responsive `<iframe>` integration. |
| **Frontend Styling** | **Pure External CSS3** | 100% external modular stylesheets (`style.css`, `animations.css`, `syllabus.css`). Modern layout engines (Flexbox & CSS Grid), 3D card perspective flips (`perspective: 1000px`, `transform: rotateY(180deg)`), 2D hover elevations, sticky proctor bars, and high-contrast alert design. **Strict Zero Inline Styles policy** (0 `<style>` tags, 0 `style="..."` attributes). |
| **Client-Side Logic** | **Vanilla JavaScript (ES6+)** | Pure native DOM scripting, dual client storage (`localStorage` & `sessionStorage`), Fetch API asynchronous REST data synchronization, Fisher-Yates array shuffling for question randomization, countdown proctoring timer with force-submit triggers, dynamic 3D card injection, and modal dialog control. |
| **Backend & Routing** | **Procedural PHP 8.x** | Native PHP session state management (`$_SESSION`), RESTful JSON endpoints (`get_subjects.php`, `get_questions.php`, `get_results.php`), dynamic form evaluation (`$_POST`), and server-side RBAC gating. |
| **Database Management** | **MySQL 8.x (Relational)** | Normalized relational database schema (`online_exam_db`) supporting candidate authentication (`users`), curriculum inventory (`subjects`), multiple-choice bank (`questions`), and immutable assessment transcripts (`results`). |
| **Architecture Model** | **Decoupled Dual-Mode** | Seamless execution across both static offline preview (`file://` protocol / Live Server with client-side grading fallback) and full-stack production server (`http://localhost/` with PHP & MySQL). |

---

## 🚀 Features Implemented

### 1. Role-Based Access Control (RBAC) & Authentication
- **Student Portal:** Authenticated examinees enter their dedicated exam lobby, review guidelines, attempt live unlocked tests, and access personal verified marksheets.
- **Faculty Admin Console:** Administrative privileges to manage courses, define question pools, control paper availability, and verify institute-wide academic records.
- **Strict Route Guarding (Protected Mode):** Direct unauthorized access to `exam.html` or `results.html` is gated; unauthenticated visitors receive an official authentication barrier prompting login.

### 2. Dynamic Subject & Curriculum Management
- **Course Registration:** Administrators can register new subjects dynamically (Course Code, Title, Module Description, Custom Questions per paper).
- **One-Click Paper Lock & Unlock:** Real-time restriction shield allows faculty to seal or publish examination papers on demand.
- **Subject Deletion with Cascading Cleanup:** Faculty can delete custom subjects, automatically purging associated question bank entries. Built-in core subjects (WT, DS, DBMS) are protected against accidental deletion.

### 3. Dynamic Question Bank & Fisher-Yates Randomization
- **Modular Question Creation:** Administrators can add multiple-choice questions (statement, options A–D, correct answer key, marks).
- **Dynamic Exam Generation:** When a candidate starts a paper, the portal dynamically queries the database, randomizes the question order using the Fisher-Yates algorithm, and renders the requested question quota.
- **Dynamic Marking Scheme:** Marks per question adjust automatically based on total questions rendered (e.g., 5 questions = 2.0 marks each; 2 questions = 5.0 marks each out of 10 total marks).

### 4. Live Proctoring & Session Integrity
- **Synchronized Countdown Timer:** 10-minute countdown proctor bar with high-visibility visual warning pulse when under 2 minutes.
- **Automated Force Submission:** Automatically submits candidate responses to the server immediately when countdown concludes.
- **State Shielding:** Countdown timer remains dormant and examination forms are locked out if the paper is sealed by admin.

### 5. High-Precision Scoring & Evaluation
- **Question-ID Bound Grading:** Shuffled candidate answers are submitted and evaluated against unique database question IDs (`question_ids[]`), completely preventing scoring mismatches caused by question order shuffling.
- **Official IIIT Kota 10-Point Credit Scale:** Automates letter grade assignment ($A^+$, $A$, $B^+$, $B$, $C^+$, $C$, $D$, $F$) and SGPA calculation.

### 6. Student Privacy & Marks Verification
- **Student Marksheet Privacy:** Under IIIT Kota privacy regulations, logged-in students can strictly inspect only their own verified semester transcripts and SGPA.
- **Admin Verification Console:** Faculty administrators can inspect all enrolled candidates simultaneously or filter records by specific candidate Roll Number and Module Subject.

### 7. Interactive 3D Card Dashboard & Responsive UI
- **3D Flipping Cards:** Interactive course overview cards flip on hover (`rotateY(180deg)`) displaying course specifications, questions count, and direct "Start Test" or "View Lock Notice" CTAs.
- **Live Status Badges:** Dynamic `Live Now` (green) and `Paper Locked` (red) indicators reflect real-time database state across all navigation menus and cards.
- **Marquee Announcement Ticker:** Continuous header marquee broadcasting proctored session notices.

---

## 🛡️ Scope of Error & Handled Edge Cases

1. **Client/Server Cross-Tab State Synchronization:**
   - *Problem:* Admin updates made in MySQL were previously invisible to students open in separate browser tabs or incognito windows without a shared cache.
   - *Solution:* Implemented lightweight REST APIs (`get_subjects.php` and `get_questions.php`) that synchronize live MySQL state into local memory on every page load.

2. **Question Shuffling Answer Evaluation Discrepancy:**
   - *Problem:* Randomizing question order on the client broke sequential answer keys (`q1`, `q2`, `q3`).
   - *Solution:* Form now embeds unique database question IDs (`question_ids[]`). The scoring engine evaluates each submitted answer against its specific database question record regardless of shuffle position.

3. **URL Parameter Manipulation & Unknown Subject Access:**
   - *Problem:* Manual URL tampering (e.g., `exam.html?subject=INVALID99`) could cause crashes or unintended default test loads.
   - *Solution:* Input normalization maps variations (e.g., `CS201` $\to$ `WT`, `CS202` $\to$ `DS`). Unregistered subjects trigger a clear "Course Not Found" advisory card.

4. **Locked Paper Bypass Attempts:**
   - *Problem:* A student attempting to force-submit answers to a sealed paper via direct POST requests or developer console tools.
   - *Solution:* Dual-layer enforcement. Frontend hides form and suppresses timer; backend `submit_exam.php` verifies subject lock state in MySQL and terminates unauthorized submissions immediately with HTTP 403 / Access Denied.

5. **Student Privacy Leakage:**
   - *Problem:* Students viewing other candidates' marks or switching roll numbers in client search forms.
   - *Solution:* Role-based UI gating removes the candidate selector and roll input for student sessions; the backend validates identity against session data.

6. **Static vs. Live Server Portability (Zero-Crash Fallback):**
   - *Problem:* Reviewing the project directly via file double-click (`file://`) without XAMPP or PHP installed.
   - *Solution:* Dual-mode architecture seamlessly falls back to client-side scoring, local storage state, and pre-seeded question pools so the portal remains 100% interactive offline.

---

## ⚠️ Things Not Covered (Current Limitations & Scope Boundaries)

- **AI/Webcam Video Proctoring:** No live video stream recording, pupil tracking, or multi-person room detection. Proctoring relies on session countdowns and route authentication.
- **Fullscreen & Tab-Switch Lockdown:** Does not enforce browser kiosk mode or disqualify students on window blur/tab switching.
- **Non-MCQ Question Types:** Subjective essay questions, handwritten diagram submissions, and live code compiler environments are not included; all questions are currently multiple-choice.
- **Multi-Section Timed Papers:** Test sessions feature a single overall 10-minute timer rather than partitioned timers per section (e.g., Separate Aptitude, Reasoning, and Technical sections).
- **Bulk Spreadsheet Upload:** Question banks and candidate lists are managed individually through the Admin UI or via SQL scripts, rather than direct Excel/CSV upload.
- **Multi-Factor Authentication (MFA):** Authentication uses university Roll Number and Password; email/SMS OTP verification is not integrated.

---

## 🔮 Future Scope

1. **AI-Assisted Remote Proctoring:** Integration of WebRTC video streams with computer vision models for automated gaze tracking, anomaly detection, and background noise monitoring.
2. **Integrated Code Judge & Sandbox:** Dockerized code execution environment (supporting C++, Java, Python) for automated grading of programming problems with time/memory limit validation.
3. **Bulk Data Management:** CSV/Excel batch upload utility for importing semester question banks and exporting tabulated grade sheets for university examination cells.
4. **Comprehensive Faculty Analytics:** Visual graphical dashboards showing question difficulty index, discrimination index, score distribution histograms, and topic-wise weakness analysis.
5. **LDAP & University Single Sign-On (SSO):** Integration with institutional OAuth 2.0 / SAML identity providers for seamless single sign-on across campus portals.
6. **Negative Marking & Adaptive Testing:** Configurable penalty schemes for incorrect answers and dynamic difficulty scaling based on candidate response history.

---

## ⚡ How to Run & Test the Project

### Option A: Live Deployed Portal (Instant Access — No Installation Required)
Directly access the live production portal hosted on InfinityFree:
👉 **[http://iiitkota-exam.great-site.net/](http://iiitkota-exam.great-site.net/)**

### Option B: Connecting the Full Backend with XAMPP (Local Full-Stack)
1. Copy the `online-exam-system` folder into your XAMPP web root:
   ```text
   C:\xampp\htdocs\online-exam-system
   ```
2. Launch **XAMPP Control Panel** and start **Apache** and **MySQL**.
3. Open `http://localhost/phpmyadmin` in your web browser.
4. Create a database named `online_exam_db`.
5. Import `database/schema.sql` (and optionally `database/seed_results.sql` for pre-calculated records).
6. Access the portal locally:
   ```text
   http://localhost/online-exam-system/frontend/index.html
   ```

### Option C: Pure Frontend Static Testing (No Server Needed)
1. Navigate to the `frontend/` directory.
2. Double-click `index.html` to open directly in Google Chrome, Microsoft Edge, or Mozilla Firefox.
3. All interactive features (login simulation, test lobbies, 3D flip cards, timer proctoring, client-side grading, and scorecard verification) operate fully in offline mode.

---

## 🔑 Demo Credentials for Testing

| Role | Roll Number / User ID | Password | Destination Dashboard |
|---|---|---|---|
| **Student Candidate 1** | `21CS101` | `pass123` | Student Exam Lobby & Personal Marksheet |
| **Student Candidate 2** | `21CS102` | `pass123` | Student Exam Lobby & Personal Marksheet |
| **Faculty Administrator** | `ADMIN01` | `admin123` | Faculty Control Console & Gradebook |

---

<p align="center">
  <strong>IIIT Kota — Department of Computer Science &amp; Engineering</strong><br>
  AIP211 Web Development Project • Academic Session 2026
</p>
