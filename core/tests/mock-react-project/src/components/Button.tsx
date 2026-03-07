export default function Button() {
  console.warn('Button component');
  
  return (
    <button onClick={() => console.log('inline')}>
      Button
    </button>
  );
}