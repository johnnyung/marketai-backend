export default function originLogger(req, res, next) {
  console.log("🔥 Incoming Origin:", req.headers.origin);
  next();
}
