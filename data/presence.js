const config = require('../settings');

const PresenceControl = async (malvin, update) => {
    try {
        // Validate update.id exists and is a string
        if (!update?.id || typeof update.id !== 'string' || !update.id.includes('@')) {
            console.warn('[Presence] Invalid JID received:', update?.id);
            return;
        }

        // If ALWAYS_ONLINE is true, keep bot online 24/7
        if (config.ALWAYS_ONLINE === "true") {
            await malvin.sendPresenceUpdate("available", update.id);
            return;
        }

        // Get the user's actual presence from their device
        const userPresence = update.presences?.[update.id]?.lastKnownPresence;
        
        // Only update presence if we have valid data
        if (userPresence) {
            // Convert WhatsApp presence to Baileys presence
            let presenceState;
            switch(userPresence) {
                case 'available':
                case 'online':
                    presenceState = 'available';
                    break;
                case 'unavailable':
                case 'offline':
                    presenceState = 'unavailable';
                    break;
                case 'composing':
                case 'recording':
                    // Don't override typing/recording states when auto features are enabled
                    if (config.AUTO_TYPING === 'true' || config.AUTO_RECORDING === 'true') {
                        return;
                    }
                    presenceState = 'available';
                    break;
                default:
                    presenceState = 'unavailable';
            }
            
            await malvin.sendPresenceUpdate(presenceState, update.id);
        }
    } catch (err) {
        console.error('[Presence Error]', err);
    }
};

// Modified handler to allow auto typing/recording
const BotActivityFilter = (malvin) => {
    // Store original methods
    const originalSendMessage = malvin.sendMessage;
    const originalSendPresenceUpdate = malvin.sendPresenceUpdate;

    // Override sendMessage to prevent automatic presence updates
    malvin.sendMessage = async (jid, content, options) => {
        try {
            // Validate JID before sending
            if (!jid || typeof jid !== 'string' || !jid.includes('@')) {
                console.error('[Send Message] Invalid JID:', jid);
                return null;
            }
            
            const result = await originalSendMessage(jid, content, options);
            // Only reset presence if auto features are disabled
            if (config.AUTO_TYPING !== 'true' && config.AUTO_RECORDING !== 'true') {
                await originalSendPresenceUpdate('unavailable', jid);
            }
            return result;
        } catch (error) {
            console.error('[Send Message Error]', error.message);
            return null;
        }
    };

    // Override sendPresenceUpdate to filter bot-initiated presence
    malvin.sendPresenceUpdate = async (type, jid) => {
        try {
            // Validate JID before sending presence
            if (!jid || typeof jid !== 'string' || !jid.includes('@')) {
                console.warn('[Presence Update] Invalid JID:', jid);
                return;
            }

            // Allow presence updates from PresenceControl or auto features
            const stack = new Error().stack;
            if (stack.includes('PresenceControl') || 
                (type === 'composing' && config.AUTO_TYPING === 'true') ||
                (type === 'recording' && config.AUTO_RECORDING === 'true')) {
                return originalSendPresenceUpdate(type, jid);
            }
        } catch (error) {
            console.error('[Presence Update Error]', error.message);
        }
    };
};

module.exports = { PresenceControl, BotActivityFilter };
