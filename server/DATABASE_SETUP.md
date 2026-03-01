# Database Setup Guide for StrikeLogic

This guide will help you set up the MySQL database for the StrikeLogic application using XAMPP and phpMyAdmin.

## Prerequisites

- XAMPP installed on your system
- Basic understanding of MySQL and phpMyAdmin

## Step-by-Step Setup

### 1. Install XAMPP

If you haven't already installed XAMPP:

1. Download XAMPP from: https://www.apachefriends.org/
2. Run the installer
3. Follow installation wizard (default settings recommended)
4. Install to: `C:\xampp` (Windows) or `/Applications/XAMPP` (Mac)

### 2. Start MySQL Service

1. Open XAMPP Control Panel
2. Click **Start** next to **Apache** (for phpMyAdmin web interface)
3. Click **Start** next to **MySQL** (database service)
4. Both services should show **green** status

![XAMPP Control Panel](https://via.placeholder.com/600x200.png?text=XAMPP+Control+Panel)

### 3. Access phpMyAdmin

1. Open your web browser
2. Navigate to: http://localhost/phpmyadmin
3. You should see the phpMyAdmin interface

### 4. Create Database

#### Option A: Using phpMyAdmin Interface

1. Click on **"Databases"** tab at the top
2. In "Create database" section:
   - Database name: `flashscore_db`
   - Collation: `utf8_general_ci` (default)
3. Click **"Create"** button

#### Option B: Using SQL Query

1. Click on **"SQL"** tab
2. Enter the following SQL command:
   ```sql
   CREATE DATABASE flashscore_db CHARACTER SET utf8 COLLATE utf8_general_ci;
   ```
3. Click **"Go"** button

### 5. Verify Database Creation

1. In the left sidebar, you should now see `flashscore_db` listed
2. Click on it to select the database
3. It will be empty initially (no tables yet)

### 6. Configure Server Connection

The server configuration file is located at: `server/config/config.json`

Default configuration:
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

#### If you changed MySQL root password:

1. Open `server/config/config.json`
2. Update the `password` field with your MySQL root password:
   ```json
   "password": "your_password_here"
   ```

#### If using a different database name:

1. Create database with your chosen name in phpMyAdmin
2. Update `config.json`:
   ```json
   "database": "your_database_name"
   ```

### 7. Auto-Create Tables

**Important:** You do NOT need to manually create tables!

Sequelize will automatically create the required tables when you first run the server:

1. Open terminal/command prompt
2. Navigate to server directory:
   ```bash
   cd server
   ```
3. Install dependencies (if not done already):
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   npm start
   ```

You should see output like:
```
✓ Database synced successfully
✓ Tables: leagues, matches, h2h_history

========================================
  StrikeLogic Server Running
========================================
  Local:    http://localhost:5000
  Network:  http://0.0.0.0:5000
  Database: flashscore_db
========================================
```

### 8. Verify Table Creation

1. Go back to phpMyAdmin
2. Click on `flashscore_db` in the left sidebar
3. You should now see three tables:
   - `leagues`
   - `matches`
   - `h2h_history`

![Database Tables](https://via.placeholder.com/600x200.png?text=Database+Tables+Created)

### 9. Inspect Table Structure

Click on any table name to view its structure:

#### `leagues` table structure:
| Field | Type | Key | Extra |
|-------|------|-----|-------|
| id | int(11) | PRI | auto_increment |
| name | varchar(255) | UNI | |
| country | varchar(255) | | |
| flashscoreLeagueId | varchar(255) | UNI | |
| createdAt | datetime | | |
| updatedAt | datetime | | |

#### `matches` table structure:
| Field | Type | Key | Extra |
|-------|------|-----|-------|
| id | int(11) | PRI | auto_increment |
| flashscoreId | varchar(255) | UNI | |
| leagueId | int(11) | | |
| homeTeam | varchar(255) | | |
| awayTeam | varchar(255) | | |
| matchDate | date | | |
| matchTime | varchar(255) | | |
| homeScore | int(11) | | |
| awayScore | int(11) | | |
| status | varchar(255) | | |
| h2hScraped | tinyint(1) | | |
| createdAt | datetime | | |
| updatedAt | datetime | | |

#### `h2h_history` table structure:
| Field | Type | Key | Extra |
|-------|------|-----|-------|
| id | int(11) | PRI | auto_increment |
| parentMatchId | int(11) | | |
| sectionType | varchar(255) | | |
| matchDate | date | | |
| homeTeam | varchar(255) | | |
| awayTeam | varchar(255) | | |
| homeScore | int(11) | | |
| awayScore | int(11) | | |
| competition | varchar(255) | | |
| createdAt | datetime | | |
| updatedAt | datetime | | |

## Common Issues & Solutions

### Issue 1: MySQL Service Won't Start

**Symptom:** Red X or error when starting MySQL in XAMPP

**Solutions:**
- Another service is using port 3306 → Change MySQL port in XAMPP config
- Previous installation conflict → Uninstall old MySQL, restart computer
- Permission issues → Run XAMPP as Administrator

### Issue 2: "Access Denied" Error

**Symptom:** Server fails to connect to database

**Solutions:**
- Check `config.json` username/password are correct
- Default XAMPP credentials: username=`root`, password=`` (empty)
- Reset MySQL password in XAMPP Security settings

### Issue 3: Tables Not Created

**Symptom:** Database exists but tables are empty

**Solutions:**
- Ensure server started successfully (check console output)
- Check for Sequelize sync errors in server logs
- Manually run `db.sequelize.sync({ force: true })` (WARNING: Drops existing tables)

### Issue 4: Port 3306 Already in Use

**Symptom:** MySQL won't start due to port conflict

**Solutions:**
1. Open XAMPP Control Panel
2. Click **Config** next to MySQL
3. Select **my.ini**
4. Find line: `port=3306`
5. Change to: `port=3307` (or another available port)
6. Save and restart MySQL
7. Update `config.json` to include port:
   ```json
   {
     "host": "127.0.0.1",
     "port": 3307,
     ...
   }
   ```

### Issue 5: phpMyAdmin Not Loading

**Symptom:** http://localhost/phpmyadmin shows error

**Solutions:**
- Ensure Apache is running (green in XAMPP)
- Check port 80 is not in use (Windows IIS, Skype can conflict)
- Change Apache port in XAMPP config if needed

## Testing the Database Connection

Create a test file `server/test-db-connection.js`:

```javascript
const db = require("./models");

async function testConnection() {
  try {
    await db.sequelize.authenticate();
    console.log("✓ Database connection successful");
    
    const leagues = await db.League.findAll();
    console.log(`✓ Found ${leagues.length} leagues`);
    
    const matches = await db.Match.findAll();
    console.log(`✓ Found ${matches.length} matches`);
    
    const h2h = await db.H2HHistory.findAll();
    console.log(`✓ Found ${h2h.length} H2H records`);
    
    process.exit(0);
  } catch (error) {
    console.error("✗ Database connection failed:", error);
    process.exit(1);
  }
}

testConnection();
```

Run the test:
```bash
node test-db-connection.js
```

## Manual SQL Queries (Optional)

If you need to manually inspect or modify data:

### View all matches for a specific date:
```sql
SELECT * FROM matches WHERE matchDate = '2026-02-28';
```

### View H2H data for a specific match:
```sql
SELECT * FROM h2h_history WHERE parentMatchId = 1 ORDER BY sectionType, matchDate DESC;
```

### Count records by section type:
```sql
SELECT sectionType, COUNT(*) as count 
FROM h2h_history 
GROUP BY sectionType;
```

### Clear all data (be careful!):
```sql
TRUNCATE TABLE h2h_history;
TRUNCATE TABLE matches;
TRUNCATE TABLE leagues;
```

## Backup and Restore

### Create Backup

1. In phpMyAdmin, select `flashscore_db`
2. Click **"Export"** tab
3. Select **"Quick"** export method
4. Click **"Go"**
5. Save the `.sql` file

### Restore from Backup

1. In phpMyAdmin, select `flashscore_db`
2. Click **"Import"** tab
3. Click **"Choose File"** and select your `.sql` backup
4. Click **"Go"**

## Database Maintenance

### Reset H2H Scraped Flags

To force re-scraping of H2H data:
```sql
UPDATE matches SET h2hScraped = 0;
```

### Delete Old Matches

To remove matches older than 30 days:
```sql
DELETE FROM matches WHERE matchDate < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

### View Database Size

```sql
SELECT 
  table_name AS 'Table',
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
FROM information_schema.TABLES 
WHERE table_schema = 'flashscore_db';
```

## Next Steps

Once your database is set up:

1. ✅ Database created and accessible
2. ✅ Tables auto-created by Sequelize
3. ✅ Server can connect successfully
4. → Start the server: `npm start`
5. → Start the client: `cd ../client && npm start`
6. → Begin scraping match data!

## Support

If you encounter issues not covered here:

1. Check server logs for detailed error messages
2. Verify MySQL is running in XAMPP Control Panel
3. Test database connection using the test script above
4. Review `config.json` for typos or incorrect values

---

**Database setup complete! You're ready to use StrikeLogic. ⚽**
