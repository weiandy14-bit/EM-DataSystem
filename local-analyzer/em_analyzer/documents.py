from __future__ import annotations

import re
import zipfile
from dataclasses import dataclass
from pathlib import Path
from xml.etree import ElementTree


@dataclass(frozen=True)
class Segment:
    text: str
    location: str
    page: int | None = None


def extract_segments(path: Path) -> list[Segment]:
    suffix = path.suffix.lower()
    if suffix == ".docx":
        return extract_docx(path)
    if suffix == ".pdf":
        return extract_pdf(path)
    raise ValueError(f"不支援的檔案格式：{path.name}")


def extract_docx(path: Path) -> list[Segment]:
    with zipfile.ZipFile(path) as archive:
        xml = archive.read("word/document.xml")
    root = ElementTree.fromstring(xml)
    namespace = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
    segments: list[Segment] = []
    for index, paragraph in enumerate(root.iter(f"{namespace}p"), start=1):
        text = "".join(node.text or "" for node in paragraph.iter(f"{namespace}t"))
        text = normalize_text(text)
        if text:
            segments.append(Segment(text=text, location=f"段落 {index}"))
    return segments


def extract_pdf(path: Path) -> list[Segment]:
    try:
        from pypdf import PdfReader
    except ImportError as error:
        raise RuntimeError("PDF解析套件尚未安裝，請重新執行啟動程式。") from error

    reader = PdfReader(str(path))
    segments: list[Segment] = []
    for page_number, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        for paragraph_number, raw in enumerate(re.split(r"\n\s*\n|\n", text), start=1):
            paragraph = normalize_text(raw)
            if paragraph:
                segments.append(Segment(
                    text=paragraph,
                    location=f"第 {page_number} 頁，第 {paragraph_number} 段",
                    page=page_number,
                ))
    return segments


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()
