import React, { useState, useEffect } from 'react';
import { fetchUser } from './api'; // Imagine this exists
import { GhostData } from './data'; // DEAD CODE: Unused import

/**
 * 1. GRANDPARENT: Has the data
 */
export default function UserDashboard({ theme }) {
  const [user, setUser] = useState({ name: 'Shaheen', role: 'Admin' });
  const [ticks, setTicks] = useState(0);
  const unusedSecret = "12345"; // DEAD CODE: Unused variable

  console.log("Dashboard rendering..."); // CONSOLE LOG

  // 2. INFINITE LOOP: Missing dependency array
  useEffect(() => {
    setTicks(ticks + 1);
  });

  return (
    <div className="dashboard">
      <h1>User Panel</h1>
      {/* Passing 'user' to Content (Drilling starts here) */}
      <Content user={user} theme={theme} />
    </div>
  );
}

/**
 * 3. PARENT (The Middleman): PROP DRILLING candidate
 * Receives 'user', doesn't use it, just passes it to Profile.
 */
function Content({ user, theme }) {
  return (
    <main 
      // 4. LARGE INLINE STYLE: > 5 properties
      style={{
        margin: '20px',
        padding: '10px',
        border: '1px solid black',
        borderRadius: '5px',
        backgroundColor: '#f0f0f0',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <h2>Main Content</h2>
      <Profile user={user} theme={theme} />
    </main>
  );
}

/**
 * 5. CHILD: Finally uses the data
 */
function Profile({ user, theme }) {
  return (
    <div className={`profile-${theme}`}>
      <p>Name: {user.name}</p>
      {/* 6. INLINE FUNCTION */}
      <button onClick={() => console.log('Deleted!')}>
        Delete Account
      </button>
    </div>
  );
}