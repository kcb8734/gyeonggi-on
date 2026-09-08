#!/usr/bin/env python3
"""scripts/excel_to_postgres.py 단위 테스트."""

from __future__ import annotations

import tempfile
import unittest
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path

from excel_to_postgres import (
    LOAD_ORDER,
    LoadError,
    apply_profile,
    build_upsert_sql,
    canon,
    create_template,
    is_blank,
    load_file,
    parse_args,
    read_excel_sheets,
    resolve_table_name,
    should_use_ssl,
    sheet_sort_key,
    to_bool,
    to_date,
    to_datetime,
    to_number,
    PROFILES,
)


class CanonAndConvertTest(unittest.TestCase):
    def test_canon_strips_spaces_and_case(self):
        self.assertEqual(canon(" 지자체 명 "), "지자체명")
        self.assertEqual(canon("Region_Code"), "regioncode")
        self.assertEqual(canon("사업자-등록-번호"), "사업자등록번호")

    def test_blank(self):
        self.assertTrue(is_blank(None))
        self.assertTrue(is_blank("  "))
        self.assertFalse(is_blank(0))
        self.assertFalse(is_blank("수원시"))

    def test_bool_korean(self):
        self.assertTrue(to_bool("예"))
        self.assertTrue(to_bool("Y"))
        self.assertFalse(to_bool("아니오"))
        self.assertFalse(to_bool("N"))
        self.assertIsNone(to_bool("", default=None))

    def test_number_and_dates(self):
        self.assertEqual(to_number("1,000.50"), Decimal("1000.50"))
        self.assertEqual(to_date("2026-09-01"), date(2026, 9, 1))
        self.assertEqual(to_date(datetime(2026, 9, 8, 12, 0)).isoformat(), "2026-09-08")
        parsed = to_datetime("2026-09-01 13:00:00")
        self.assertEqual(parsed.year, 2026)
        self.assertEqual(parsed.hour, 13)


class MappingTest(unittest.TestCase):
    def test_sheet_aliases(self):
        self.assertEqual(resolve_table_name("가맹점"), "merchants")
        self.assertEqual(resolve_table_name("축제정보"), "festivals")
        self.assertEqual(resolve_table_name("프로모션"), "discount_promotions")
        self.assertEqual(resolve_table_name("Sheet1", forced="coupons"), "coupons")

    def test_load_order_puts_municipalities_first(self):
        names = ["프로모션", "가맹점", "지자체", "축제"]
        ordered = sorted(names, key=sheet_sort_key)
        self.assertEqual(
            [resolve_table_name(name) for name in ordered],
            ["municipalities", "festivals", "merchants", "discount_promotions"],
        )
        self.assertEqual(LOAD_ORDER[0], "municipalities")

    def test_korean_municipality_row(self):
        mapped = apply_profile(
            {"지자체명": "수원시", "지역코드": "GG_SUWON", "예산잔액": "50,000,000"},
            PROFILES["municipalities"],
        )
        self.assertEqual(mapped["name"], "수원시")
        self.assertEqual(mapped["region_code"], "GG_SUWON")
        self.assertEqual(mapped["budget_balance"], Decimal("50000000"))
        self.assertNotIn("metro_region", mapped)

    def test_merchant_requires_core_fields_and_fills_owner(self):
        mapped = apply_profile(
            {
                "상호명": "화성행궁 한정식",
                "사업자등록번호": "123-45-00001",
                "업종": "음식점",
                "주소": "경기도 수원시",
                "인증여부": "예",
            },
            PROFILES["merchants"],
        )
        self.assertEqual(mapped["business_name"], "화성행궁 한정식")
        self.assertTrue(mapped["is_verified"])
        self.assertTrue(mapped["owner_user_id"])

    def test_missing_required_raises(self):
        with self.assertRaises(LoadError):
            apply_profile({"축제명": "없는축제"}, PROFILES["festivals"])

    def test_promotion_copies_remaining_quantity(self):
        mapped = apply_profile(
            {
                "프로모션명": "10% 할인",
                "점주할인율": 5,
                "총수량": 100,
                "시작일시": "2026-09-01",
                "종료일시": "2026-09-30",
            },
            PROFILES["discount_promotions"],
        )
        self.assertEqual(mapped["remaining_quantity"], 100)
        self.assertEqual(mapped["merchant_discount_rate"], Decimal("5"))
        self.assertNotIn("gov_matching_rate", mapped)


class SqlAndSslTest(unittest.TestCase):
    def test_upsert_sql(self):
        sql = build_upsert_sql(
            "merchants",
            ["business_name", "business_number", "owner_user_id"],
            ("business_number",),
            ("owner_user_id",),
        )
        self.assertIn("INSERT INTO merchants", sql)
        self.assertIn("ON CONFLICT (business_number) DO UPDATE SET business_name = EXCLUDED.business_name", sql)
        self.assertNotIn("owner_user_id = EXCLUDED.owner_user_id", sql)
        self.assertTrue(sql.endswith("RETURNING id"))

    def test_rejects_unsafe_identifiers(self):
        with self.assertRaises(LoadError):
            build_upsert_sql("merchants;drop", ["name"], ())

    def test_ssl_for_neon_and_local(self):
        self.assertTrue(should_use_ssl("postgresql://u:p@ep-x.ap-northeast-2.aws.neon.tech/db?sslmode=require"))
        self.assertFalse(should_use_ssl("postgresql://postgres@localhost:5432/gyeonggi"))
        self.assertFalse(should_use_ssl("postgresql://u:p@db.example.com/db?sslmode=disable"))


class TemplateExcelTest(unittest.TestCase):
    def test_create_and_read_template(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "template.xlsx"
            create_template(path)
            sheets = {name: records for name, _headers, records in read_excel_sheets(path)}
            self.assertIn("지자체", sheets)
            self.assertIn("가맹점", sheets)
            muni = apply_profile(sheets["지자체"][0], PROFILES["municipalities"])
            self.assertEqual(muni["region_code"], "GG_SUWON")
            merchant = apply_profile(sheets["가맹점"][0], PROFILES["merchants"])
            self.assertEqual(merchant["business_number"], "123-45-00001")
            festival = apply_profile(sheets["축제"][0], PROFILES["festivals"])
            self.assertEqual(festival["title"], "수원화성문화제")
            self.assertEqual(festival["start_date"], date(2026, 9, 1))


class CliTest(unittest.TestCase):
    def test_parse_dry_run(self):
        args = parse_args(["--file", "a.xlsx", "--dry-run", "--sheet", "가맹점"])
        self.assertTrue(args.dry_run)
        self.assertEqual(args.sheet, "가맹점")
        self.assertEqual(args.file, "a.xlsx")

    def test_load_file_requires_excel_and_database_url(self):
        with self.assertRaises(LoadError):
            load_file(Path("/tmp/does-not-exist.xlsx"), dsn="postgresql://localhost/db")
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "ok.xlsx"
            create_template(path)
            with self.assertRaises(LoadError) as ctx:
                load_file(path, dsn="")
            self.assertIn("DATABASE_URL", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
