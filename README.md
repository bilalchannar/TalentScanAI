# TalentScanAI 🚀

TalentScanAI is a state-of-the-art, full-stack recruitment platform designed to bridge the gap between recruiters and top talent using AI-driven insights. It features a modern, glassmorphic dashboard, dual-role access (Recruiter & Candidate), and a powerful resume-job matching engine.

## 🌟 Key Features

### 🏢 For Recruiters
- **Job Posting Portal**: Create and manage job opportunities with detailed requirements.
- **Candidate AI Ranking**: Automatically rank candidates based on their match score with the job description.
- **Talent Analytics**: Real-time dashboard showing database size, unique skills, and application trends.
- **Application Management**: View and process applications from interested candidates.
- **Admin Panel**: Manage user roles, blocks, and view detailed audit logs.

### 👤 For Candidates
- **Professional Job Feed**: Discover new opportunities tailored to your skill set.
- **One-Click Application**: Apply to jobs instantly using your pre-uploaded and parsed resumes.
- **Application History**: Track the status of your sent applications in real-time.
- **Profile Management**: Update your professional identity and contact information.

### 🛡️ Core Infrastructure
- **Dual Authentication**: Secure JWT-based login with role-specific access control.
- **Responsive Design**: Premium dark-mode interface with smooth animations and intuitive navigation.
- **Dockerized Workflow**: Fully containerized environment with auto-reloading for development.

## 🛠️ Tech Stack

### Frontend
- **Framework**: Svelte
- **Routing**: `svelte-spa-router`
- **Styling**: Vanilla CSS (Premium Glassmorphism)
- **Bundler**: Rollup

### Backend
- **Framework**: Flask (Python 3.9)
- **Database**: MongoDB
- **Authentication**: JWT (JSON Web Tokens)
- **Containerization**: Docker & Docker Compose

## 🔑 Environment Variables

The backend relies on the following environment variables (defined in `Backend/.env` or injected via Docker):

```env
MONGO_DATABASE_NAME=TalentScanAI
MONGO_CONNECTION_URL=mongodb://localhost:27017/TalentScanAI # Use mongodb://mongo:27017/TalentScanAI in Docker
JWT_SECRET_KEY=your-super-secret-key
JWT_EXP_MINUTES=120
RESET_TOKEN_EXP_MINUTES=15
ALLOW_PUBLIC_RECRUITER_SIGNUP=true
EXPOSE_RESET_TOKEN=false
FLASK_DEBUG=true

# Email System (Required for forgot password and notifications)
EMAIL_SEND_ENABLED=true
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password    # Use an App Password, not your standard password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
CLIENT_URL=http://localhost:5000
```

## 🚀 Getting Started

### Quick Start with Docker (Recommended)
Spin up the entire ecosystem (Frontend, Backend, MongoDB, Mongo-Express) with a single command:
```bash
docker compose up --build
```
- **Frontend**: http://localhost:5000
- **Backend API**: http://localhost:3000
- **Mongo Express**: http://localhost:8082 (admin/change-this-password)

*The development environment supports **Hot Reloading**. Changes to code will reflect instantly.*

### Manual Setup

#### Database
Make sure you have MongoDB running locally on port `27017`.

#### Backend
```bash
cd Backend
pip install -r requirements.txt
python app.py
```

#### Frontend
```bash
cd Frontend
npm install
npm run dev
```

## 📂 Project Structure

```text
.
├── Backend/                 # Flask REST API
│   ├── app.py               # API routes & Core logic
│   ├── email_templates.py   # Reusable HTML email bodies
│   ├── Dockerfile           # Backend containerization
│   └── requirements.txt     # Python libraries
├── Frontend/                # Svelte Frontend
│   ├── src/                 # Svelte components & Pages
│   ├── public/              # Static build files
│   ├── Dockerfile           # Multi-stage production build
│   └── rollup.config.js     # Bundler configuration
├── compose.yaml             # Docker orchestration
└── README.md                # Project documentation
```

## ✅ Final Testing Checklist

Before deploying to production, ensure you have tested the following flows:

- [ ] **Infrastructure**: Backend, Frontend, and MongoDB start without errors.
- [ ] **Auth**: Registration, Login, Logout, and Role-Based Access Control work.
- [ ] **Email System**: Password Reset emails generate properly and links are secure.
- [ ] **Resume Engine**: PDF Upload works, duplicate checks trigger, AI/ATS scores generate.
- [ ] **Recruiter Flow**: Job Posting, Job Statuses, Candidate Ranking, Interview Scheduling.
- [ ] **Candidate Flow**: Feed viewing, One-click applying, Profile tracking, Cover Letter generator.
- [ ] **Notifications**: In-app unread badges update, Emails send for status changes.
- [ ] **Security**: Super Admin hierarchy blocks unauthorized changes, Audit logs track critical actions.
- [ ] **UI**: Dark/Light mode toggles cleanly, responsive hamburger menu functions correctly on mobile.

## 🛡️ License
This project is licensed under the MIT License.

---
Developed with ❤️ by [Bilal Channar](https://github.com/bilalchannar)
