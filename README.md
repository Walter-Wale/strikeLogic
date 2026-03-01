# StrikeLogic - Football Data Retrieval & Analysis Platform

![Status](https://img.shields.io/badge/status-active-success.svg)
![License](https://img.shields.io/badge/license-ISC-blue.svg)

A professional-grade, modular football data scraper and analysis platform built with React, Node.js, and Puppeteer. StrikeLogic retrieves match fixtures, team form data, and head-to-head history from FlashScore.com with intelligent idempotency and real-time logging.

## 🎯 Features

- **Real-Time Match Data Scraping** - Automated retrieval of football fixtures from FlashScore.com
- **Head-to-Head Analysis** - Detailed H2H history and team form analysis with three distinct sections:
  - Home Team Recent Form (Last 5 matches)
  - Away Team Recent Form (Last 5 matches)
  - Historical Head-to-Head (Last 5 encounters)
- **Intelligent Idempotency** - Avoids redundant scraping by checking database cache
- **Real-Time Logging** - Live scraper status updates via Socket.io
- **Stealth Mode** - Puppeteer with stealth plugin to avoid detection
- **Material UI Interface** - Professional, responsive React frontend
- **MySQL Database** - Sequelize ORM with auto-sync capabilities

## 🛠️ Technology Stack

### Client

- **React.js** (v18.2) - UI framework
- **Material UI (MUI)** - Component library
- **Socket.io-client** - Real-time communication
- **Axios** - HTTP client
- **Day.js** - Date manipulation

### Server

- **Node.js** + **Express.js** - Backend framework
- **Puppeteer** + **Stealth Plugin** - Web scraping
- **Sequelize** (v6.35) - ORM
- **MySQL2** - Database driver
- **Socket.io** - Real-time server

### Database

- **MySQL** via XAMPP/phpMyAdmin
- Database Name: `flashscore_db`

## 📁 Project Structure

```
strikeLogic/
├── client/                     # React frontend
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── DatePicker.jsx
│   │   │   ├── LeagueSelector.jsx
│   │   │   ├── MatchTable.jsx
│   │   │   ├── LogConsole.jsx
│   │   │   └── H2HModal.jsx
│   │   ├── services/          # API and Socket services
│   │   │   ├── apiService.js
│   │   │   └── socketService.js
│   │   ├── App.js             # Main application
│   │   ├── theme.js           # MUI theme config
│   │   └── index.js           # Entry point
│   └── package.json
├── server/                     # Node.js backend
│   ├── config/                # Configuration
│   │   ├── config.json        # Database credentials
│   │   └── socketConfig.js    # Socket.io setup
│   ├── models/                # Sequelize models
│   │   ├── index.js           # Auto-loading models
│   │   ├── league.js
│   │   ├── match.js
│   │   └── h2hHistory.js
│   ├── services/              # Business logic
│   │   ├── DatabaseService.js
│   │   └── ScraperService.js
│   ├── controllers/           # Route handlers
│   │   ├── matchesController.js
│   │   └── h2hController.js
│   ├── routes/                # API routes
│   │   ├── matches.js
│   │   └── h2h.js
│   ├── utils/                 # Utilities
│   │   ├── socketLogger.js
│   │   ├── delay.js
│   │   ├── DataCleaner.js
│   │   └── expandMatches.js
│   ├── app.js                 # Express app setup
│   ├── server.js              # Entry point
│   └── package.json
└── shared/                     # Shared resources
    └── selectors.js           # CSS selectors for scraping
```

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- XAMPP (MySQL & phpMyAdmin)
- Git

### Installation

#### 1. Clone the repository

```bash
cd "c:\Users\ze9097927\Documents\Power planning work\applications\stikeLogic"
```

#### 2. Setup Database

1. Install and start XAMPP
2. Start Apache and MySQL services
3. Open phpMyAdmin: http://localhost/phpmyadmin
4. Create database: `flashscore_db`
5. Tables will auto-create on first server run

#### 3. Install Server Dependencies

```bash
cd server
npm install
```

#### 4. Install Client Dependencies

```bash
cd ../client
npm install
```

### Running the Application

#### Start the Server (Terminal 1)

```bash
cd server
npm start
```

Server runs on: http://localhost:5000

#### Start the Client (Terminal 2)

```bash
cd client
npm start
```

Client opens on: http://localhost:3000

## 📚 API Documentation

### Endpoints

#### GET /matches

Fetch matches for a specific date with optional league filtering.

**Query Parameters:**

- `date` (required) - Format: YYYY-MM-DD
- `leagues[]` (optional) - Array of league names

**Example:**

```
GET http://localhost:5000/matches?date=2026-02-28&leagues[]=Premier League
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "flashscoreId": "8QPNvIdp",
      "homeTeam": "Arsenal",
      "awayTeam": "Chelsea",
      "matchDate": "2026-02-28",
      "matchTime": "15:00",
      "status": "scheduled",
      "league": { "name": "Premier League" }
    }
  ],
  "count": 1
}
```

#### GET /h2h/:matchId/:flashscoreId

Fetch H2H and form data for a specific match.

**Parameters:**

- `matchId` - Database match ID
- `flashscoreId` - FlashScore match identifier

**Example:**

```
GET http://localhost:5000/h2h/1/8QPNvIdp
```

**Response:**

```json
{
  "success": true,
  "data": {
    "HOME_FORM": [...],
    "AWAY_FORM": [...],
    "DIRECT_H2H": [...]
  }
}
```

## 🗄️ Database Schema

### Tables

#### `leagues`

| Column             | Type     | Description                |
| ------------------ | -------- | -------------------------- |
| id                 | INT (PK) | Auto-increment primary key |
| name               | VARCHAR  | League name (unique)       |
| country            | VARCHAR  | Country/region             |
| flashscoreLeagueId | VARCHAR  | FlashScore league ID       |

#### `matches`

| Column       | Type     | Description                                 |
| ------------ | -------- | ------------------------------------------- |
| id           | INT (PK) | Auto-increment primary key                  |
| flashscoreId | VARCHAR  | FlashScore match ID (unique)                |
| leagueId     | INT (FK) | Foreign key to leagues                      |
| homeTeam     | VARCHAR  | Home team name                              |
| awayTeam     | VARCHAR  | Away team name                              |
| matchDate    | DATE     | Match date                                  |
| matchTime    | VARCHAR  | Match time                                  |
| homeScore    | INT      | Home team score                             |
| awayScore    | INT      | Away team score                             |
| status       | ENUM     | scheduled/live/finished/postponed/cancelled |
| h2hScraped   | BOOLEAN  | H2H data scraped flag                       |

#### `h2h_history`

| Column        | Type     | Description                    |
| ------------- | -------- | ------------------------------ |
| id            | INT (PK) | Auto-increment primary key     |
| parentMatchId | INT (FK) | Foreign key to matches         |
| sectionType   | ENUM     | HOME_FORM/AWAY_FORM/DIRECT_H2H |
| matchDate     | DATE     | Historical match date          |
| homeTeam      | VARCHAR  | Home team name                 |
| awayTeam      | VARCHAR  | Away team name                 |
| homeScore     | INT      | Home team score                |
| awayScore     | INT      | Away team score                |
| competition   | VARCHAR  | Competition name               |

## 🔧 Configuration

### Server Configuration

Edit `server/config/config.json`:

```json
{
  "development": {
    "username": "root",
    "password": "",
    "database": "flashscore_db",
    "host": "127.0.0.1",
    "dialect": "mysql"
  }
}
```

### FlashScore Selectors

Update CSS selectors in `shared/selectors.js` if FlashScore changes their DOM structure.

## 🎨 UI Features

- **Date Picker** - Select match date for scraping
- **League Filter** - Multi-select autocomplete for filtering
- **Match Table** - DataGrid with pagination and sorting
- **Log Console** - Real-time terminal-style scraper logs
- **H2H Modal** - Tabbed interface for analyzing:
  - Home team recent form
  - Away team recent form
  - Head-to-head history

## ⚠️ Important Notes

1. **CSS Selectors** - FlashScore may update their DOM structure. Update selectors in `shared/selectors.js` accordingly.

2. **Rate Limiting** - 3-second delay between requests to mimic human behavior. Adjust in `server/utils/delay.js`.

3. **Idempotency** - Data is cached in database. Delete records to force re-scraping.

4. **Headless Mode** - Set `headless: false` in `ScraperService.js` for debugging.

5. **XAMPP** - Ensure MySQL is running before starting the server.

## 🐛 Troubleshooting

### Database Connection Error

- Verify MySQL is running in XAMPP
- Check credentials in `config/config.json`
- Ensure database `flashscore_db` exists

### Socket.io Connection Failed

- Verify server is running on port 5000
- Check CORS configuration in `socketConfig.js`
- Ensure no firewall blocking

### Scraping Errors

- FlashScore DOM may have changed - update selectors
- Try running in non-headless mode for debugging
- Check browser console for Puppeteer errors

## 📝 License

ISC

## 👨‍💻 Development

### Scripts

**Server:**

- `npm start` - Start production server
- `npm run dev` - Start with nodemon (auto-restart)

**Client:**

- `npm start` - Start development server
- `npm run build` - Build production bundle

## 🔮 Future Enhancements

- [ ] Add authentication/authorization
- [ ] Implement rate limiting on API
- [ ] Add data export (CSV/JSON)
- [ ] Machine learning prediction models
- [ ] Advanced statistics and visualizations
- [ ] Docker containerization
- [ ] CI/CD pipeline

---

**Built with ⚽ by the StrikeLogic Team**
