import uuid

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.storage import StorageError, storage
from app.deps import SessionDep, UsuarioDep
from app.models import AnotacaoDocumento, Casa, DocumentoPdf, FotoCasa
from app.schemas.documento import (
    AnotacaoCreate,
    AnotacaoOut,
    AnotacaoUpdate,
    CasaDocumentosOut,
    FotoCreate,
    FotoOut,
    PdfCreate,
    PdfOut,
)

router = APIRouter(tags=["documentos"])


async def _casa_or_404(session, casa_id: uuid.UUID) -> Casa:
    casa = await session.get(Casa, casa_id)
    if casa is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Casa não encontrada.")
    return casa


async def _pdf_or_404(session, pdf_id: uuid.UUID) -> DocumentoPdf:
    pdf = await session.get(DocumentoPdf, pdf_id)
    if pdf is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "PDF não encontrado.")
    return pdf


async def _foto_or_404(session, foto_id: uuid.UUID) -> FotoCasa:
    foto = await session.get(FotoCasa, foto_id)
    if foto is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Foto não encontrada.")
    return foto


async def _anotacao_or_404(session, nota_id: uuid.UUID) -> AnotacaoDocumento:
    nota = await session.get(AnotacaoDocumento, nota_id)
    if nota is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Anotação não encontrada.")
    return nota


def _erro_storage(exc: StorageError) -> HTTPException:
    return HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc))


@router.get("/casas/{casa_id}/documentos", response_model=CasaDocumentosOut)
async def listar_documentos(
    casa_id: uuid.UUID, session: SessionDep, _: UsuarioDep
) -> CasaDocumentosOut:
    casa = await _casa_or_404(session, casa_id)
    pdfs = list(
        await session.scalars(
            select(DocumentoPdf)
            .where(DocumentoPdf.casa_id == casa_id)
            .order_by(DocumentoPdf.created_at.desc())
        )
    )
    fotos = list(
        await session.scalars(
            select(FotoCasa)
            .where(FotoCasa.casa_id == casa_id)
            .order_by(FotoCasa.created_at.desc())
        )
    )
    anotacoes = list(
        await session.scalars(
            select(AnotacaoDocumento)
            .where(AnotacaoDocumento.casa_id == casa_id)
            .order_by(AnotacaoDocumento.updated_at.desc())
        )
    )
    return CasaDocumentosOut(
        casa_id=casa.id,
        casa_nome=casa.nome,
        pdfs=[PdfOut.model_validate(p) for p in pdfs],
        fotos=[FotoOut.model_validate(f) for f in fotos],
        anotacoes=[AnotacaoOut.model_validate(a) for a in anotacoes],
    )


@router.post(
    "/casas/{casa_id}/documentos/pdfs",
    response_model=PdfOut,
    status_code=status.HTTP_201_CREATED,
)
async def criar_pdf(
    casa_id: uuid.UUID, dados: PdfCreate, session: SessionDep, _: UsuarioDep
) -> DocumentoPdf:
    await _casa_or_404(session, casa_id)
    try:
        arquivo = await storage.persistir(
            url=dados.url,
            casa_id=casa_id,
            tipo="pdfs",
            nome_arquivo=dados.nome,
            tamanho_informado=dados.tamanho_bytes,
        )
    except StorageError as exc:
        raise _erro_storage(exc) from exc

    pdf = DocumentoPdf(
        casa_id=casa_id,
        nome=dados.nome.strip(),
        tamanho_bytes=arquivo.tamanho_bytes or dados.tamanho_bytes,
        url=arquivo.url,
        storage_path=arquivo.storage_path,
    )
    session.add(pdf)
    await session.commit()
    await session.refresh(pdf)
    return pdf


@router.post(
    "/casas/{casa_id}/documentos/fotos",
    response_model=FotoOut,
    status_code=status.HTTP_201_CREATED,
)
async def criar_foto(
    casa_id: uuid.UUID, dados: FotoCreate, session: SessionDep, _: UsuarioDep
) -> FotoCasa:
    await _casa_or_404(session, casa_id)
    try:
        arquivo = await storage.persistir(
            url=dados.url,
            casa_id=casa_id,
            tipo="fotos",
            nome_arquivo=None,
        )
    except StorageError as exc:
        raise _erro_storage(exc) from exc

    legenda = dados.legenda.strip() if dados.legenda else None
    foto = FotoCasa(
        casa_id=casa_id,
        legenda=legenda,
        url=arquivo.url,
        storage_path=arquivo.storage_path,
    )
    session.add(foto)
    await session.commit()
    await session.refresh(foto)
    return foto


@router.post(
    "/casas/{casa_id}/documentos/anotacoes",
    response_model=AnotacaoOut,
    status_code=status.HTTP_201_CREATED,
)
async def criar_anotacao(
    casa_id: uuid.UUID, dados: AnotacaoCreate, session: SessionDep, _: UsuarioDep
) -> AnotacaoDocumento:
    await _casa_or_404(session, casa_id)
    nota = AnotacaoDocumento(
        casa_id=casa_id,
        titulo=dados.titulo.strip(),
        texto=dados.texto.strip(),
    )
    session.add(nota)
    await session.commit()
    await session.refresh(nota)
    return nota


@router.put("/documentos/anotacoes/{nota_id}", response_model=AnotacaoOut)
async def editar_anotacao(
    nota_id: uuid.UUID,
    dados: AnotacaoUpdate,
    session: SessionDep,
    _: UsuarioDep,
) -> AnotacaoDocumento:
    nota = await _anotacao_or_404(session, nota_id)
    payload = dados.model_dump(exclude_unset=True)
    if "titulo" in payload and payload["titulo"] is not None:
        nota.titulo = payload["titulo"].strip() or "Sem título"
    if "texto" in payload and payload["texto"] is not None:
        nota.texto = payload["texto"].strip()
    await session.commit()
    await session.refresh(nota)
    return nota


@router.delete("/documentos/pdfs/{pdf_id}", status_code=status.HTTP_204_NO_CONTENT)
async def excluir_pdf(pdf_id: uuid.UUID, session: SessionDep, _: UsuarioDep) -> None:
    pdf = await _pdf_or_404(session, pdf_id)
    await storage.excluir(pdf.storage_path)
    await session.delete(pdf)
    await session.commit()


@router.delete("/documentos/fotos/{foto_id}", status_code=status.HTTP_204_NO_CONTENT)
async def excluir_foto(foto_id: uuid.UUID, session: SessionDep, _: UsuarioDep) -> None:
    foto = await _foto_or_404(session, foto_id)
    await storage.excluir(foto.storage_path)
    await session.delete(foto)
    await session.commit()


@router.delete(
    "/documentos/anotacoes/{nota_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def excluir_anotacao(
    nota_id: uuid.UUID, session: SessionDep, _: UsuarioDep
) -> None:
    nota = await _anotacao_or_404(session, nota_id)
    await session.delete(nota)
    await session.commit()
