const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const cors = require('cors'); // Import CORS middleware
const app = express();
const port = 5000;

// CORS setup to allow frontend requests from http://akkeoh.com:3000
const corsOptions = {
  origin: 'http://akkeoh.com:3000', // Allow the frontend to access the backend
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
};
app.use(cors(corsOptions));

// Setup to parse incoming JSON requests
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Directory to save user stats and widget images
const statsDir = path.join(__dirname, 'stats');
const widgetImagesDir = path.join(__dirname, 'widget-images');
if (!fs.existsSync(statsDir)) {
  fs.mkdirSync(statsDir);  // Ensure the stats directory exists
}
if (!fs.existsSync(widgetImagesDir)) {
  fs.mkdirSync(widgetImagesDir);  // Ensure the widget images directory exists
}

// Mapping rank to image file (replace with actual image names you use)
const rankToImage = {
  'Global Elite': 'global_elite.png',
  'Elite 3': 'elite_3.png',
  'Elite 2': 'elite_2.png',
  'Elite 1': 'elite_1.png',
  'Diamond 3': 'diamond_3.png',
  'Diamond 2': 'diamond_2.png',
  'Diamond 1': 'diamond_1.png',
  'Gold 3': 'gold_3.png',
  'Gold 2': 'gold_2.png',
  'Gold 1': 'gold_1.png',
  'Silver 2': 'silver_2.png',
  'Silver 1': 'silver_1.png',
};

// Save the user stats to a file
const saveStatsToFile = (username, stats) => {
  try {
    const filePath = path.join(statsDir, `${username}.json`);
    fs.writeFileSync(filePath, JSON.stringify(stats, null, 2));
    console.log(`Stats saved for ${username}`);
  } catch (error) {
    console.error(`Error saving stats for ${username}:`, error.message);
    throw error;
  }
};

// Read the user stats from the file
const readStatsFromFile = (username) => {
  const filePath = path.join(statsDir, `${username}.json`);
  if (fs.existsSync(filePath)) {
    try {
      const stats = fs.readFileSync(filePath);
      return JSON.parse(stats);
    } catch (error) {
      console.error(`Error reading stats for ${username}:`, error.message);
      return null;
    }
  }
  return null;
};

// Fetch the statistics for a user by scraping the stats page
const fetchStats = async (username) => {
  try {
    console.log(`Fetching stats for ${username}...`);
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Navigate to the user's page
    await page.goto(`https://esplay.com/u/${username}/stats`, {
      waitUntil: 'domcontentloaded',
    });

    // Wait for the element containing stats to be loaded
    await page.waitForSelector('.flex.justify-between.items-center.h-full.pl-6.pr-10');

    // Scrape the required stats
    const stats = await page.evaluate(() => {
      const statsArray = [];

      // Get the parent div that contains all the stats info
      const statElements = document.querySelectorAll('.flex.justify-between.items-center.h-full.pl-6.pr-10 .flex.flex-col.gap-2.text-center');
      
      // Extract the rank (Elite 2)
      const rankElement = document.querySelector('.font-teko.font-semibold.text-3xl');  // Rank is outside the flex items
      const rank = rankElement ? rankElement.innerText.trim() : '';

      // Extract win percentage (64%)
      const winPercentageElement = statElements[0]?.querySelector('.font-teko.text-3xl');
      const winPercentage = winPercentageElement ? winPercentageElement.innerText.trim().replace('%', '') : '';

      // Extract K/D ratio (0.98)
      const kdRatioElement = statElements[1]?.querySelector('.font-teko.text-3xl');
      const kdRatio = kdRatioElement ? kdRatioElement.innerText.trim() : '';

      // Extract damage per round (75.63)
      const damagePerRoundElement = statElements[2]?.querySelector('.font-teko.text-3xl');
      const damagePerRound = damagePerRoundElement ? damagePerRoundElement.innerText.trim() : '';

      // Extract headshot percentage (44%)
      const headshotPercentageElement = statElements[3]?.querySelector('.font-teko.text-3xl');
      const headshotPercentage = headshotPercentageElement ? headshotPercentageElement.innerText.trim().replace('%', '') : '';

      // Push the scraped values to the stats array in order
      if (rank) statsArray.push(rank);  // "Elite 2"
      if (winPercentage) statsArray.push(winPercentage);  // "64"
      if (kdRatio) statsArray.push(kdRatio);  // "0.98"
      if (damagePerRound) statsArray.push(damagePerRound);  // "75.63"
      if (headshotPercentage) statsArray.push(headshotPercentage);  // "44"

      // Add the '%' sign to the appropriate values
      if (statsArray[1]) statsArray[1] = statsArray[1] + '%';  // Add '%' to Win Percentage
      if (statsArray[4]) statsArray[4] = statsArray[4] + '%';  // Add '%' to Headshot Percentage

      return statsArray;
    });

    await browser.close();
    console.log(`Stats successfully scraped for ${username}:`, stats);
    return stats;
  } catch (error) {
    console.error(`Error fetching stats for ${username}:`, error.message);
    throw error;
  }
};

