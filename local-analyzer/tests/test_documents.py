import tempfile
import unittest
import zipfile
from pathlib import Path

from em_analyzer.documents import extract_docx


class DocumentExtractionTests(unittest.TestCase):
    def test_extracts_docx_paragraphs_without_external_library(self):
        xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
          <w:body>
            <w:p><w:r><w:t>第一段 CNS 1234</w:t></w:r></w:p>
            <w:p><w:r><w:t>第二段 96 mm</w:t></w:r></w:p>
          </w:body>
        </w:document>'''.encode("utf-8")
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "sample.docx"
            with zipfile.ZipFile(path, "w") as archive:
                archive.writestr("word/document.xml", xml)

            segments = extract_docx(path)

        self.assertEqual([item.text for item in segments], ["第一段 CNS 1234", "第二段 96 mm"])
        self.assertEqual(segments[0].location, "段落 1")


if __name__ == "__main__":
    unittest.main()
