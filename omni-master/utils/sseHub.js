const clientsByUserId = new Map(); // userId -> Set(res)

function subscribe(userId, res) {
  let set = clientsByUserId.get(userId);
  if (!set) {
    set = new Set();
    clientsByUserId.set(userId, set);
  }
  set.add(res);

  res.on('close', () => {
    set.delete(res);
    if (set.size === 0) clientsByUserId.delete(userId);
  });
}

function _send(res, event, data) {
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  if (event) res.write(`event: ${event}\n`);
  res.write(`data: ${payload}\n\n`);
}

function publish(userId, event, data) {
  const set = clientsByUserId.get(String(userId));
  if (!set) return 0;
  for (const res of set) {
    try { _send(res, event, data); } catch (_) {}
  }
  return set.size;
}

function broadcast(event, data) {
  let count = 0;
  for (const set of clientsByUserId.values()) {
    for (const res of set) {
      try { _send(res, event, data); count++; } catch (_) {}
    }
  }
  return count;
}

module.exports = { subscribe, publish, broadcast };


