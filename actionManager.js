// Placeholder for actions (move, jump, left click, etc.)
function performAction(bot, action) {
  switch(action.type) {
    case "jump":
      bot.setControlState("jump", true);
      setTimeout(() => bot.setControlState("jump", false), 500);
      break;
    case "sneak":
      bot.setControlState("sneak", true);
      break;
    case "stopSneak":
      bot.setControlState("sneak", false);
      break;
  }
}

module.exports = { performAction };
