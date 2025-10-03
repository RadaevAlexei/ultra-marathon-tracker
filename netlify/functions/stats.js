// Простое перенаправление к основной функции data.js
const { handler: dataHandler } = require('./data');

exports.handler = dataHandler;
