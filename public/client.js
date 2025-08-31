async function fetchBots() {
  const res = await fetch("/api/bots");
  const bots = await res.json();
  const div = document.getElementById("bots");
  div.innerHTML = "";
  bots.forEach(b => {
    const el = document.createElement("div");
    el.textContent = b;
    div.appendChild(el);
  });
}

async function addBot() {
  const username = document.getElementById("newBotName").value;
  await fetch("/api/addBot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username })
  });
  fetchBots();
}

fetchBots();
