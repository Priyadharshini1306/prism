const mongoose = require('mongoose');
const https = require('https');

// ─── DNS-over-HTTPS resolver (Cloudflare) ────────────────────────────────────
// Bypasses ISP/network blocks on DNS SRV lookups (port 53).
// Uses HTTPS (port 443) which is always open.
const dohQuery = (name, type) => {
  return new Promise((resolve, reject) => {
    const path = `/dns-query?name=${encodeURIComponent(name)}&type=${type}`;
    const options = {
      hostname: '1.1.1.1',
      port: 443,
      path,
      method: 'GET',
      headers: { Accept: 'application/dns-json' },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('DoH parse error: ' + e.message));
        }
      });
    });
    req.setTimeout(8000, () => {
      req.destroy();
      reject(new Error('DoH request timed out'));
    });
    req.on('error', reject);
    req.end();
  });
};

// ─── Resolve mongodb+srv:// to mongodb:// via DoH ────────────────────────────
const resolveSrvToDirectUri = async (srvUri) => {
  const url = new URL(srvUri);
  const hostname = url.hostname;

  console.log(`🔍 Resolving SRV records for ${hostname} via DoH...`);

  // 1. Resolve SRV records
  const srvResult = await dohQuery(`_mongodb._tcp.${hostname}`, 'SRV');
  if (!srvResult.Answer || srvResult.Answer.length === 0) {
    throw new Error('No SRV records returned from DoH');
  }

  const hosts = srvResult.Answer.map((r) => {
    const parts = r.data.trim().split(/\s+/);
    const port = parts[2];
    const host = parts[3].replace(/\.$/, '');
    return `${host}:${port}`;
  }).join(',');

  // 2. Resolve TXT records for replicaSet/authSource options
  let txtOptions = 'authSource=admin&ssl=true';
  try {
    const txtResult = await dohQuery(hostname, 'TXT');
    if (txtResult.Answer && txtResult.Answer.length > 0) {
      const txtData = txtResult.Answer[0].data.replace(/"/g, '').trim();
      if (txtData.includes('replicaSet') || txtData.includes('authSource')) {
        txtOptions = txtData + '&ssl=true';
      }
    }
  } catch (_) {
    // TXT optional — use defaults
  }

  const dbName = url.pathname.slice(1) || 'prism';
  const user = encodeURIComponent(decodeURIComponent(url.username));
  const pass = encodeURIComponent(decodeURIComponent(url.password));

  const directUri = `mongodb://${user}:${pass}@${hosts}/${dbName}?${txtOptions}&retryWrites=true&w=majority`;
  console.log(`✅ Resolved to direct hosts: ${hosts}`);
  return directUri;
};

// ─── Main connectDB ───────────────────────────────────────────────────────────
const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (
    !mongoUri ||
    (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) ||
    mongoUri.includes('<db_password>')
  ) {
    console.error('❌ MongoDB connection failed: invalid or missing MONGO_URI');
    process.exit(1);
  }

  let connectionUri = mongoUri;

  // If SRV URI, resolve it via DNS-over-HTTPS to avoid ISP DNS blocks
  if (mongoUri.startsWith('mongodb+srv://')) {
    try {
      connectionUri = await resolveSrvToDirectUri(mongoUri);
    } catch (srvErr) {
      console.warn(`⚠️  DoH SRV resolution failed: ${srvErr.message}`);
      console.warn('⚠️  Falling back to original mongodb+srv:// URI...');
      connectionUri = mongoUri;
    }
  }

  try {
    const conn = await mongoose.connect(connectionUri, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      family: 4,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 MongoDB reconnected');
});

module.exports = connectDB;