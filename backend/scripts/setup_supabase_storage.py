"""Cria o bucket público de documentos no Supabase Storage (rodar uma vez).

Uso:
    python -m scripts.setup_supabase_storage

Requer SUPABASE_URL e SUPABASE_SERVICE_KEY no .env (service_role, não anon).
"""

from __future__ import annotations

import asyncio
import os
import sys

import httpx
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = (os.getenv("SUPABASE_URL") or "").rstrip("/")
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or ""
BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET") or "documentos"


async def main() -> int:
    if not SUPABASE_URL or not SERVICE_KEY:
        print(
            "Defina SUPABASE_URL e SUPABASE_SERVICE_KEY no .env antes de rodar.",
            file=sys.stderr,
        )
        return 1

    url = f"{SUPABASE_URL}/storage/v1/bucket"
    headers = {
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "id": BUCKET,
        "name": BUCKET,
        "public": True,
        "file_size_limit": 25165824,
        "allowed_mime_types": [
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
        ],
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(url, headers=headers, json=payload)

    if resp.status_code in (200, 201):
        print(f"Bucket '{BUCKET}' criado com sucesso.")
        return 0
    if resp.status_code == 409:
        print(f"Bucket '{BUCKET}' já existe. Nada a fazer.")
        return 0

    print(f"Erro {resp.status_code}: {resp.text}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
