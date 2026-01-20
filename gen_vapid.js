const crypto = require('crypto');
const webpush = require('web-push');
const vapidKeys = webpush.generateVAPIDKeys();
const fs = require('fs');
fs.writeFileSync('vapid_keys.json', JSON.stringify(vapidKeys, null, 2));
console.log('Saved to vapid_keys.json');
