const os = require('os');
require('dotenv').config();

function getLocalIpAddresses() {
    const interfaces = os.networkInterfaces();
    const ips = [];
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Find active non-internal IPv4 address
            if (iface.family === 'IPv4' && !iface.internal) {
                ips.push({ interface: name, ip: iface.address });
            }
        }
    }
    return ips;
}

const activeIps = getLocalIpAddresses();
const PORT = process.env.PORT || 5000;

console.log(`\n=======================================================`);
console.log(`📡 Local Network IP Configuration`);
console.log(`=======================================================`);

if (activeIps.length === 0) {
    console.log(`⚠️ No active local network connection detected.`);
    console.log(`💻 Localhost: http://localhost:${PORT}/api/webhook/sms`);
} else {
    activeIps.forEach(item => {
        console.log(`🌐 Network Interface: ${item.interface}`);
        console.log(`📌 Your PC IP:       ${item.ip}`);
        console.log(`📱 MacroDroid URL:   http://${item.ip}:${PORT}/api/webhook/sms\n`);
    });
}
console.log(`=======================================================\n`);
