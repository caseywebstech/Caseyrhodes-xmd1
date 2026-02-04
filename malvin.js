// Replace this section in your messages.upsert handler:

// take commands 
try {
  const events = require('./malvin');
  
  // Debug log
  console.log(chalk.cyan(`[CMD] Checking for commands in: "${body}"`));
  
  const cmdName = isCmd ? body.slice(1).trim().split(" ")[0].toLowerCase() : false;
  
  if (isCmd) {
    console.log(chalk.cyan(`[CMD] Looking for command: "${cmdName}"`));
    
    // Find command
    const cmd = events.commands.find((cmd) => 
      cmd.pattern === cmdName || 
      (cmd.alias && cmd.alias.includes(cmdName))
    );
    
    if (cmd) {
      console.log(chalk.green(`[CMD] Found command: ${cmdName}`));
      
      try {
        // Execute command
        await cmd.function(malvin, mek, m, {
          from, quoted, body, isCmd, command: cmdName, args, q, text, 
          isGroup, sender, senderNumber, botNumber2, botNumber, 
          pushname, isMe, isOwner, isCreator, groupMetadata, 
          groupName, participants, groupAdmins, isBotAdmins, 
          isAdmins, reply
        });
      } catch (e) {
        console.error("[PLUGIN ERROR] " + e);
        reply(`Error executing command: ${e.message}`);
      }
    } else {
      console.log(chalk.yellow(`[CMD] Command not found: ${cmdName}`));
      reply(`Command not found: ${cmdName}`);
    }
  }
} catch (err) {
  console.error("Error in command handler:", err.message);
  reply(`System error: ${err.message}`);
}
