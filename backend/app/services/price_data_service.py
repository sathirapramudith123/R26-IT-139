"""
PriceDataService
================
Parses the daily wholesale price PDF published by the
Hector Kobbekaduwa Agrarian Research and Training Institute
and stores structured price records in MongoDB.
"""

import re
import io
from datetime import datetime, timezone
from typing import Optional

import pdfplumber
import pandas as pd

from app.repositories.price_data_repository import PriceDataRepository


MARKETS_PAGE2 = [
    "Peliyagoda", "Kandy", "Dambulla", "Meegoda",
    "Norochchole", "Thambuththegama", "Keppetipola",
    "Nuwaraeliya", "Bandarawela", "Veyangoda",
]

CATEGORY_MARKERS = {
    "Up Country Vegetable": "vegetable_upcountry",
    "Low country Vegetable": "vegetable_lowcountry",
    "Banana":               "fruit",
    "Other Fruits":         "fruit",
    "Rice":                 "rice",
    "Subsidiary Food Crops":"subsidiary",
    "Dried Chillies":       "subsidiary",
    "Onion":                "subsidiary",
    "Potatoes":             "subsidiary",
    "Pulses":               "subsidiary",
    "Consumption Item":     "consumption",
    "Eggs":                 "consumption",
}

SKIP_ITEMS = {
    "", "variety", "item", "up country vegetable",
    "low country vegetable", "banana", "other fruits (rs/fruit)",
    "rice (rs/kg)", "imported rice", "subsidiary food crops",
    "dried chillies (rs/kg)", "onion (rs/kg)", "big onion",
    "potatoes (rs/kg)", "pulses (rs/kg)",
    "consumption item(rs/kg)", "eggs (rs/egg)",
}


def _parse_range(cell):
    if not cell or str(cell).strip() in ("-", "", "None", "none"):
        return None, None, None
    cell = str(cell).strip()
    m = re.match(r"([\d.]+)\s*-\s*([\d.]+)", cell)
    if m:
        lo, hi = float(m.group(1)), float(m.group(2))
        return lo, hi, round((lo + hi) / 2, 2)
    m2 = re.match(r"^([\d.]+)$", cell)
    if m2:
        v = float(m2.group(1))
        return v, v, v
    return None, None, None


def _extract_date(pdf):
    try:
        text = pdf.pages[0].extract_text() or ""
        m = re.search(r"(\d{4})[.\-/](\d{2})[.\-/](\d{2})", text)
        if m:
            return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
    except Exception:
        pass
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _parse_page2(table, report_date):
    records = []
    category = "vegetable_upcountry"
    for row in table[2:]:
        if not row or not row[0]:
            continue
        item_raw = str(row[0]).strip()
        item_lower = item_raw.lower()
        for marker, cat in CATEGORY_MARKERS.items():
            if marker.lower() in item_lower:
                category = cat
                break
        if item_lower in SKIP_ITEMS:
            continue
        if len(item_lower) < 2:
            continue
        market_cols = [1, 2, 3, 5, 6, 7, 8, 9]
        for col_idx, market in zip(market_cols, MARKETS_PAGE2):
            if col_idx >= len(row):
                continue
            min_p, max_p, avg_p = _parse_range(row[col_idx])
            if avg_p is None:
                continue
            records.append({
                "id":         f"pd_{report_date}_{item_raw[:20]}_{market}".replace(" ", "_"),
                "date":       report_date,
                "item_name":  item_raw,
                "item_lower": item_lower,
                "category":   category,
                "market":     market,
                "min_price":  min_p,
                "max_price":  max_p,
                "avg_price":  avg_p,
                "source":     "HKARTI",
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
    return records


def _parse_page1(table, report_date):
    records = []
    if not table:
        return records
    big_cell = str(table[4][0] if len(table) > 4 and table[4] else "")
    avg_cell  = str(table[4][2] if len(table) > 4 and len(table[4]) > 2 else "")
    items_raw = re.findall(r"([A-Za-z][A-Za-z '\(\)]+?)\s+([\d.]+\s*-\s*[\d.]+|-)\s*(?=\n|$)", big_cell)
    avgs_raw  = [x.strip() for x in avg_cell.strip().split("\n") if x.strip()]
    ITEM_CATEGORIES = {
        "samba": "rice", "keeri": "rice", "nadu": "rice",
        "raw": "rice", "ponne": "rice",
        "chilli": "subsidiary", "onion": "subsidiary",
        "potato": "subsidiary", "gram": "pulse",
        "cowpea": "pulse", "dhal": "pulse",
        "sugar": "consumption", "flour": "consumption",
        "egg": "consumption", "brown": "consumption", "white": "consumption",
    }
    for idx, (item_name, range_str) in enumerate(items_raw):
        item_name = item_name.strip()
        if item_name.lower() in SKIP_ITEMS:
            continue
        min_p, max_p, _ = _parse_range(range_str)
        avg_p = float(avgs_raw[idx]) if idx < len(avgs_raw) else (
            round((min_p + max_p) / 2, 2) if min_p and max_p else None
        )
        if avg_p is None:
            continue
        cat = "other"
        for kw, c in ITEM_CATEGORIES.items():
            if kw in item_name.lower():
                cat = c
                break
        records.append({
            "id":         f"pd_{report_date}_{item_name[:20]}_Pettah".replace(" ", "_"),
            "date":       report_date,
            "item_name":  item_name,
            "item_lower": item_name.lower(),
            "category":   cat,
            "market":     "Pettah",
            "min_price":  min_p,
            "max_price":  max_p,
            "avg_price":  avg_p,
            "source":     "HKARTI",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    return records


class PriceDataService:
    def __init__(self):
        self.repo = PriceDataRepository()

    def parse_pdf(self, pdf_bytes: bytes):
        records = []
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            report_date = _extract_date(pdf)
            if len(pdf.pages) > 0:
                tables = pdf.pages[0].extract_tables()
                if tables:
                    records += _parse_page1(tables[0], report_date)
            if len(pdf.pages) > 1:
                tables = pdf.pages[1].extract_tables()
                if tables:
                    records += _parse_page2(tables[0], report_date)
        return records, report_date

    def to_csv(self, records):
        df = pd.DataFrame(records).drop(
            columns=["id", "item_lower", "source", "created_at"], errors="ignore"
        )
        return df.to_csv(index=False).encode("utf-8")

    async def save(self, records):
        saved = 0
        for rec in records:
            await self.repo.upsert(rec)
            saved += 1
        return saved

    async def get_market_price(self, item_name: str):
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        price = await self.repo.get_avg_price(item_name, today)
        if price is None:
            price = await self.repo.get_avg_price_latest(item_name)
        return price

    async def list_latest(self):
        return await self.repo.list_latest()

    async def get_all_dates(self):
        return await self.repo.get_all_dates()