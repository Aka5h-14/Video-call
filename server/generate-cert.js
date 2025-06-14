const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Create certificates directory if it doesn't exist
const certsDir = path.join(__dirname, 'certs');
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir);
}

// Generate private key
const privateKey = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

// Save private key
fs.writeFileSync(path.join(certsDir, 'key.pem'), privateKey.privateKey);

// Create a self-signed certificate
const cert = crypto.createCertificate({
  subject: {
    commonName: 'localhost',
    countryName: 'US',
    stateOrProvinceName: 'State',
    localityName: 'City',
    organizationName: 'Test',
    organizationalUnitName: 'Test'
  },
  issuer: {
    commonName: 'localhost',
    countryName: 'US',
    stateOrProvinceName: 'State',
    localityName: 'City',
    organizationName: 'Test',
    organizationalUnitName: 'Test'
  },
  days: 365,
  key: privateKey.privateKey
});

// Save certificate
fs.writeFileSync(path.join(certsDir, 'cert.pem'), cert);

console.log('SSL certificates generated successfully!'); 