# 📦 Feature Board

A lightweight, self-hostable Feature Request Management system with:

- **Feature submission + editing**
- **Configurable scoring criteria**
- **Automatic scoring + prioritization**
- **Admin user management**
- **Clean React UI with real-time updates**
- **REST API powered by Node.js, Express, and Prisma**

This project is ideal for teams needing a simple internal tool to prioritize feature work based on consistent, data-driven scoring.

## 🚀 Key Features

### ✔ Feature Management
- Create, edit, and delete feature requests
- Attributes include:
  - Title
  - Summary
  - Module
  - Status
  - Tags
  - Requested by
  - Decision notes
- Two-pane layout for list + editor
- Search and sort features

### ✔ Configurable Scoring System
- Add your own scoring questions from the database:
  - Label
  - Group (e.g., Engineering, Customer Impact)
  - Max score (5/10/20/etc.)
  - Negative indicators (reversed scoring)
- Sliders auto-calculate:
  - Total score
  - Priority band (High / Medium / Low)
- Feature list updates live when scoring changes

### ✔ Admin System
- Admin login (email + password)
- JWT (HttpOnly cookie) session auth
- Add / disable admin accounts
- Admin panel in the UI

### ✔ Modern Interface
- React + Vite powered UI
- Responsive grid layout
- Pinned sidebar with actions
- Tabs (Details / Scoring)
- Delete confirmation modal
- Clean, minimal styling

## 🏗 Project Structure

```
feature-board/
│
├── backend/               # Express + Prisma API
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.js
│   ├── src/
│   │   ├── server.js
│   │   ├── middleware/
│   │   ├── controllers/
│   │   ├── routes/
│   │   └── utils/
│   └── package.json
│
└── frontend/              # React + Vite app
    ├── src/
    │   ├── App.jsx
    │   ├── FeatureBoard.jsx
    │   ├── FeatureList.jsx
    │   ├── FeatureEditor.jsx
    │   ├── ScoreTabs.jsx
    │   └── api.js
    ├── index.html
    └── package.json
```

## ⚙️ Backend Setup

1. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Environment Variables (.env)**
   ```plaintext
   DATABASE_URL="mysql://user:pass@localhost:3306/feature_board"
   JWT_SECRET="YOUR_SECRET_KEY"
   JWT_EXPIRES_IN="7d"
   PORT=8080
   CORS_ORIGIN="http://localhost:5173"
   ```

3. **Create MySQL Database**
   ```sql
   CREATE DATABASE feature_board;

   CREATE USER 'fb_user'@'localhost' IDENTIFIED BY 'StrongPassword123!';
   GRANT ALL PRIVILEGES ON feature_board.* TO 'fb_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

4. **Run Migrations**
   ```bash
   npx prisma migrate dev
   ```

5. **Seed Default Admin**
   ```bash
   npx prisma db seed
   ```

   Default account:
   - Email: admin@example.com
   - Password: 1234

6. **Start Backend**
   ```bash
   npm run dev
   ```

   API runs at: [http://localhost:8080](http://localhost:8080)

## 💻 Frontend Setup

1. **Install Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Run Development Server**
   ```bash
   npm run dev
   ```

   Runs on: [http://localhost:5173](http://localhost:5173)

   The dev server automatically proxies `/api` to the backend.

## 🌐 API Overview

### Auth
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET  /api/auth/me`

### Features
- `GET    /api/features`
- `POST   /api/features`
- `GET    /api/features/:id`
- `PUT    /api/features/:id`
- `DELETE /api/features/:id`
- `PUT    /api/features/:id/answers`

### Scoring Questions
- `GET /api/questions`

### Admins
- `GET    /api/admins`
- `POST   /api/admins`
- `PUT    /api/admins/:id`
- `DELETE /api/admins/:id`

## 🛠 Technologies

### Backend
- Node.js
- Express.js
- Prisma ORM
- MySQL
- Zod validation
- JWT auth

### Frontend
- React (Hooks)
- Vite
- Lucide icons
- Fetch API
- CSS utility styles

## 📄 License

This project is released under the MIT License, allowing commercial and private use.