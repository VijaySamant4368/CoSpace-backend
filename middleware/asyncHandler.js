//If an async error happens, it automatically forwards it to the error handler
export default (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
