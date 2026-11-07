'use strict';
const { chat, send } = require('../server/server');

module.exports = (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  return chat(req, res, {});
};
