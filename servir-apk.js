'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.APK_PORT || 3001);
const HOST = process.env.APK_HOST || '0.0.0.0';
const APK_PATH = path.join(__dirname, 'AccesIA-Movil.apk');

const pagina = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Descargar AccesIA</title>
  <style>
    body{margin:0;background:#efeaf5;color:#1d1b20;font-family:Segoe UI,Roboto,Arial,sans-serif;padding:28px}
    .card{max-width:430px;margin:0 auto;background:#fff;border-radius:20px;padding:22px;box-shadow:0 8px 24px rgba(50,30,80,.14)}
    .logo{width:46px;height:46px;border-radius:14px;background:#6750a4;color:#fff;display:grid;place-items:center;font-size:24px;font-weight:800}
    h1{color:#6750a4;margin:14px 0 6px;font-size:24px}
    p{color:#625b71;line-height:1.45}
    a.btn{display:block;text-align:center;text-decoration:none;background:#6750a4;color:#fff;border-radius:14px;padding:15px;font-weight:700;margin-top:18px}
    small{display:block;margin-top:16px;color:#625b71}
  </style>
</head>
<body>
  <main class="card">
    <div class="logo">A</div>
    <h1>AccesIA</h1>
    <p>Descarga la app móvil en tu celular. Debe estar conectado a la misma Wi‑Fi de la laptop.</p>
    <a class="btn" href="/AccesIA-Movil.apk" download>Descargar APK</a>
    <small>Si el navegador no descarga, mantén presionado el botón y elige “Descargar enlace”.</small>
  </main>
</body>
</html>`;

http.createServer((req, res) => {
  const pathname = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname;

  if (pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    return res.end(pagina);
  }

  if (pathname === '/AccesIA-Movil.apk') {
    if (!fs.existsSync(APK_PATH)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('APK no encontrada');
    }
    res.writeHead(200, {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Disposition': 'attachment; filename="AccesIA-Movil.apk"',
      'Content-Length': fs.statSync(APK_PATH).size,
      'Cache-Control': 'no-cache'
    });
    return fs.createReadStream(APK_PATH).pipe(res);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('No encontrado');
}).listen(PORT, HOST, () => {
  console.log(`Descarga de APK en http://${HOST}:${PORT}/`);
});
