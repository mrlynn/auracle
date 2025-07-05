// Local Storage (stub)
// TODO: Replace with MongoDB in the future
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

function saveSession(session) {
  const file = path.join(dataDir, `session-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(session, null, 2));
}

function loadSessions() {
  return fs.readdirSync(dataDir)
    .filter(f => f.startsWith('session-'))
    .map(f => JSON.parse(fs.readFileSync(path.join(dataDir, f))));
}

module.exports = { saveSession, loadSessions }; 