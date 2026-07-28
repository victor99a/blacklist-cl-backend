import pg from "pg";
import tls from "tls";
import net from "net";

const url = process.env.DATABASE_URL || "";
console.log("[DB] URL set:", !!url);

// Try raw TLS connection first
const parsed = new URL(url);
const host = parsed.hostname;
const port = parseInt(parsed.port) || 5432;
console.log("[DB] Connecting to", host + ":" + port);

const socket = net.connect(port, host, () => {
  console.log("[DB] TCP connected");
  const tlsSocket = tls.connect({
    socket,
    host,
    servername: host,
    rejectUnauthorized: false,
  });
  tlsSocket.on("secureConnect", () => {
    console.log("[DB] TLS connected!");
    tlsSocket.end();
  });
  tlsSocket.on("error", (e) => {
    console.error("[DB] TLS error:", e.message.substring(0, 100));
  });
});
socket.on("error", (e) => {
  console.error("[DB] TCP error:", e.message.substring(0, 100));
});

const pool = new pg.Pool({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

pool.query("SELECT 1").then(() => {
  console.log("[DB] Pool connected to PostgreSQL");
}).catch((err) => {
  console.error("[DB] Pool error:", err.message.substring(0, 100));
});

export default pool;
