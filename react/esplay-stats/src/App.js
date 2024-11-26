import React, { useState } from 'react';
import './App.css';

function App() {
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState(null);

  // Handle username input change
  const handleUsernameChange = (event) => {
    setUsername(event.target.value);
  };

  // Fetch user stats
  const fetchStats = async () => {
    if (username) {
      setMessage('Fetching stats...');
      try {
        // Request stats from the backend (assuming backend is running at akkeoh.com:5000)
        const response = await fetch(`http://akkeoh.com:5000/fetch-stats/${username}`);

        if (response.ok) {
          setMessage(`Redirecting to stats page for ${username}...`);
          // After stats are fetched, redirect the user to the stats page
          window.location.href = `http://akkeoh.com:5000/user/${username}`;
        } else {
          setMessage('User not found or stats are unavailable.');
        }
      } catch (error) {
        setMessage('An error occurred while fetching stats.');
      }
    }
  };

  return (
    <div className="App">
      <h1>Fetch User Stats</h1>
      <input
        type="text"
        placeholder="Enter username"
        value={username}
        onChange={handleUsernameChange}
      />
      <button onClick={fetchStats}>Fetch Stats</button>
      <p>{message}</p>

      {stats && (
        <div>
          <h2>Stats for {username}</h2>
          <ul>
            <li>Rank: {stats[0]}</li>
            <li>Win Percentage: {stats[1]}</li>
            <li>K/D Ratio: {stats[2]}</li>
            <li>Damage Per Round: {stats[3]}</li>
            <li>Headshot Percentage: {stats[4]}</li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
