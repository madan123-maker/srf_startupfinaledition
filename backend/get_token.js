require('dotenv').config();
const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET || 'fallback_secret';
console.log(jwt.sign({ id: '123', role: 'SUPER_ADMIN', email: 'test@test.com' }, secret));
