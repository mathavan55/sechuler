
# TaskFlow - Smart Scheduler & Productivity Tracker

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

**TaskFlow** is a full-stack productivity application designed to demonstrate robust relational database design and backend engineering. It allows users to manage tasks, track productivity analytics, and maintain a digital media journal.

> **Note:** This project was developed as part of a **Database Design and Engineering** course experiment to demonstrate schema normalization, CRUD operations, and backend-database connectivity.

---

## 🚀 Key Features

-   **Task Management:** Create, update, and delete tasks.
-   **Task Types:**
    -   **Limited:** One-time tasks with strict deadlines.
    -   **Daily:** Recurring tasks that automatically reset at midnight (00:00).
-   **Smart Alarms:** Browser-based audio/visual alerts triggered 10 minutes before a deadline.
-   **Productivity Analytics:**
    -   Daily progress rings.
    -   Weekly and Monthly completion averages.
    -   Monthly Calendar Heatmap visualization.
-   **Media Journal:** Upload text notes, images, or videos to document specific days.
-   **Secure Auth:** User authentication using JWT (JSON Web Tokens) and Bcrypt password hashing.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | HTML5, CSS3 (Custom Properties), Vanilla JavaScript (ES6+) |
| **Backend** | Node.js, Express.js |
| **Database** | MySQL (Relational DB) |
| **Tools** | Postman (API Testing), Nodemon, Multer (File Uploads) |

---

## 🗄️ Database Design

The application uses a **Normalized Relational Schema** to ensure data integrity and reduce redundancy.

**Core Tables:**
1.  **`users`**: Stores user credentials and profile data.
2.  **`tasks`**: Stores task details. Includes Foreign Key to `users`.
3.  **`daily_progress`**: Tracks completion status of recurring tasks.
4.  **`progress_history`**: Stores aggregated daily statistics for analytics.
5.  **`media_uploads`**: Stores file paths for the journal feature.

**Relationships:**
-   One `User` has many `Tasks` (1:N).
-   One `Task` has many `Daily_Progress` entries (1:N).

---

## 📁 Project Structure

```
scheduler-app/
├── backend/
│   ├── config/           # Database connection setup
│   ├── middleware/       # Auth middleware (JWT verification)
│   ├── models/           # Database query logic
│   ├── routes/           # API endpoints (Auth, Tasks, Media)
│   ├── uploads/          # Stored media files
│   └── server.js         # Application entry point
├── frontend/
│   ├── css/              # Stylesheets
│   ├── js/               # Client-side logic
│   ├── index.html        # Login Page
│   ├── scheduler.html    # Main Dashboard
│   ├── monthly.html      # Calendar View
│   └── media.html        # Journal Page
├── scheduler_db.sql      # Database Schema Script
├── .env                  # Environment Variables
└── README.md
```

---

## ⚙️ Installation & Setup

Follow these steps to run the project locally.

### Prerequisites
-   Node.js (v14 or higher)
-   MySQL Server (v5.7 or higher)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/taskflow-scheduler.git
cd taskflow-scheduler
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Database
1.  Open **MySQL Workbench** or Command Line.
2.  Run the SQL script provided in `scheduler_db.sql` to create the database and tables.

```sql
CREATE DATABASE scheduler_db;
USE scheduler_db;
-- Execute the rest of the schema...
```

### 4. Configure Environment Variables
Create a `.env` file in the root directory and add the following:

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=scheduler_db

JWT_SECRET=your_super_secret_key
```

### 5. Run the Application
```bash
npm start
```
The app will be running at `http://localhost:3000`.

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **Auth** | | |
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login user |
| **Tasks** | | |
| `POST` | `/api/tasks` | Create a new task |
| `GET` | `/api/tasks/date/:date` | Get tasks for a specific date |
| `PUT` | `/api/tasks/:id/complete` | Mark task as complete |
| `GET` | `/api/tasks/stats` | Get weekly/monthly stats |
| **Media** | | |
| `POST` | `/api/media/upload` | Upload media file/note |
| `GET` | `/api/media/date/:date` | Get media for a date |

---

## 👤 Author

**[Your Name]**
-   **GitHub:** [your-username](https://github.com/mathavan55)
-   **LinkedIn:** [your-linkedin](https://linkedin.com/in/mathavan-m)
-   **Email:** mathavanab84@gamil.com

---

## 📚 References

1.  **Node.js Documentation** - [https://nodejs.org/en/docs/](https://nodejs.org/en/docs/)
2.  **Express.js Guide** - [https://expressjs.com/en/guide/routing.html](https://expressjs.com/en/guide/routing.html)
3.  **MySQL 8.0 Reference Manual** - [https://dev.mysql.com/doc/refman/8.0/en/](https://dev.mysql.com/doc/refman/8.0/en/)
4.  **MDN Web Docs (JavaScript/HTML/CSS)** - [https://developer.mozilla.org/](https://developer.mozilla.org/)
5.  **JWT.io (JSON Web Tokens)** - [https://jwt.io/introduction](https://jwt.io/introduction)
```
