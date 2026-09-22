# Stock Screener Frontend

Professional stock screening and messaging platform - React frontend.

## Project Structure

```
stock-screener-frontend/
├── public/
│   └── index.html
├── src/
│   ├── App.js
│   └── index.js
├── package.json
├── .gitignore
└── README.md
```

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env` file in root:**
   ```
   REACT_APP_API_URL=https://stock-screener-backend.onrender.com/api
   REACT_APP_SOCKET_URL=https://stock-screener-backend.onrender.com
   ```

3. **Start development server:**
   ```bash
   npm start
   ```

## Build for Production

```bash
npm run build
```

## Features

- User authentication (Login/Register)
- Real-time messaging with Socket.io
- User profiles with avatars
- Admin panel for wallpaper management
- User approval system
- Professional dark theme UI

## Environment Variables

- `REACT_APP_API_URL` - Backend API URL
- `REACT_APP_SOCKET_URL` - Socket.io server URL
