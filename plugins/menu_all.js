const config = require('../settings');
const moment = require('moment-timezone');
const { malvin, commands } = require('../malvin');
const { runtime } = require('../lib/functions');
const os = require('os');
const { getPrefix } = require('../lib/prefix');
const more = String.fromCharCode(8206);
const readmore = more.repeat(4001);

// Fonction pour styliser les majuscules comme ʜɪ
function toUpperStylized(str) {
  const stylized = {
    A: 'ᴀ', B: 'ʙ', C: 'ᴄ', D: 'ᴅ', E: 'ᴇ', F: 'ғ', G: 'ɢ', H: 'ʜ',
    I: 'ɪ', J: 'ᴊ', K: 'ᴋ', L: 'ʟ', M: 'ᴍ', N: 'ɴ', O: 'ᴏ', P: 'ᴘ',
    Q: 'ǫ', R: 'ʀ', S: 's', T: 'ᴛ', U: 'ᴜ', V: 'ᴠ', W: 'ᴡ', X: 'x',
    Y: 'ʏ', Z: 'ᴢ',
    a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ғ', g: 'ɢ', h: 'ʜ',
    i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ',
    q: 'ǫ', r: 'ʀ', s: 's', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x',
    y: 'ʏ', z: 'ᴢ'
  };
  return str.split('').map(c => stylized[c] || c).join('');
}

// Normalisation des catégories
const normalize = (str) => {
  if (!str) return 'other';
  return str.toLowerCase().replace(/\s+menu$/, '').trim() || 'other';
};

// Emojis par catégorie normalisée
const emojiByCategory = {
  ai: '🤖',
  anime: '🍥',
  audio: '🎧',
  bible: '📖',
  download: '⬇️',
  downloader: '📥',
  fun: '🎮',
  game: '🕹️',
  group: '👥',
  img_edit: '🖌️',
  info: 'ℹ️',
  information: '🧠',
  logo: '🖼️',
  main: '🏠',
  media: '🎞️',
  menu: '📜',
  misc: '📦',
  music: '🎵',
  other: '📁',
  owner: '👑',
  privacy: '🔒',
  search: '🔎',
  settings: '⚙️',
  sticker: '🌟',
  tools: '🛠️',
  user: '👤',
  utilities: '🧰',
  utility: '🧮',
  wallpapers: '🖼️',
  whatsapp: '📱',
};

malvin({
  pattern: 'menu',
  alias: ['allmenu', 'help', 'commands'],
  desc: 'Show all bot commands',
  category: 'menu',
  react: '👌',
  filename: __filename
}, async (malvin, mek, m, { from, sender, reply }) => {
  try {
    const prefix = getPrefix();
    const timezone = config.TIMEZONE || 'Africa/Nairobi';
    const time = moment().tz(timezone).format('HH:mm:ss');
    const date = moment().tz(timezone).format('dddd, DD MMMM YYYY');
    const pushname = malvin.getName(sender) || 'User';

    const uptime = () => {
      let sec = process.uptime();
      let h = Math.floor(sec / 3600);
      let m = Math.floor((sec % 3600) / 60);
      let s = Math.floor(sec % 60);
      return `${h}h ${m}m ${s}s`;
    };

    let menu = `*🌟 *Good ${
  new Date().getHours() < 12 ? 'Morning' : 
  (new Date().getHours() < 18 ? 'Afternoon' : 'Evening')
}, ${pushname}!* 🌸
╭───────────────────⊷*
*┃ ᴜꜱᴇʀ : @${sender.split("@")[0]}*
*┃ ʀᴜɴᴛɪᴍᴇ : ${uptime()}*
*┃ ᴍᴏᴅᴇ : ${config.MODE || 'public'}*
*┃ ᴘʀᴇғɪx : 「 ${prefix}」* 
*┃ ᴏᴡɴᴇʀ : ${config.OWNER_NAME || 'Unknown'}*
*┃ ᴘʟᴜɢɪɴꜱ : 『 ${commands.length} 』*
*┃ ᴅᴇᴠ : ᴄᴀsᴇʏʀʜᴏᴅᴇs 🎀*
*┃ ᴠᴇʀꜱɪᴏɴ : 2.0.0*
*╰──────────────────⊷*${readmore}`;

    // Define fakevCard for quoting messages - FIXED VCARD FORMAT
    const fakevCard = {
        key: {
            fromMe: false,
            participant: "0@s.whatsapp.net",
            remoteJid: "status@broadcast"
        },
        message: {
            contactMessage: {
                displayName: "© ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴠᴇʀɪғɪᴇᴅ ✅",
                vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;Meta;;;\nFN:Meta\nORG:META AI;\nTEL;type=CELL;type=VOICE;waid=254101022551:+254 101 022 551\nEND:VCARD`
            }
        }
    };

    // Group commands by category
    const categories = {};
    for (const cmd of commands) {
      if (cmd.category && !cmd.dontAdd && cmd.pattern) {
        const normalizedCategory = normalize(cmd.category);
        categories[normalizedCategory] = categories[normalizedCategory] || [];
        
        // Extract command name without prefix
        const commandPattern = cmd.pattern.split('|')[0].trim();
        const commandName = commandPattern.replace(/^[\\/*]/, ''); // Remove leading special chars
        categories[normalizedCategory].push(commandName);
      }
    }

    // Add sorted categories with stylized text
    const sortedCategories = Object.keys(categories).sort();
    for (const cat of sortedCategories) {
      const emoji = emojiByCategory[cat] || '💫';
      menu += `\n\n*╭───『 ${emoji} ${toUpperStylized(cat)} ${toUpperStylized('Menu')} 』──⊷*\n`;
      
      // Sort commands alphabetically
      for (const cmd of categories[cat].sort()) {
        menu += `*│ ✘ ${cmd}*\n`;
      }
      menu += `*╰───────────────⊷*`;
    }

    menu += `\n\n> ${config.DESCRIPTION || toUpperStylized('Explore the bot commands!')}`;
    
    // Context info for newsletter with external ad
    const imageContextInfo = {
      forwardingScore: 1,
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: '120363405292255480@newsletter',
        newsletterName: 'ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴄᴀsᴇʏʀʜᴏᴅᴇs 🎀',
        serverMessageId: -1
      },
      externalAdReply: {
        title: 'ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴛᴇᴄʜ',
        body: 'ᴄᴀsᴇʏʀʜᴏᴅᴇs ʙᴏᴛ',
        mediaType: 1,
        previewType: 0,
        sourceUrl: 'https://whatsapp.com/channel/0029VaExampleChannel',
        thumbnailUrl:'https://files.catbox.moe/52dotx.jpg',
        mediaUrl: ''
      }
    };

    // Send menu image
    await malvin.sendMessage(
      from,
      {
        image:  { url: 'https://files.catbox.moe/dbjrbp.jpg' },
        caption: menu,
        contextInfo: imageContextInfo,
        mentions: [sender]
      },
      { quoted: fakevCard } // Use the fixed vCard as quoted message
    );

  } catch (e) {
    console.error('Menu Error:', e);
    await reply(`❌ ${toUpperStylized('Error')}: Failed to show menu. Try again.\n${toUpperStylized('Details')}: ${e.message}`);
  }
});