// Route to fetch user stats if not already saved
app.get('/fetch-stats/:username', async (req, res) => {
  const username = req.params.username;
  
  // Check if stats are already saved
  let stats = readStatsFromFile(username);
  
  if (!stats) {
    // Scrape and save stats if not found
    try {
      stats = await fetchStats(username);
      saveStatsToFile(username, stats);
      
      // Set up a 3-minute interval to update stats
      setInterval(async () => {
        try {
          const updatedStats = await fetchStats(username);
          saveStatsToFile(username, updatedStats);
          console.log(`Stats updated for ${username}`);
        } catch (err) {
          console.error('Error updating stats:', err.message);
        }
      }, 180000); // 180000 ms = 3 minutes

      // After scraping, redirect to the user stats page
      return res.redirect(`/user/${username}`);
    } catch (err) {
      console.error('Error during fetch-stats request:', err.message);
      return res.status(500).json({ error: 'Failed to fetch stats', details: err.message });
    }
  }
  
  // Redirect to the user's saved stats if found
  res.redirect(`/user/${username}`);
});

// Route to view the stats of a user
app.get('/user/:username', (req, res) => {
  const username = req.params.username;
  const stats = readStatsFromFile(username);
  
  if (stats) {
    // After sending the stats, redirect to the widget page
    res.redirect(`/widget/${username}`);
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// Route to serve the widget page for a user
app.get('/widget/:username', (req, res) => {
  const username = req.params.username;
  const stats = readStatsFromFile(username);
  
  if (stats) {
    const rankImage = rankToImage[stats[0]] || 'default.png'; // Use default image if rank not found
    
    // Serve a simple HTML page for the widget
    res.send(`
<html>
    <head>
        <title>${username} Widget</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                background-color: #f3f3f3;
                padding: 20px;
                margin: 0;
            }
            .widget-container {
                display: flex;
                align-items: flex-start;  /* Align widget to top-left */
                background-color: #E5E4E2; /* Gray background for the widget */
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                width: 350px;
                margin: 0 auto;
            }
            .widget-container img {
                width: 80px;  /* Image size is square */
                height: 80px;
                object-fit: cover;  /* Ensures image covers the square completely */
                margin-right: 40px; /* Padding from the text */
            }
            .widget-content {
                text-align: left;
            }
            .username {
                font-weight: bold;
                font-size: 18px;
                margin-bottom: 10px;
            }
            .stats-container {
                display: grid;
                grid-template-columns: 1fr 1fr;  /* Two equal-width columns */
                grid-gap: 10px;  /* Adds space between the stats */
                margin-top: 10px;
            }
            .stat {
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div class="widget-container">
            <img src="http://akkeoh.com:3000/widget-images/${rankImage}" alt="${stats[0]}" />
            <div class="widget-content">
                <div class="username">${username}'s past 20</div>
                <div class="stats-container">
                    <div class="stat">WR: ${stats[1]}</div>
                    <div class="stat">ADR: ${stats[3]}</div>
                    <div class="stat">KD: ${stats[2]}</div>
                    <div class="stat">HS%: ${stats[4]}</div>
                </div>
            </div>
        </div>
    </body>
</html>
    `);
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// Function to update the stats for all users every 3 minutes
const updateAllUserStats = async () => {
  try {
    const userFiles = fs.readdirSync(statsDir);

    // Loop through all files in the stats directory
    for (let i = 0; i < userFiles.length; i++) {
      const username = path.basename(userFiles[i], '.json');
      
      try {
        const updatedStats = await fetchStats(username);
        saveStatsToFile(username, updatedStats);  // Save the updated stats
        console.log(`Updated stats for ${username}`);
      } catch (err) {
        console.error(`Error updating stats for ${username}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Error updating all user stats:', err.message);
  }
};

// Set an interval to update stats for all users every 3 minutes (180,000 milliseconds)
setInterval(updateAllUserStats, 180000); // Every 3 minutes

// Serve the frontend
app.get('/', (req, res) => {
  res.send('Welcome to the Stats Scraper API!');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
