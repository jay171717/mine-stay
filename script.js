async function updateStatus() {
  try {
    const res = await fetch("/status");
    const data = await res.json();
    document.getElementById("status").innerText = data.online
      ? `Bot ${data.username} is online ✅`
      : `Bot is offline ❌`;
  } catch {
    document.getElementById("status").innerText = "Error fetching bot status.";
  }
}

// Update every 5 seconds
setInterval(updateStatus, 5000);
updateStatus();
