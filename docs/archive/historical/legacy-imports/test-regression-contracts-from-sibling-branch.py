import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]


class RegressionContractsTest(unittest.TestCase):
    def test_generate_loot_route_uses_existing_python_endpoint(self) -> None:
        route = (REPO_ROOT / "app" / "api" / "generate-loot" / "route.ts").read_text(
            encoding="utf-8"
        )
        self.assertIn("/loot/roll?", route)
        self.assertNotIn("/generate-loot?", route)

    def test_generate_loot_route_keeps_legacy_response_shape(self) -> None:
        route = (REPO_ROOT / "app" / "api" / "generate-loot" / "route.ts").read_text(
            encoding="utf-8"
        )
        self.assertIn("loot_table", route)
        self.assertIn("quantity", route)

    def test_roll_loot_timeout_is_cleared_in_finally(self) -> None:
        game = (REPO_ROOT / "lib" / "game" / "game.ts").read_text(encoding="utf-8")
        self.assertIn("const timer = setTimeout(() => abort.abort(), 3000);", game)
        self.assertIn("finally {", game)
        self.assertIn("clearTimeout(timer);", game)


if __name__ == "__main__":
    unittest.main()
