import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backendDir = path.join(root, "backend");
const isWin = process.platform === "win32";
const python = path.join(
  backendDir,
  ".venv",
  isWin ? "Scripts" : "bin",
  isWin ? "python.exe" : "python"
);

if (!fs.existsSync(python)) {
  console.error("\n[api] .venv não encontrado em backend/.venv");
  console.error("[api] Rode uma vez:");
  console.error("  cd backend");
  console.error("  python -m venv .venv");
  console.error(isWin
    ? "  .\\.venv\\Scripts\\Activate.ps1"
    : "  source .venv/bin/activate");
  console.error("  pip install -r requirements.txt");
  console.error("  copy .env.example .env   # e preencha DATABASE_URL\n");
  process.exit(1);
}

if (!fs.existsSync(path.join(backendDir, ".env"))) {
  console.warn("[api] backend/.env ausente — copie de .env.example e configure DATABASE_URL");
}

const child = spawn(
  python,
  ["-m", "uvicorn", "app.main:app", "--reload", "--host", "127.0.0.1", "--port", "8000"],
  { cwd: backendDir, stdio: "inherit", shell: false }
);

child.on("exit", (code) => process.exit(code ?? 1));
