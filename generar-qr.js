'use strict';

const path = require('path');
const base = 'C:/Users/santi/AppData/Local/Programs/node-v22.14.0-win-x64/node_modules/npm/node_modules/qrcode-terminal/vendor/QRCode';
const QRCode = require(path.join(base, 'index.js'));
const QRErrorCorrectLevel = require(path.join(base, 'QRErrorCorrectLevel.js'));

const url = process.argv[2];
if (!url) {
  console.error('Falta la URL');
  process.exit(1);
}

const qr = new QRCode(-1, QRErrorCorrectLevel.M);
qr.addData(url);
qr.make();

console.log(JSON.stringify({
  url,
  size: qr.getModuleCount(),
  modules: qr.modules.map(row => row.map(Boolean))
}));
