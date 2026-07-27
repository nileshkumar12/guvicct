const blacklisted = new Set();

function add(token) {
  if (!token) return;
  blacklisted.add(token);
}

function has(token) {
  return blacklisted.has(token);
}

module.exports = { add, has };
