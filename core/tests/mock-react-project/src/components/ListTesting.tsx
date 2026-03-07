import React from 'react';

export default function ListTesting() {
  const items = ['Apple', 'Banana', 'Cherry'];

  // 1. ❌ THE DISEASE: Map Failure
  const renderMap = () => {
    return items.map(item => (
      <div>{item}</div> 
      /* ✅ THE CURE: 
         <div key={item}>{item}</div> 
      */
    ));
  };

  // 2. ❌ THE DISEASE: Literal Array Failure
  const staticList = [
    <span>First Item</span>,  
    <span>Second Item</span>, 
    /* ✅ THE CURE: 
       <span key="first">First Item</span>,
       <span key="second">Second Item</span>,
    */
  ];

  return (
    <div className="list-container">
      {renderMap()}

      <ul>
        {/* 3. ❌ THE DISEASE: Array.from Failure */}
        {Array.from({ length: 3 }).map((_, i) => (
          <li>Item {i}</li> 
          /* ✅ THE CURE: 
             <li key={i}>Item {i}</li> 
             (Note: Use 'i' only if the list order is static!)
          */
        ))}
      </ul>

      <div className="static-section">
        {staticList}
      </div>

      {/* 4. ✨ HEALTHY: Should NOT be flagged by the Doctor */}
      {items.map(item => (
        <p key={item}>{item}</p>
      ))}
    </div>
  );
}