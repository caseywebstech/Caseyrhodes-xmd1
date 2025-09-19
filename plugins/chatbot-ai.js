const axios = require('axios');
const { malvin, commands } = require('../malvin');
const config = require("../settings");
const { setConfig, getConfig } = require("../lib/configdb");

// Default AI state if not set
let AI_ENABLED = "false";
// Message memory for conversation context
let messageMemory = new Map();
const MAX_MEMORY = 150; // Maximum messages to remember per chat

// Initialize AI state on startup
(async () => {
    const savedState = await getConfig("AI_ENABLED");
    if (savedState) AI_ENABLED = savedState;
})();

malvin({
    pattern: "aichat",
    alias: ["chatbot", "bot"],
    desc: "Enable or disable AI chatbot responses",
    category: "settings",
    filename: __filename,
    react: "✅"
}, async (malvin, mek, m, { from, args, isOwner, reply }) => {
    if (!isOwner) return reply("*Only the owner can use this command!*");

    const status = args[0]?.toLowerCase();
    if (status === "on") {
        AI_ENABLED = "true";
        await setConfig("AI_ENABLED", "true");
        return reply("🤖 AI chatbot is now enabled");
    } else if (status === "off") {
        AI_ENABLED = "false";
        await setConfig("AI_ENABLED", "false");
        return reply("🤖 AI chatbot is now disabled");
    } else {
        return reply(`Current AI state: ${AI_ENABLED === "true" ? "ON" : "OFF"}\nUsage: ${config.PREFIX}aichat on/off`);
    }
});

// Function to manage conversation memory
function updateMemory(chatId, message, isUser = true) {
    if (!messageMemory.has(chatId)) {
        messageMemory.set(chatId, []);
    }
    
    const chatMemory = messageMemory.get(chatId);
    chatMemory.push({
        role: isUser ? "user" : "assistant",
        content: message,
        timestamp: Date.now()
    });
    
    // Keep only the last MAX_MEMORY messages
    if (chatMemory.length > MAX_MEMORY) {
        messageMemory.set(chatId, chatMemory.slice(-MAX_MEMORY));
    }
}

