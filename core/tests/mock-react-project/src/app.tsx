import React from 'react';

// This component has multiple issues for testing
export default function App() {
  console.log('App rendered'); // Issue: console.log
  
  return (
    <div>
      <h1>React Doctor Test App</h1>
      
      {/* Issue: Inline function */}
      <button onClick={() => console.log('clicked')}>
        Click Me
      </button>
      
      {/* Another inline function */}
      <button onClick={() => alert('test')}>
        Alert
      </button>
    </div>
  );
}