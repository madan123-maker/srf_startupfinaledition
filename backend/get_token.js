const jwt = require('jsonwebtoken');
console.log(jwt.sign({ id: '123', role: 'SUPER_ADMIN', email: 'test@test.com' }, '661a8ab2f76fd80dde465c408390696267e4d116956286628d1922cbbadb86ba'));
