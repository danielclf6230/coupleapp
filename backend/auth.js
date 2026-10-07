const jwt = require('jsonwebtoken');

function requireAuth(db) {
  return async (req, res, next) => {
    const match = /^Bearer (\S+)$/.exec(req.headers.authorization || '');
    if (!match) return res.status(401).json({ message: 'Please log in.' });
    let payload;
    try {
      payload = jwt.verify(match[1], process.env.JWT_SECRET, { algorithms: ['HS256'] });
      if (!Number.isSafeInteger(payload.id) || payload.id < 1) throw new Error('Invalid user');
    } catch { return res.status(401).json({ message: 'Your session expired. Please log in again.' }); }
    try {
      const [users] = await db.query('SELECT id FROM users WHERE id = ?', [payload.id]);
      if (!users.length) return res.status(401).json({ message: 'Please log in again.' });
      req.user = { id: payload.id };
      next();
    } catch (error) { next(error); }
  };
}
module.exports = { requireAuth };
