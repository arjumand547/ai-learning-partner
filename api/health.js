'use strict';
const { health, send } = require('../server/server');

module.exports = (req, res) => {
  if (req.method !== 'GET') return send(res, 405, { error: 'method' });
  return health(req, res);
};