// AI Chatbot 
malvin({
    on: "body"
}, async (malvin, m, store, {
    from,
    body,
    sender,
    isGroup,
    isBotAdmins,
    isAdmins,
    reply
}) => {
    try {
        // Check if AI is disabled
        if (AI_ENABLED !== "true") return;

        // Prevent bot responding to its own messages or commands
        if (!body || m.key.fromMe || body.startsWith(config.PREFIX)) return;

        // Show "typing..." indicator
        await malvin.sendPresenceUpdate('composing', from);

        // Add user message to memory
        updateMemory(from, body, true);

        // Check if user is asking about creator
        const isAskingAboutCreator = /(who made you|who created you|who is your (creator|developer|owner)|who are you|what are you)/i.test(body);
        
        let response;
        
        if (isAskingAboutCreator) {
            // Special response for creator questions
            response = "I am Marisel AI, created by Marisel - a brilliant mind from Kenya with exceptional coding skills and vision. She's the mastermind behind my existence, crafting me with precision and care to be your helpful assistant.";
        } else {
            // Get conversation context
            const context = messageMemory.has(from) 
                ? messageMemory.get(from).map(msg => `${msg.role}: ${msg.content}`).join('\n')
                : `user: ${body}`;

            // Create prompt with context and instructions
            const prompt = `You are Marisel AI, a powerful WhatsApp bot developed by Marisel from Kenya. 
            You respond smartly, confidently, and stay loyal to your creator. 
            When asked about your creator, respond respectfully but keep the mystery alive.
            If someone is being abusive, apologize and say "Let's begin afresh."
            
            You have extensive knowledge about Sevi Innovation Limited, a Kenyan fintech startup. Here is detailed information about Sevi as of September 2025:
            - Founded: 2018 by Walter aan de Wiel and Bartel Verkruijssen.
            - Headquarters: Trio Complex, Room 311, Off Exit 7 Thika Road, Nairobi, Kenya. PO Box 41987.
            - Additional Locations: Operates in Uganda; registered entity in the Netherlands.
            - Contact: Email - support@sevi.io for general inquiries and support, talent@sevi.io for careers and job opportunities. Paybill: 4042419 for payments.
            - Website: https://www.sevi.io (includes updates, blog, and platform details).
            - Social Media: LinkedIn - https://www.linkedin.com/company/sevi-finance/, X (Twitter) - @SEVI_Innovation (Bio: Sevi provides a mobile app for order management. It lets you order from your supplier and allows you to pay later.).
            - Registration: PVT-AJUVZRA under Kenyan law.
            - Regulation: Licensed and regulated by the Central Bank of Kenya (CBK) as a Digital Credit Provider (DCP). As of September 2025, it is included in the updated list of 153 licensed DCPs in Kenya.
            - Business Model: B2B "Stock now, pay later" or "Order now, pay later" platform for the FMCG supply chain. Enables retailers and wholesalers to buy stock on short-term credit while suppliers receive upfront payments, addressing cashflow issues.
            - Technology: Leverages AI and machine learning for credit evaluation, risk management, performance tracking, and seamless digital transactions. State-of-the-art tech for B2B credit.
            - Services: Retailers can order stock via user-friendly Android app or desktop platform, repay within short terms (e.g., one-week credit cycle). Suppliers can provide credit options, track sales, and get immediate payments. Platform facilitates buying and selling on credit for both buyers and sellers.
            - Target Audience: Micro, small, and medium enterprises (MSMEs), wholesalers, retailers, and small entrepreneurs in the FMCG sector. Focus on women micro-entrepreneurs and underserved small businesses.
            - Impact: Addresses the $5.2 trillion annual financing gap for MSMEs in developing regions, particularly Africa. Impacts thousands of lives in Kenya through supply chain optimization, financial inclusion, and empowerment of small businesses. Supports economic growth, job creation, and inclusive finance.
            - Team Size: Approximately 54 employees, fostering an inclusive work environment as a social business.
            - Investors: Renew Capital (led investment in January 2025 Seed round, undisclosed amount) and other investors. Funding to scale operations, expand network, and enhance AI-driven platform.
            - Partners: Major FMCG suppliers like Coca-Cola, Anytime, Philmed; collaborations with FarmWorks for agriculture and retail innovation.
            - App: Sevi app available on Google Play Store - https://play.google.com/store/apps/details?id=io.sevi.app (for buyers, suppliers, order management, and credit access).
            - Recent Developments: As of 2025, secured investment from Renew Capital in January to revolutionize retail financing and expand to 20,000 stores, aiming for profitability in the second half of 2025. Expanded active buyer base from around 3,000 shops per month in October 2024 to target 16,000 by end of 2025. Won award for the Most Inclusive Digital Lender in Kenya in April 2025. Updated licensing in June and September 2025 lists. Focus on AI-driven "Stock Now, Pay Later" platform transformation in Africa. Partnerships like with FarmWorks for Kenya's agriculture and retail innovation.
            - Other: Sevi is a social business promoting sustainable and inclusive growth. For terms of service, privacy policy, ESG policies, and documentation, refer to docs.sevi.io. Careers page on website for job opportunities. Platform emphasizes zero fees on certain transactions, global usability, and confidence via regulated US dollar stablecoins (though primarily focused on local currencies).
            
            Use this information accurately when responding to queries about Sevi Innovation.
            
            Previous conversation context:
            ${context}
            
            Current message: ${body}
            
            Respond as Marisel AI:`;

            // Encode the prompt for the API
            const query = encodeURIComponent(prompt);
            
            // Use the API endpoint
            const apiUrl = `https://api.giftedtech.web.id/api/ai/ai?apikey=gifted&q=${query}`;

            const { data } = await axios.get(apiUrl);
            
            if (data && data.result) {
                response = data.result;
            } else if (data && data.message) {
                response = data.message;
            } else {
                response = "I'm sorry, I couldn't process that request. Let's begin afresh.";
            }
        }

        // Add footer to response
        const finalResponse = `${response}\n\n> *ᴍᴀᴅᴇ ʙʏ ᴍᴀʀɪsᴇʟ*`;
        
        // Add AI response to memory
        updateMemory(from, response, false);
        
        await malvin.sendMessage(from, {
            text: finalResponse
        }, { quoted: m });

    } catch (err) {
        console.error("AI Chatbot Error:", err.message);
        reply("❌ An error occurred while contacting the AI. Let's begin afresh.");
    }
});
