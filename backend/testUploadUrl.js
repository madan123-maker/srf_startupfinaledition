const http = require('http');

const testUrl = (url) => {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      console.log(`URL: ${url}`);
      console.log(`Status Code: ${res.statusCode}`);
      console.log(`Content-Type: ${res.headers['content-type']}`);
      console.log(`Content-Disposition: ${res.headers['content-disposition']}`);
      console.log(`Content-Length: ${res.headers['content-length']} bytes\n`);
      resolve();
    }).on('error', (e) => {
      console.error(`Error testing ${url}:`, e.message);
      resolve();
    });
  });
};

async function run() {
  await testUrl('http://localhost:5001/uploads/6a685e3dac1024c619cd40ee');
  await testUrl('http://localhost:5001/uploads/6a685e24ac1024c619cd3dd5');
}

run();
