#!/usr/bin/env node
// Starts Expo and automatically selects "Proceed anonymously" when prompted.
// The prompt uses arrow-key selection; we send DOWN then ENTER to pick option 2.
const { spawn } = require("child_process");

const port = process.env.PORT || "18115";

const p = spawn(
  "pnpm",
  ["exec", "expo", "start", "--localhost", "--port", port],
  { stdio: ["pipe", "inherit", "inherit"], env: process.env }
);

// Arrow key sequences for terminal prompts
const DOWN  = "\x1B[B"; // ESC [ B
const ENTER = "\r";

// Send DOWN+ENTER immediately, then repeat every 2s to handle re-prompts
function dismiss() {
  try {
    p.stdin.write(DOWN + ENTER);
  } catch (_) {}
}

dismiss();
const interval = setInterval(dismiss, 2000);

p.on("exit", (code) => {
  clearInterval(interval);
  process.exit(code ?? 0);
});
