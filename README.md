# TalentScanAI 🚀

TalentScanAI is a state-of-the-art, full-stack recruitment platform designed to bridge the gap between recruiters and top talent using AI-driven insights. It features a modern, glassmorphic dashboard, dual-role access (Recruiter & Candidate), and a powerful resume-job matching engine.

## 🌟 Key Features

### 🏢 For Recruiters
- **Job Posting Portal**: Create and manage job opportunities with detailed requirements.
- **Candidate AI Ranking**: Automatically rank candidates based on their match score with the job description.
- **Talent Analytics**: Real-time dashboard showing database size, unique skills, and application trends.
- **Application Management**: View and process applications from interested candidates.

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

## 🚀 Getting Started

### Quick Start with Docker (Recommended)
Spin up the entire ecosystem (Frontend, Backend, MongoDB, Mongo-Express) with a single command:
```bash
docker compose up --build
```
*The development environment supports **Hot Reloading**. Changes to code will reflect instantly.*

### Manual Setup

#### Backend
1. `cd Backend`
2. `pip install -r requirements.txt`
3. Configure environment variables (see `.env` section).
4. `python app.py`

#### Frontend
1. `cd Frontend`
2. `npm install`
3. `npm run dev`

## 📂 Project Structure

```text
.
├── Backend/                 # Flask REST API
│   ├── app.py               # API routes & Core logic
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

## 🛡️ License
This project is licensed under the MIT License.

---
Developed with ❤️ by [Bilal Channar](https://github.com/bilalchannar)
