# TalentScanAI 🚀

TalentScanAI is a comprehensive full-stack application designed to streamline the recruitment process. It allows for efficient resume management, user authentication, and a modern dashboard interface.

## 🌟 Key Features

- **User Authentication**: Secure login and signup system with JWT-based authentication.
- **Password Management**: Features for password recovery, reset, and secure password changes.
- **Resume Management**: Upload, list, and delete resumes with ease.
- **Modern UI**: A responsive and intuitive frontend built with Svelte.
- **Robust Backend**: A scalable Flask-based RESTful API with MongoDB integration.
- **Dockerized**: Includes Docker and Docker Compose support for easy deployment.

## 🛠️ Tech Stack

### Frontend
- **Framework**: Svelte
- **Bundler**: Rollup
- **Styling**: Modern CSS

### Backend
- **Language**: Python (Flask)
- **Database**: MongoDB
- **Authentication**: JWT (JSON Web Tokens)
- **Containerization**: Docker & Docker Compose

## 🚀 Getting Started

### Prerequisites
- Node.js (v14+)
- Python (v3.8+)
- MongoDB
- Docker (optional)

### Backend Setup
1. Navigate to the `Backend` directory:
   ```bash
   cd Backend
   ```
2. Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Set up environment variables:
   Create a `.env` file or export the following:
   - `MONGO_CONNECTION_URL`
   - `MONGO_DATABASE_NAME`
5. Run the application:
   ```bash
   python app.py
   ```

### Frontend Setup
1. Navigate to the `Frontend` directory:
   ```bash
   cd Frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

### Running with Docker
You can spin up the entire environment using Docker Compose:
```bash
docker-compose up --build
```

## 📂 Project Structure

```text
.
├── Backend/                 # Flask REST API
│   ├── app.py               # Main application entry point
│   ├── requirements.txt     # Python dependencies
│   └── Dockerfile           # Backend container configuration
├── Frontend/                # Svelte Frontend
│   ├── src/                 # Source files
│   ├── public/              # Static assets
│   └── rollup.config.js     # Bundler configuration
└── README.md                # Project documentation
```

## 🛡️ License

This project is licensed under the MIT License - see the LICENSE file for details.

---
Developed with ❤️ by [Bilal Channar](https://github.com/bilalchannar)
