import React, { useState } from 'react';

function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [mLink, setMLink] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setMLink('');
    setError('');

    try {
      const response = await fetch('http://localhost:5000/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ searchTerm }),
      });

      const data = await response.json();

      if (response.ok) {
        setMLink(data.mLink);  // Set the first /m/ link to display
      } else {
        setError(data.error || 'Error occurred while scraping');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to communicate with the server');
    }
  };

  return (
    <div>
      <h1>Search for User</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Enter search term (e.g., foje)"
          required
        />
        <button type="submit">Search</button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {mLink && (
        <div>
          <h2>Found /m/ Link:</h2>
          <a href={mLink} target="_blank" rel="noopener noreferrer">{mLink}</a>
        </div>
      )}
    </div>
  );
}

export default App;
