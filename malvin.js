// malvin.js - SIMPLE TEST
console.log('✅ malvin.js is loading...');

var commands = [];

function malvin(info, func) {
    console.log(`📝 Registering command: ${info.pattern}`);
    var data = info;
    data.function = func;
    commands.push(data);
    console.log(`✅ Command ${info.pattern} registered. Total: ${commands.length}`);
    return data;
}

// TEST COMMAND - SIMPLE
malvin({
    pattern: 'ping',
    desc: 'Ping command'
}, async (message, client, match) => {
    console.log('🎯 ping command executed!');
    try {
        // Send message directly
        await client.sendMessage(message.from, { 
            text: '🏓 PONG! Bot is working!' 
        }, { quoted: message });
        console.log('✅ Reply sent for ping');
    } catch (error) {
        console.error('❌ Error in ping:', error.message);
    }
});

// TEST COMMAND 2
malvin({
    pattern: 'test',
    desc: 'Test command'
}, async (message, client, match) => {
    console.log('🎯 test command executed!');
    try {
        await client.sendMessage(message.from, { 
            text: '✅ TEST SUCCESS! Commands are working!' 
        }, { quoted: message });
        console.log('✅ Reply sent for test');
    } catch (error) {
        console.error('❌ Error in test:', error.message);
    }
});

// TEST COMMAND 3
malvin({
    pattern: 'help',
    desc: 'Help command'
}, async (message, client, match) => {
    console.log('🎯 help command executed!');
    try {
        await client.sendMessage(message.from, { 
            text: '📋 HELP MENU:\n• .ping - Test bot\n• .test - Test command\n• .help - This menu' 
        }, { quoted: message });
        console.log('✅ Reply sent for help');
    } catch (error) {
        console.error('❌ Error in help:', error.message);
    }
});

console.log(`✅ malvin.js loaded ${commands.length} commands`);
console.log('📋 Commands available:', commands.map(c => c.pattern).join(', '));

// EXPORT
module.exports = {
    malvin: malvin,
    commands: commands,
    AddCommand: malvin,
    Function: malvin
};
