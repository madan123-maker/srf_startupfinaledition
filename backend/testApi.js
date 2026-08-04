const http = require('http');

const options = {
  hostname: '127.0.0.1',
  port: 5001,
  path: '/api/editions/public',
  method: 'GET',
};

const req = http.request(options, res => {
  let data = '';
  res.on('data', chunk => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response:', data);
  });
});

req.on('error', error => {
  console.error('Error:', error);
});

req.end();
