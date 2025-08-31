import { status } from "minecraft-server-util";

let latest = {
  online: false,
  motd: "",
  players: { online: 0, max: 0 },
  version: ""
};

export function getLatestStatus() {
  return latest;
}

export function startServerStatusLoop(host, port) {
  const run = async () => {
    try {
      const s = await status(host, port, { timeout: 3000 });
      latest = {
        online: true,
        motd: (s.motd?.clean || s.motd?.raw || "").toString(),
        players: { online: s.players?.online || 0, max: s.players?.max || 0 },
        version: s.version?.name || ""
      };
    } catch {
      latest = {
        online: false,
        motd: "",
        players: { online: 0, max: 0 },
        version: ""
      };
    }
  };
  run();
  setInterval(run, 5000);
}
