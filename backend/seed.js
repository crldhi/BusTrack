/** Reset database to demo seed data */
const { reset, DB_PATH } = require('./db');
reset();
console.log('Database reseeded →', DB_PATH);
