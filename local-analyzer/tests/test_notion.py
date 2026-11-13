import unittest

from em_analyzer.notion import NotionClient


class NotionMappingTests(unittest.TestCase):
    def test_parses_case_files_systems_and_candidates(self):
        page = {
            "id": "case-id",
            "properties": {
                "案件名稱": {
                    "type": "title",
                    "title": [{"plain_text": "16266變頻器"}],
                },
                "工程系統": {
                    "type": "multi_select",
                    "multi_select": [{"name": "電力"}],
                },
                "候選產品資料": {
                    "type": "rich_text",
                    "rich_text": [{"plain_text": '[{"brand":"ABB"}]'}],
                },
                "原始規範": {
                    "type": "files",
                    "files": [{
                        "name": "16266變頻器.docx",
                        "type": "file",
                        "file": {"url": "https://example.test/file.docx"},
                    }],
                },
            },
        }

        case = NotionClient._parse_case(page)

        self.assertEqual(case.name, "16266變頻器")
        self.assertEqual(case.systems, ["電力"])
        self.assertEqual(case.candidates, [{"brand": "ABB"}])
        self.assertEqual(case.files[0].name, "16266變頻器.docx")


if __name__ == "__main__":
    unittest.main()
