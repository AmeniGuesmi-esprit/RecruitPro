# -*- coding: utf-8 -*-
"""
Récupération et extraction de texte à partir d'un CV (PDF).

Les CV sont stockés par user-service et servis via
  http://user-service/api/users/files/{filename}
(voir application-service qui construit déjà cette URL avant de nous
l'envoyer). Ce module télécharge le PDF et en extrait le texte brut.
"""
import io
import logging

import requests

logger = logging.getLogger("recommendation-service")


def fetch_text_from_pdf_url(url: str, timeout: float = 8.0) -> str:
    try:
        resp = requests.get(url, timeout=timeout)
        resp.raise_for_status()
        return extract_text_from_pdf_bytes(resp.content)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Impossible de récupérer/lire le CV à l'URL %s : %s", url, exc)
        return ""


def extract_text_from_pdf_bytes(data: bytes) -> str:
    try:
        import pdfplumber

        text_parts = []
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text() or ""
                text_parts.append(page_text)
        return "\n".join(text_parts)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Échec de l'extraction du texte du PDF : %s", exc)
        return ""
