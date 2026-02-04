// In malvin.js
var commands = [];

function malvin(info, func) {
    commands.push({...info, function: func});
}

// Simple commands that match your current structure
malvin({
    pattern: 'ping'
}, async (message, client, match) => {
    await client.sendMessage(message.from, { text: '🏓 Pong!' }, { quoted: message });
});

malvin({
    pattern: 'test'
}, async (message, client, match) => {
    await client.sendMessage(message.from, { text: '✅ Working!' }, { quoted: message });
});

module.exports = { commands };
