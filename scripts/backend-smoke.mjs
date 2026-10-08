import fetch from 'node-fetch';

async function testBackend() {
  console.log('Testing server logic...');
  try {
    const res = await fetch('https://amir-fast-food.vercel.app/api/locations');
    const data = await res.text();
    console.log('Locations OK:', data.includes('Lahore'));
  } catch (e) {
    console.log('Backend test failed:', e.message);
  }
}
testBackend();
