"""Persistência de arquivos (PDF/foto) no Supabase Storage ou fallback local."""

from __future__ import annotations

import base64
import mimetypes
import re
import uuid
from dataclasses import dataclass

import httpx

from app.core.config import settings

_DATA_URL_RE = re.compile(
    r"^data:(?P<mime>[\w/+.-]+);base64,(?P<data>[A-Za-z0-9+/=\s]+)$"
)

_MIME_EXT = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


@dataclass(frozen=True)
class ArquivoPersistido:
    url: str
    storage_path: str | None
    tamanho_bytes: int


class StorageError(Exception):
    pass


def _extensao(mime: str, nome_arquivo: str | None) -> str:
    if nome_arquivo and "." in nome_arquivo:
        return "." + nome_arquivo.rsplit(".", 1)[-1].lower()
    return _MIME_EXT.get(mime) or mimetypes.guess_extension(mime) or ".bin"


def _decodificar_data_url(url: str) -> tuple[str, bytes]:
    match = _DATA_URL_RE.match(url.strip())
    if not match:
        raise StorageError("URL de arquivo inválida. Envie data URL ou link http(s).")
    mime = match.group("mime")
    try:
        raw = base64.b64decode(match.group("data"), validate=True)
    except Exception as exc:
        raise StorageError("Base64 inválido no arquivo.") from exc
    if not raw:
        raise StorageError("Arquivo vazio.")
    return mime, raw


class StorageService:
    def __init__(self) -> None:
        self._base = (settings.supabase_url or "").rstrip("/")
        self._key = settings.supabase_service_key or ""
        self._bucket = settings.supabase_storage_bucket or "documentos"

    @property
    def supabase_ativo(self) -> bool:
        return bool(self._base and self._key)

    def _url_publica(self, path: str) -> str:
        return f"{self._base}/storage/v1/object/public/{self._bucket}/{path}"

    def _storage_headers(self, *, content_type: str | None = None) -> dict[str, str]:
        headers = {
            "Authorization": f"Bearer {self._key}",
            "apikey": self._key,
        }
        if content_type:
            headers["Content-Type"] = content_type
        return headers

    async def _upload_supabase(self, path: str, conteudo: bytes, mime: str) -> str:
        url = f"{self._base}/storage/v1/object/{self._bucket}/{path}"
        headers = {
            **self._storage_headers(content_type=mime),
            "x-upsert": "true",
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, content=conteudo, headers=headers)
        if resp.status_code not in (200, 201):
            raise StorageError(
                f"Falha ao enviar arquivo para o storage ({resp.status_code})."
            )
        return self._url_publica(path)

    async def excluir(self, storage_path: str | None) -> None:
        if not storage_path or not self.supabase_ativo:
            return
        url = f"{self._base}/storage/v1/object/{self._bucket}"
        headers = {
            **self._storage_headers(content_type="application/json"),
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            await client.request("DELETE", url, headers=headers, json=[storage_path])

    async def persistir(
        self,
        *,
        url: str,
        casa_id: uuid.UUID,
        tipo: str,
        nome_arquivo: str | None = None,
        tamanho_informado: int | None = None,
    ) -> ArquivoPersistido:
        if url.startswith("http://") or url.startswith("https://"):
            return ArquivoPersistido(
                url=url,
                storage_path=None,
                tamanho_bytes=tamanho_informado or 0,
            )

        mime, conteudo = _decodificar_data_url(url)
        tamanho = len(conteudo)
        limite = settings.storage_max_upload_bytes
        if tamanho > limite:
            mb = limite // (1024 * 1024)
            raise StorageError(f"Arquivo excede o limite de {mb} MB.")

        if self.supabase_ativo:
            ext = _extensao(mime, nome_arquivo)
            path = f"{casa_id}/{tipo}/{uuid.uuid4()}{ext}"
            public_url = await self._upload_supabase(path, conteudo, mime)
            return ArquivoPersistido(
                url=public_url,
                storage_path=path,
                tamanho_bytes=tamanho,
            )

        # Dev sem Supabase: guarda data URL no Postgres (somente arquivos pequenos).
        if tamanho > 512_000:
            raise StorageError(
                "Configure SUPABASE_URL e SUPABASE_SERVICE_KEY para arquivos maiores que 500 KB."
            )
        return ArquivoPersistido(
            url=url,
            storage_path=None,
            tamanho_bytes=tamanho,
        )


storage = StorageService()
