// Create /app/malvin.js with this content:
const fs = require('fs');

module.exports = {
  commands: [
    {
      pattern: 'ping',
      function: async (malvin, mek, m, { reply }) => {
        await reply('🏓 Pong!');
      }
    },
    {
      pattern: 'menu',
      function: async (malvin, mek, m, { reply }) => {
        await reply('📋 Bot Menu:\n• .ping - Test bot\n• .menu - Show this menu');
      }
    },
    {
      pattern: 'test',
      function: async (malvin, mek, m, { reply }) => {
        await reply('✅ Bot is working!');
      }
    }
  ]
};
