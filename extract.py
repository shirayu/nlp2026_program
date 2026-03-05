#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = ["pydantic>=2.11,<3"]
# ///
"""
NLP2026 プログラムHTML から正規化JSONを抽出するスクリプト。
`data_for_extraction/workshop.json` と最終出力は Pydantic で検証する。

Usage:
    uv run extract.py --html <HTML> --out <JSON>
"""

import argparse
import hashlib
import json
import re
import sys
import unicodedata
from datetime import UTC, datetime, timedelta, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, NotRequired, TypedDict
from urllib.parse import urljoin

from pydantic import BaseModel, ConfigDict, RootModel, ValidationError, ValidationInfo, field_validator

Attrs = list[tuple[str, str | None]]
JsonDict = dict[str, Any]


class Author(TypedDict):
    name: str
    affiliation: str | None


class HeaderInfo(TypedDict):
    rooms: list[str]
    date: NotRequired[str]
    start_time: NotRequired[str]
    end_time: NotRequired[str]
    chair: NotRequired[str]


class RawSession(TypedDict):
    id: str
    title: str
    presentation_ids: list[str]
    section_kind: str | None
    section_title: str
    rooms: NotRequired[list[str]]
    date: NotRequired[str]
    start_time: NotRequired[str]
    end_time: NotRequired[str]
    chair: NotRequired[str]


class RawPresentation(TypedDict):
    id: str
    title: str
    authors: list[Author]
    presenter_name: str | None
    session_id: str
    pdf_url: str | None
    is_oral: bool
    oral_session_ref: str | None
    is_online: bool
    is_english: bool


class RawPerson(TypedDict):
    name: str
    paper_ids: list[str]
    presenter_paper_ids: list[str]


class SpecialEvent(TypedDict):
    title: str
    date: str
    start_time: str
    end_time: str
    rooms: list[str]
    url: str | None


# ─── ユーティリティ ────────────────────────────────────────────


def clean(text: str) -> str:
    text = text.replace("\u00a0", " ").replace("\u3000", " ")
    return re.sub(r"\s+", " ", text).strip()


class SourceUpdateTimeExtractor:
    """HTML内の更新時刻を抽出する。

    `patterns` に抽出ルールを足すだけで、他の更新時刻も追加できる。
    """

    def __init__(self, html_text: str) -> None:
        self.html_text = html_text
        self.jst = timezone(timedelta(hours=9))
        self.patterns: dict[str, re.Pattern[str]] = {
            "program_main": re.compile(
                r"最終更新日\s*[:：]\s*(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日\s*(\d{1,2}):(\d{2})"
            ),
        }

    def extract_all(self) -> dict[str, str]:
        extracted: dict[str, str] = {}
        for key, pattern in self.patterns.items():
            value = self._extract_jst_datetime(pattern)
            if value is not None:
                extracted[key] = value
        return extracted

    def _extract_jst_datetime(self, pattern: re.Pattern[str]) -> str | None:
        match = pattern.search(self.html_text)
        if match is None:
            return None

        year, month, day, hour, minute = (int(value) for value in match.groups())
        return datetime(year, month, day, hour, minute, tzinfo=self.jst).isoformat(timespec="seconds")


def normalize_room_name(name: str) -> str:
    name = clean(name)
    if name in {"3F 中ホール", "ライトキューブ宇都宮 3F"}:
        return "3F"
    if name == "2F 大会議室201・202":
        return "2F"
    return name


def compute_sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def to_jst_file_time(path: Path) -> str:
    jst = timezone(timedelta(hours=9))
    timestamp = datetime.fromtimestamp(path.stat().st_mtime, tz=jst)
    return timestamp.replace(microsecond=0).isoformat()


def normalize_session_title_key(title: str) -> str:
    return clean(unicodedata.normalize("NFKC", title))


_SESSION_ID_OVERRIDES: dict[str, str] = {
    normalize_session_title_key("テーマセッション1：人狼知能：噓を見破り説得する会話ゲームとLLM（ポスター）"): "TS1-q",
    normalize_session_title_key(
        "TS1:テーマセッション1：人狼知能：噓を見破り説得する会話ゲームとLLM（ポスター）"
    ): "TS1-q",
    normalize_session_title_key("テーマセッション1：人狼知能：噓を見破り説得する会話ゲームとLLM（総合討論）"): "TS1-a",
    normalize_session_title_key(
        "TS1:テーマセッション1：人狼知能：噓を見破り説得する会話ゲームとLLM（総合討論）"
    ): "TS1-a",
    normalize_session_title_key(
        "テーマセッション2：せめぎ合う計算言語学——LLM時代に揺れ動く言語観の中で——（ポスター）"
    ): "TS2-q",
    normalize_session_title_key(
        "TS2:テーマセッション2：せめぎ合う計算言語学——LLM時代に揺れ動く言語観の中で——（ポスター）"
    ): "TS2-q",
    normalize_session_title_key(
        "テーマセッション2：せめぎ合う計算言語学——LLM時代に揺れ動く言語観の中で——（総合討論）"
    ): "TS2-a",
    normalize_session_title_key(
        "TS2:テーマセッション2：せめぎ合う計算言語学——LLM時代に揺れ動く言語観の中で——（総合討論）"
    ): "TS2-a",
    normalize_session_title_key("テーマセッション3：法ドメインにおける言語処理（ポスター）"): "TS3-q",
    normalize_session_title_key("TS3:テーマセッション3：法ドメインにおける言語処理（ポスター）"): "TS3-q",
    normalize_session_title_key("テーマセッション3：法ドメインにおける言語処理（総合討論）"): "TS3-a",
    normalize_session_title_key("TS3:テーマセッション3：法ドメインにおける言語処理（総合討論）"): "TS3-a",
    normalize_session_title_key(
        "テーマセッション4：大規模言語モデル時代の数式NLP：表現・推論・検証の実務基盤（ポスター）"
    ): "TS4-q",
    normalize_session_title_key(
        "TS4:テーマセッション4：大規模言語モデル時代の数式NLP：表現・推論・検証の実務基盤（ポスター）"
    ): "TS4-q",
    normalize_session_title_key(
        "テーマセッション4：大規模言語モデル時代の数式NLP：表現・推論・検証の実務基盤（総合討論）"
    ): "TS4-a",
    normalize_session_title_key(
        "TS4:テーマセッション4：大規模言語モデル時代の数式NLP：表現・推論・検証の実務基盤（総合討論）"
    ): "TS4-a",
}


def parse_authors(raw: str) -> tuple[list[Author], str | None, bool]:
    """
    著者文字列をパースし (authors, presenter_name, is_english) を返す。
      authors = [{"name": str, "affiliation": str | None}, ...]
      is_english: ◊ マークがあれば True
    括弧外のカンマで分割する。
    """
    raw = clean(raw)
    presenter_name: str | None = None
    is_english = False
    authors: list[Author] = []

    # 括弧外のカンマで分割
    entries: list[str] = []
    depth = 0
    buf: list[str] = []
    for ch in raw:
        if ch == "(":
            depth += 1
            buf.append(ch)
        elif ch == ")":
            depth -= 1
            buf.append(ch)
        elif ch == "," and depth == 0:
            entries.append("".join(buf).strip())
            buf = []
        else:
            buf.append(ch)
    if buf:
        entries.append("".join(buf).strip())

    for entry in entries:
        entry = entry.strip()
        is_presenter = "○" in entry
        if "◊" in entry:
            is_english = True
        entry = entry.replace("○", "").replace("◊", "").strip()

        m = re.match(r"^(.+?)\s*\((.+)\)\s*$", entry)
        if m:
            name = clean(m.group(1))
            affiliation = clean(m.group(2))
        else:
            name = clean(entry)
            affiliation = None

        if not name:
            continue

        authors.append({"name": name, "affiliation": affiliation})
        if is_presenter and presenter_name is None:
            presenter_name = name

    return authors, presenter_name, is_english


def parse_speakers(raw: str) -> tuple[list[Author], str | None]:
    """
    特殊セッションの講演者文字列をパースし (authors, presenter_name) を返す。
    末尾の全体所属は全講演者に付与する。
    """
    raw = clean(raw)
    raw = re.sub(r"^(講演者|著者)[:：]\s*", "", raw)

    affiliation = None
    m = re.match(r"^(.*?)[(（]([^()（）]+)[)）]\s*$", raw)
    if m:
        raw = clean(m.group(1))
        affiliation = clean(m.group(2))

    authors: list[Author] = []
    for entry in re.split(r"[・]", raw):
        name = clean(entry)
        name = re.sub(r"\s*先生\s*$", "", name)
        if not name:
            continue
        authors.append({"name": name, "affiliation": affiliation})

    presenter_name = authors[0]["name"] if authors else None
    return authors, presenter_name


def split_rooms(raw: str) -> list[str]:
    raw = clean(raw)
    if not raw:
        return []

    matches: list[str] = []
    i = 0
    while i < len(raw):
        match = re.search(r"[A-Z]会場", raw[i:])
        if not match:
            break

        start = i + match.start()
        end = i + match.end()
        prefixes = [raw[start:end]]
        cursor = end

        while cursor < len(raw):
            chained = re.match(r"・([A-Z]会場)", raw[cursor:])
            if not chained:
                break
            prefixes.append(chained.group(1))
            cursor += len(chained.group(0))

        if cursor < len(raw) and raw[cursor] == "(":
            depth = 0
            suffix_end = cursor
            while suffix_end < len(raw):
                if raw[suffix_end] == "(":
                    depth += 1
                elif raw[suffix_end] == ")":
                    depth -= 1
                    if depth == 0:
                        suffix = raw[cursor + 1 : suffix_end]
                        matches.extend(f"{prefix}({suffix})" for prefix in prefixes)
                        i = suffix_end + 1
                        break
                suffix_end += 1
            else:
                matches.extend(prefixes)
                i = cursor
        else:
            matches.extend(prefixes)
            i = cursor

    if matches:
        return [normalize_room_name(match) for match in matches]

    return [normalize_room_name(part) for part in re.split(r"\s*[、，,／/]\s*", raw) if part]


def parse_header_text(text: str) -> HeaderInfo:
    result: HeaderInfo = {"rooms": []}

    m = re.search(r"(\d+/\d+)\s*\([月火水木金土日]\)", text)
    if m:
        month, day = m.group(1).split("/")
        result["date"] = f"2026-{int(month):02d}-{int(day):02d}"

    m = re.search(r"(\d{1,2}:\d{2})-(\d{1,2}:\d{2})", text)
    if m:
        result["start_time"] = m.group(1)
        result["end_time"] = m.group(2)

    result["rooms"] = split_rooms(text)

    m = re.search(r"座長[:：]\s*(.+?)(?:\s*$)", text)
    if m:
        result["chair"] = clean(m.group(1))

    return result


# ─── HTMLパーサー（生データ収集） ─────────────────────────────────


class ProgramParser(HTMLParser):
    """生の発表・セッション・著者データを収集する。正規化は normalize() で行う。"""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)

        self.raw_sessions: list[RawSession] = []
        self.raw_presentations: list[RawPresentation] = []  # ORAL エントリを含む
        self.raw_persons: list[RawPerson] = []

        # セクション状態
        self._in_session_list = False
        self._in_author_list = False

        # セッション
        self._cur_session: RawSession | None = None
        self._in_session_header = False
        self._in_session_title_span = False
        self._session_header_text: list[str] = []
        self._session_title_text: list[str] = []

        # 発表テーブル
        self._in_session_table = False
        self._in_tr = False
        self._tr_cells: list[str] = []
        self._cur_cell: list[str] = []
        self._in_td = False

        # pid 行で収集（行単位でリセット）
        self._td_is_pid = False
        self._span_pid_id: str = ""
        self._row_is_oral: bool = False  # span id が ORAL 末尾
        self._row_oral_session_ref: str | None = None  # (A1) リンク先
        self._row_is_online: bool = False  # 💻 マーク

        # タイトル行確定後に保持（著者行で参照）
        self._cur_pid: str = ""
        self._cur_title: str = ""
        self._cur_pdf_url: str | None = None
        self._cur_is_oral: bool = False
        self._cur_oral_session_ref: str | None = None
        self._cur_is_online: bool = False

        # 特殊セッションの本文
        self._section_heading_id: str | None = None
        self._section_heading_text: list[str] = []
        self._in_section_heading = False
        self._in_session_body_title = False
        self._session_body_title_text: list[str] = []
        self._in_session_body_speakers = False
        self._session_body_speakers_text: list[str] = []
        self._cur_body_title: str = ""
        self._cur_body_speakers: str = ""

        # 著者索引
        self._author_tds: list[str] = []
        self._in_author_tr = False
        self._seen_persons: set[str] = set()

        # div 深さ管理
        self._global_div_depth = 0
        self._session_div_depth = 0

    def handle_starttag(self, tag: str, attrs: Attrs) -> None:
        a = dict(attrs)

        if tag == "h2":
            aid = a.get("id", "")
            if aid == "session_list":
                self._in_session_list = True
                self._in_author_list = False
            elif aid == "author_list":
                self._in_author_list = True
                self._in_session_list = False
            return

        # ── 著者索引 ──────────────────────────────────────────
        if self._in_author_list:
            if tag == "tr":
                self._in_author_tr = True
                self._author_tds = []
            elif tag == "td" and self._in_author_tr:
                self._in_td = True
                self._cur_cell = []
            return

        if not self._in_session_list:
            return

        if tag == "h3" and self._cur_session is None:
            aid = a.get("id", "")
            if aid in {"tutorial", "invited", "invitedpapers", "general"}:
                self._section_heading_id = aid
                self._section_heading_text = []
                self._in_section_heading = True
            return

        # ── div (セッション境界) ───────────────────────────────
        if tag == "div":
            self._global_div_depth += 1
            cls = a.get("class") or ""
            if re.match(r"^session\d+$", cls):
                self._cur_session = {
                    "id": "",
                    "title": "",
                    "presentation_ids": [],
                    "section_kind": self._section_heading_id,
                    "section_title": clean("".join(self._section_heading_text)),
                }
                self._session_div_depth = self._global_div_depth
                self._in_session_table = False
                self._cur_body_title = ""
                self._cur_body_speakers = ""
                return
            if cls == "session_header" and self._cur_session is not None:
                self._in_session_header = True
                self._session_header_text = []
                self._session_title_text = []
                return

        if tag == "h3" and self._cur_session is not None and not self._in_session_header:
            self._in_session_body_title = True
            self._session_body_title_text = []
            return

        if tag == "h4" and self._cur_session is not None and not self._in_session_header:
            self._in_session_body_speakers = True
            self._session_body_speakers_text = []
            return

        if tag == "span" and self._in_session_header:
            if a.get("class", "") == "session_title":
                self._in_session_title_span = True
                sid = a.get("id", "")
                if sid and self._cur_session is not None:
                    self._cur_session["id"] = sid

        if tag == "table" and self._cur_session is not None and not self._in_session_header:
            self._in_session_table = True
            return

        if self._in_session_table and self._cur_session is not None:
            if tag == "tr":
                self._in_tr = True
                self._tr_cells = []
                self._cur_cell = []
                self._in_td = False
                # 行単位マーカーをリセット
                self._td_is_pid = False
                self._span_pid_id = ""
                self._row_is_oral = False
                self._row_oral_session_ref = None
                self._row_is_online = False
                return

            if tag == "td" and self._in_tr:
                self._in_td = True
                self._cur_cell = []
                self._td_is_pid = a.get("class", "") == "pid"
                return

            if tag == "span" and self._in_td and self._td_is_pid:
                sid = a.get("id", "")
                if sid:
                    if sid.endswith("ORAL"):
                        self._row_is_oral = True
                        self._span_pid_id = sid[:-4]  # "ORAL" を除去
                    else:
                        self._row_is_oral = False
                        self._span_pid_id = sid

            if tag == "a" and self._in_td:
                href = a.get("href") or ""
                if href.endswith(".pdf"):
                    self._cur_pdf_url = href
                elif href.startswith("#") and self._td_is_pid:
                    ref = href[1:]
                    # "(A1)" のような口頭セッション参照
                    if re.match(r"^A\d+$", ref):
                        self._row_oral_session_ref = ref

    def handle_data(self, data: str) -> None:
        if self._in_author_list and self._in_td:
            self._cur_cell.append(data)
            return

        if not self._in_session_list:
            return

        if self._in_section_heading:
            self._section_heading_text.append(data)
            return

        if self._in_session_title_span:
            self._session_title_text.append(data)
        if self._in_session_header:
            self._session_header_text.append(data)
        if self._in_session_body_title:
            self._session_body_title_text.append(data)
        if self._in_session_body_speakers:
            self._session_body_speakers_text.append(data)

        if self._in_session_table and self._in_td:
            if self._td_is_pid and "💻" in data:
                self._row_is_online = True
            self._cur_cell.append(data)

    def handle_endtag(self, tag: str) -> None:
        # ── 著者索引 ──────────────────────────────────────────
        if self._in_author_list:
            if tag == "td" and self._in_td:
                self._author_tds.append(clean("".join(self._cur_cell)))
                self._cur_cell = []
                self._in_td = False
            elif tag == "tr" and self._in_author_tr:
                self._flush_author_row()
                self._in_author_tr = False
                self._author_tds = []
            return

        if not self._in_session_list:
            return

        if tag == "h3" and self._in_section_heading:
            self._in_section_heading = False
            return

        if tag == "span" and self._in_session_title_span:
            if self._cur_session is not None:
                title = clean("".join(self._session_title_text))
                self._cur_session["title"] = title
                override_id = _SESSION_ID_OVERRIDES.get(normalize_session_title_key(title))
                if override_id:
                    self._cur_session["id"] = override_id
            self._in_session_title_span = False

        if tag == "h3" and self._in_session_body_title:
            self._cur_body_title = clean("".join(self._session_body_title_text))
            self._in_session_body_title = False

        if tag == "h4" and self._in_session_body_speakers:
            self._cur_body_speakers = clean("".join(self._session_body_speakers_text))
            self._in_session_body_speakers = False

        if tag == "div" and self._in_session_header:
            text = clean("".join(self._session_header_text))
            if self._cur_session is not None:
                header = parse_header_text(text)
                self._cur_session["rooms"] = header["rooms"]
                if "date" in header:
                    self._cur_session["date"] = header["date"]
                if "start_time" in header:
                    self._cur_session["start_time"] = header["start_time"]
                if "end_time" in header:
                    self._cur_session["end_time"] = header["end_time"]
                if "chair" in header:
                    self._cur_session["chair"] = header["chair"]
            self._in_session_header = False
            self._session_header_text = []

        if self._in_session_table and self._cur_session is not None:
            if tag == "td" and self._in_td:
                self._tr_cells.append(clean("".join(self._cur_cell)))
                self._cur_cell = []
                self._in_td = False
            elif tag == "tr" and self._in_tr:
                self._flush_presentation_row()
                self._in_tr = False
                self._tr_cells = []
            elif tag == "table":
                self._in_session_table = False

        if tag == "div":
            if self._cur_session is not None and self._session_div_depth == self._global_div_depth:
                self._finalize_special_session()
                if self._cur_session.get("id"):
                    self.raw_sessions.append(self._cur_session)
                self._cur_session = None
                self._in_session_table = False
            self._global_div_depth -= 1

    def _finalize_special_session(self) -> None:
        if self._cur_session is None:
            return

        section_kind = self._cur_session.get("section_kind")
        section_title = self._cur_session.get("section_title", "")

        if self._cur_session.get("id") == "invited":
            title = unicodedata.normalize("NFKC", self._cur_session.get("title", ""))
            m = re.search(r"(\d+)\s*$", title)
            if m:
                self._cur_session["id"] = f"invited{m.group(1)}"

        if not self._cur_session.get("title"):
            self._cur_session["title"] = section_title

        if self._cur_session["presentation_ids"] or not self._cur_body_title:
            return

        if section_kind not in {"tutorial", "invited"}:
            return

        pres_id = f"{self._cur_session['id']}-1"
        authors, presenter_name = parse_speakers(self._cur_body_speakers)
        self.raw_presentations.append(
            {
                "id": pres_id,
                "title": self._cur_body_title,
                "authors": authors,
                "presenter_name": presenter_name,
                "session_id": self._cur_session["id"],
                "pdf_url": None,
                "is_oral": False,
                "oral_session_ref": None,
                "is_online": False,
                "is_english": False,
            }
        )
        self._cur_session["presentation_ids"].append(pres_id)

    def _flush_presentation_row(self) -> None:
        cells = self._tr_cells

        if self._span_pid_id:
            # タイトル行: マーカーを保存して次の著者行へ引き継ぐ
            title = cells[1] if len(cells) > 1 else ""
            title = re.sub(r"[\U00010000-\U0010ffff]", "", title).strip()
            self._cur_pid = self._span_pid_id
            self._cur_title = title
            self._cur_pdf_url = None
            self._cur_is_oral = self._row_is_oral
            self._cur_oral_session_ref = self._row_oral_session_ref
            self._cur_is_online = self._row_is_online
        elif self._cur_pid:
            # 著者行
            authors_raw = cells[1] if len(cells) > 1 else (cells[0] if cells else "")
            authors, presenter_name, is_english = parse_authors(authors_raw)

            if self._cur_title and self._cur_session:
                self.raw_presentations.append(
                    {
                        "id": self._cur_pid,
                        "title": self._cur_title,
                        "authors": authors,  # [{"name": ..., "affiliation": ...}]
                        "presenter_name": presenter_name,
                        "session_id": self._cur_session["id"],
                        "pdf_url": self._cur_pdf_url,
                        "is_oral": self._cur_is_oral,
                        "oral_session_ref": self._cur_oral_session_ref,
                        "is_online": self._cur_is_online,
                        "is_english": is_english,
                    }
                )
                self._cur_session["presentation_ids"].append(self._cur_pid)

            self._cur_pid = ""
            self._cur_title = ""
            self._cur_pdf_url = None

    def _flush_author_row(self) -> None:
        tds = self._author_tds
        if len(tds) < 3:
            return
        name = tds[1]
        if not name or name.startswith("【"):
            return
        if name in self._seen_persons:
            return
        self._seen_persons.add(name)

        raw_ids = tds[2]
        paper_ids: list[str] = []
        presenter_ids: list[str] = []
        for m in re.finditer(r"([A-Z]{1,3}\d+-\d+[A-Z]?(?:ORAL)?)(○)?", raw_ids):
            pid = re.sub(r"ORAL$", "", m.group(1))
            paper_ids.append(pid)
            if m.group(2):
                presenter_ids.append(pid)

        self.raw_persons.append(
            {
                "name": name,
                "paper_ids": paper_ids,
                "presenter_paper_ids": presenter_ids,
            }
        )


# ─── 後処理・正規化 ───────────────────────────────────────────────


def fix_urls(raw_presentations: list[RawPresentation], base_url: str) -> None:
    """pdf_url が相対URLの場合、base_url を基準に絶対URLへ変換する。"""
    for entry in raw_presentations:
        if entry.get("pdf_url"):
            entry["pdf_url"] = urljoin(base_url, entry["pdf_url"])


def normalize(
    raw_sessions: list[RawSession],
    raw_presentations: list[RawPresentation],
    raw_persons: list[RawPerson],
) -> JsonDict:
    """
    生データを正規化した最終JSONを返す。

    出力スキーマ:
      persons:       {person_id: {name}}
      affiliations:  {affiliation_id: {name}}
      rooms:         {room_id: {name}}
      sessions:      {session_id: {title, date, start_time, end_time, room_ids, chair,
                                   presentation_ids[]}}
      presentations: {presentation_id: {title, session_id, presenter_id, is_english,
                                        is_online, [oral_session_id],
                                        authors: [{person_id, affiliation_id}],
                                        pdf_url}}
    """

    # ── 1. Person マスタ（著者索引が正典） ─────────────────────
    persons: dict[str, JsonDict] = {}
    name_to_pid: dict[str, str] = {}

    for i, rp in enumerate(raw_persons):
        pid = f"p{i + 1:04d}"
        persons[pid] = {"name": rp["name"]}
        name_to_pid[rp["name"]] = pid

    unknown_counter = [len(raw_persons)]

    def get_or_create_person(name: str) -> str:
        if name not in name_to_pid:
            unknown_counter[0] += 1
            pid = f"p{unknown_counter[0]:04d}"
            persons[pid] = {"name": name}
            name_to_pid[name] = pid
        return name_to_pid[name]

    # ── 2. Affiliation マスタ ───────────────────────────────────
    affiliations: dict[str, JsonDict] = {}
    aff_to_id: dict[str, str] = {}
    aff_counter = [0]

    def get_or_create_aff(name: str) -> str:
        if name not in aff_to_id:
            aff_counter[0] += 1
            aid = f"a{aff_counter[0]:04d}"
            affiliations[aid] = {"name": name}
            aff_to_id[name] = aid
        return aff_to_id[name]

    # ── 3. Room マスタ ─────────────────────────────────────────
    rooms: dict[str, JsonDict] = {}
    room_to_id: dict[str, str] = {}
    room_counter = [0]

    def get_or_create_room(name: str) -> str:
        if name not in room_to_id:
            room_counter[0] += 1
            rid = f"r{room_counter[0]:04d}"
            rooms[rid] = {"name": name}
            room_to_id[name] = rid
        return room_to_id[name]

    # ── 4. ORAL エントリから「どの論文がどの口頭セッションで発表されたか」を収集
    # ORAL側: entry["is_oral"] == True, entry["session_id"] が口頭セッション
    # poster側: entry["oral_session_ref"] が口頭セッション
    oral_session_for: dict[str, str] = {}

    for entry in raw_presentations:
        if entry["is_oral"]:
            oral_session_for[entry["id"]] = entry["session_id"]
    for entry in raw_presentations:
        if not entry["is_oral"] and entry.get("oral_session_ref"):
            oral_session_ref = entry["oral_session_ref"]
            if oral_session_ref is not None:
                oral_session_for.setdefault(entry["id"], oral_session_ref)

    # ── 5. 発表エントリを正規化（ORAL重複は除去） ───────────────
    presentations: dict[str, JsonDict] = {}

    for entry in raw_presentations:
        if entry["is_oral"]:
            continue  # ORAL エントリは session.presentation_ids への登録のみ

        pid = entry["id"]

        norm_authors: list[JsonDict] = []
        for a in entry["authors"]:
            person_id = get_or_create_person(a["name"])
            aff_id = get_or_create_aff(a["affiliation"]) if a["affiliation"] else None
            norm_authors.append({"person_id": person_id, "affiliation_id": aff_id})

        presenter_id = name_to_pid.get(entry["presenter_name"]) if entry["presenter_name"] else None

        p: JsonDict = {
            "title": entry["title"],
            "session_id": entry["session_id"],
            "presenter_id": presenter_id,
            "is_english": entry["is_english"],
            "is_online": entry["is_online"],
            "authors": norm_authors,
            "pdf_url": entry["pdf_url"],
        }
        if pid in oral_session_for:
            p["oral_session_id"] = oral_session_for[pid]

        presentations[pid] = p

    # ── 6. Sessions を dict に変換（重複除去して順序維持） ──────
    sessions: dict[str, JsonDict] = {}

    for s in raw_sessions:
        sid = s["id"]
        seen: set[str] = set()
        pids: list[str] = []
        for pid in s["presentation_ids"]:
            if pid not in seen:
                seen.add(pid)
                pids.append(pid)
        room_ids = [get_or_create_room(room) for room in s.get("rooms", [])]

        sessions[sid] = {
            "title": s.get("title", ""),
            "date": s.get("date", ""),
            "start_time": s.get("start_time", ""),
            "end_time": s.get("end_time", ""),
            "room_ids": room_ids,
            "chair": s.get("chair", ""),
            "presentation_ids": pids,
        }

    return {
        "persons": persons,
        "affiliations": affiliations,
        "rooms": rooms,
        "sessions": sessions,
        "presentations": presentations,
    }


# ─── スケジュール表パーサー（特殊イベント抽出） ──────────────────────

_SPECIAL_EVENT_IDS: dict[str, str] = {
    "オープニング": "opening",
    "スポンサーミートアップ": "sponsor",
    "懇親会": "reception",
    "クロージング": "closing",
}
_SPECIAL_EVENT_URLS: dict[str, str] = {
    "スポンサーミートアップ": "https://www.anlp.jp/nlp2026/#sponsor",
}

_WS_ZEN_DIGIT = {"１": 1, "２": 2, "３": 3, "４": 4}


def _special_event_id(title: str) -> str:
    if title in _SPECIAL_EVENT_IDS:
        return _SPECIAL_EVENT_IDS[title]
    m = re.search(r"ワークショップ([１２３４])", title)
    if m:
        return f"WS{_WS_ZEN_DIGIT[m.group(1)]}"
    return re.sub(r"[^\w]", "_", unicodedata.normalize("NFKC", title))[:16]


_TIME_RE = re.compile(r"^\d{1,2}:\d{2}$")
_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _require_non_empty(value: str, field_name: str) -> str:
    value = clean(value)
    if not value:
        raise ValueError(f"{field_name} は空文字列にできません")
    return value


def _validate_time(value: str, field_name: str) -> str:
    value = _require_non_empty(value, field_name)
    if not _TIME_RE.fullmatch(value):
        raise ValueError(f"{field_name} は H:MM 形式で指定してください")
    return value


def _validate_date(value: str, field_name: str) -> str:
    value = _require_non_empty(value, field_name)
    if not _DATE_RE.fullmatch(value):
        raise ValueError(f"{field_name} は YYYY-MM-DD 形式で指定してください")
    return value


def _format_validation_location(loc: tuple[Any, ...], root_name: str) -> str:
    path = root_name
    for item in loc:
        if item == "root":
            continue
        if isinstance(item, str):
            path += f".{item}" if path != root_name else f".{item}"
        else:
            path += f"[{item}]"
    return path


def _validation_error_to_message(error: ValidationError, root_name: str) -> str:
    details: list[str] = []
    for item in error.errors():
        location = _format_validation_location(tuple(item["loc"]), root_name)
        details.append(f"{location}: {item['msg']}")
    return "\n".join(details)


class WorkshopAuthorInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    affiliation: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        return _require_non_empty(value, "name")

    @field_validator("affiliation")
    @classmethod
    def validate_affiliation(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return _require_non_empty(value, "affiliation")


class WorkshopPresentationInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    title: str
    presenter: str | None = None
    is_english: bool = False
    is_online: bool = False
    pdf_url: str | None = None
    authors: list[WorkshopAuthorInput] = []

    @field_validator("id", "title", "presenter")
    @classmethod
    def validate_text_fields(cls, value: str | None, info: ValidationInfo) -> str | None:
        if value is None:
            return None
        return _require_non_empty(value, str(info.field_name))


class WorkshopSessionInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    title: str
    start_time: str
    end_time: str
    date: str | None = None
    chair: str | None = None
    rooms: list[str] | None = None
    url: str | None = None
    youtube_url: str | None = None
    presentations: list[WorkshopPresentationInput] = []

    @field_validator("id", "title", "chair", "url", "youtube_url")
    @classmethod
    def validate_text_fields(cls, value: str | None, info: ValidationInfo) -> str | None:
        if value is None:
            return None
        return _require_non_empty(value, str(info.field_name))

    @field_validator("start_time", "end_time")
    @classmethod
    def validate_times(cls, value: str, info: ValidationInfo) -> str:
        return _validate_time(value, str(info.field_name))

    @field_validator("date")
    @classmethod
    def validate_date(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return _validate_date(value, "date")

    @field_validator("rooms")
    @classmethod
    def validate_rooms(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None
        if not value:
            raise ValueError("rooms は空配列にできません")
        return [_require_non_empty(room, "rooms") for room in value]


class WorkshopConfigEntry(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str
    date: str
    start_time: str | None = None
    end_time: str | None = None
    rooms: list[str]
    chair: str | None = None
    url: str | None = None
    youtube_url: str | None = None
    sessions: list[WorkshopSessionInput] = []

    @field_validator("title", "chair", "url", "youtube_url")
    @classmethod
    def validate_text_fields(cls, value: str | None, info: ValidationInfo) -> str | None:
        if value is None:
            return None
        return _require_non_empty(value, str(info.field_name))

    @field_validator("date")
    @classmethod
    def validate_date(cls, value: str) -> str:
        return _validate_date(value, "date")

    @field_validator("start_time", "end_time")
    @classmethod
    def validate_times(cls, value: str | None, info: ValidationInfo) -> str | None:
        if value is None:
            return None
        return _validate_time(value, str(info.field_name))

    @field_validator("rooms")
    @classmethod
    def validate_rooms(cls, value: list[str]) -> list[str]:
        if not value:
            raise ValueError("rooms は空配列にできません")
        return [_require_non_empty(room, "rooms") for room in value]


class WorkshopConfigFile(RootModel[dict[str, WorkshopConfigEntry]]):
    @field_validator("root")
    @classmethod
    def validate_keys(cls, value: dict[str, WorkshopConfigEntry]) -> dict[str, WorkshopConfigEntry]:
        for sid in value:
            if not re.fullmatch(r"WS\d+", sid):
                raise ValueError(f"キーは WS1 のようなセッションIDにしてください: {sid!r}")
        return value


class InvitedPapersConfigFile(RootModel[list[WorkshopPresentationInput]]):
    @field_validator("root")
    @classmethod
    def validate_entries(cls, value: list[WorkshopPresentationInput]) -> list[WorkshopPresentationInput]:
        ids: set[str] = set()
        for entry in value:
            if not re.fullmatch(r"invitedpapers-\d+", entry.id):
                raise ValueError(f"id は invitedpapers-1 のような形式にしてください: {entry.id!r}")
            if entry.id in ids:
                raise ValueError(f"id が重複しています: {entry.id}")
            ids.add(entry.id)
        return value


class YoutubeConfigFile(RootModel[dict[str, str]]):
    @field_validator("root")
    @classmethod
    def validate_entries(cls, value: dict[str, str]) -> dict[str, str]:
        for sid, url in value.items():
            if not _require_non_empty(sid, "session_id"):
                continue
            _require_non_empty(url, "youtube_url")
        return value


class PersonRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str


class AffiliationRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str


class RoomRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str


class PresentationAuthorRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    person_id: str
    affiliation_id: str | None


class PresentationRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str
    session_id: str
    presenter_id: str | None
    is_english: bool
    is_online: bool
    authors: list[PresentationAuthorRecord]
    pdf_url: str | None
    oral_session_id: str | None = None


class SessionRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str
    date: str
    start_time: str
    end_time: str
    room_ids: list[str]
    chair: str
    presentation_ids: list[str]
    url: str | None = None
    youtube_url: str | None = None


class LastUpdateRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sha256: str | None = None
    time: str


class DataJsonRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    generated_at: str | None = None
    last_update: dict[str, LastUpdateRecord] | None = None
    persons: dict[str, PersonRecord]
    affiliations: dict[str, AffiliationRecord]
    rooms: dict[str, RoomRecord]
    sessions: dict[str, SessionRecord]
    presentations: dict[str, PresentationRecord]


def load_workshop_config(path: Path | None) -> dict[str, WorkshopConfigEntry]:
    """data_for_extraction/workshop.json を読み込む。存在しない場合は空辞書を返す。"""
    if path is None or not path.exists():
        return {}

    raw = json.loads(path.read_text(encoding="utf-8"))
    try:
        return WorkshopConfigFile.model_validate(raw).root
    except ValidationError as error:
        raise ValueError(_validation_error_to_message(error, "data_for_extraction/workshop.json")) from error


def load_invitedpapers_config(path: Path | None) -> list[WorkshopPresentationInput]:
    """data_for_extraction/invitedpapers.json を読み込む。存在しない場合は空リストを返す。"""
    if path is None or not path.exists():
        return []

    raw = json.loads(path.read_text(encoding="utf-8"))
    try:
        return InvitedPapersConfigFile.model_validate(raw).root
    except ValidationError as error:
        raise ValueError(_validation_error_to_message(error, "data_for_extraction/invitedpapers.json")) from error


def load_youtube_config(path: Path | None) -> dict[str, str]:
    """data_for_extraction/youtube.json を読み込む。存在しない場合は空辞書を返す。"""
    if path is None or not path.exists():
        return {}

    raw = json.loads(path.read_text(encoding="utf-8"))
    try:
        return YoutubeConfigFile.model_validate(raw).root
    except ValidationError as error:
        raise ValueError(_validation_error_to_message(error, "data_for_extraction/youtube.json")) from error


def apply_workshop_overrides(result: JsonDict, workshop_config: dict[str, WorkshopConfigEntry]) -> None:
    """data_for_extraction/workshop.json の内容で WS セッションを上書きし、個別セッションも追加する。"""
    name_to_pid = {person["name"]: pid for pid, person in result["persons"].items()}
    aff_to_id = {aff["name"]: aid for aid, aff in result["affiliations"].items()}
    person_counter = len(result["persons"])
    aff_counter = len(result["affiliations"])
    room_to_id = {room["name"]: rid for rid, room in result["rooms"].items()}
    room_counter = len(result["rooms"])

    def get_or_create_person(name: str) -> str:
        nonlocal person_counter
        if name not in name_to_pid:
            person_counter += 1
            pid = f"p{person_counter:04d}"
            result["persons"][pid] = {"name": name}
            name_to_pid[name] = pid
        return name_to_pid[name]

    def get_or_create_affiliation(name: str | None) -> str | None:
        nonlocal aff_counter
        if not name:
            return None
        if name not in aff_to_id:
            aff_counter += 1
            aid = f"a{aff_counter:04d}"
            result["affiliations"][aid] = {"name": name}
            aff_to_id[name] = aid
        return aff_to_id[name]

    def get_or_create_room(name: str) -> str:
        nonlocal room_counter
        if name not in room_to_id:
            room_counter += 1
            rid = f"r{room_counter:04d}"
            result["rooms"][rid] = {"name": name}
            room_to_id[name] = rid
        return room_to_id[name]

    for sid, override in workshop_config.items():
        room_ids = [get_or_create_room(normalize_room_name(name)) for name in override.rooms]
        session = {
            "title": override.title,
            "date": override.date,
            "start_time": override.start_time or "",
            "end_time": override.end_time or "",
            "room_ids": room_ids,
            "chair": override.chair or "",
            "presentation_ids": [],
        }
        if override.url:
            session["url"] = override.url
        if override.youtube_url:
            session["youtube_url"] = override.youtube_url
        result["sessions"][sid] = session

        child_prefix = f"{sid}-"
        stale_child_ids = [existing_sid for existing_sid in result["sessions"] if existing_sid.startswith(child_prefix)]
        for stale_sid in stale_child_ids:
            del result["sessions"][stale_sid]

        child_sessions = override.sessions
        for child in child_sessions:
            child_sid = child.id
            child_room_ids = (
                [get_or_create_room(normalize_room_name(name)) for name in child.rooms]
                if child.rooms
                else session["room_ids"]
            )
            if child_sid in result["sessions"]:
                raise ValueError(f"data_for_extraction/workshop.json の個別セッションIDが重複しています: {child_sid}")

            presentation_ids: list[str] = []
            for presentation in child.presentations:
                pid = presentation.id
                if pid in result["presentations"]:
                    raise ValueError(f"data_for_extraction/workshop.json の発表IDが重複しています: {pid}")

                normalized_authors: list[JsonDict] = []
                for author in presentation.authors:
                    person_id = get_or_create_person(author.name)
                    affiliation_id = get_or_create_affiliation(author.affiliation)
                    normalized_authors.append(
                        {
                            "person_id": person_id,
                            "affiliation_id": affiliation_id,
                        }
                    )

                presenter_name = presentation.presenter
                if presenter_name is None and presentation.authors:
                    presenter_name = presentation.authors[0].name
                presenter_id = get_or_create_person(presenter_name) if presenter_name else None

                result["presentations"][pid] = {
                    "title": presentation.title,
                    "session_id": child_sid,
                    "presenter_id": presenter_id,
                    "is_english": presentation.is_english,
                    "is_online": presentation.is_online,
                    "authors": normalized_authors,
                    "pdf_url": presentation.pdf_url,
                }
                presentation_ids.append(pid)

            entry = {
                "title": child.title,
                "date": child.date or session["date"],
                "start_time": child.start_time,
                "end_time": child.end_time,
                "room_ids": child_room_ids,
                "chair": child.chair or "",
                "presentation_ids": presentation_ids,
            }
            if child.url:
                entry["url"] = child.url
            elif session.get("url"):
                entry["url"] = session["url"]
            if child.youtube_url:
                entry["youtube_url"] = child.youtube_url
            elif session.get("youtube_url"):
                entry["youtube_url"] = session["youtube_url"]

            result["sessions"][child_sid] = entry


def apply_invitedpapers_config(result: JsonDict, invitedpapers_config: list[WorkshopPresentationInput]) -> None:
    """data_for_extraction/invitedpapers.json の内容で発表を追加する。"""
    if not invitedpapers_config:
        return

    invitedpapers_session = result["sessions"].get("invitedpapers")
    if invitedpapers_session is None:
        raise ValueError("invitedpapers セッションが data.json に存在しません")

    name_to_pid = {person["name"]: pid for pid, person in result["persons"].items()}
    aff_to_id = {aff["name"]: aid for aid, aff in result["affiliations"].items()}
    person_counter = len(result["persons"])
    aff_counter = len(result["affiliations"])

    def get_or_create_person(name: str) -> str:
        nonlocal person_counter
        if name not in name_to_pid:
            person_counter += 1
            pid = f"p{person_counter:04d}"
            result["persons"][pid] = {"name": name}
            name_to_pid[name] = pid
        return name_to_pid[name]

    def get_or_create_affiliation(name: str | None) -> str | None:
        nonlocal aff_counter
        if not name:
            return None
        if name not in aff_to_id:
            aff_counter += 1
            aid = f"a{aff_counter:04d}"
            result["affiliations"][aid] = {"name": name}
            aff_to_id[name] = aid
        return aff_to_id[name]

    presentation_ids: list[str] = []
    for presentation in invitedpapers_config:
        pid = presentation.id
        if pid in result["presentations"]:
            raise ValueError(f"data_for_extraction/invitedpapers.json の発表IDが重複しています: {pid}")

        normalized_authors: list[JsonDict] = []
        for author in presentation.authors:
            person_id = get_or_create_person(author.name)
            affiliation_id = get_or_create_affiliation(author.affiliation)
            normalized_authors.append({"person_id": person_id, "affiliation_id": affiliation_id})

        presenter_name = presentation.presenter
        if presenter_name is None and presentation.authors:
            presenter_name = presentation.authors[0].name
        presenter_id = get_or_create_person(presenter_name) if presenter_name else None

        result["presentations"][pid] = {
            "title": presentation.title,
            "session_id": "invitedpapers",
            "presenter_id": presenter_id,
            "is_english": presentation.is_english,
            "is_online": presentation.is_online,
            "authors": normalized_authors,
            "pdf_url": presentation.pdf_url,
        }
        presentation_ids.append(pid)

    invitedpapers_session["presentation_ids"] = presentation_ids


def apply_youtube_config(result: JsonDict, youtube_config: dict[str, str]) -> None:
    """data_for_extraction/youtube.json の内容でセッションに YouTube URL を付与する。"""
    for session_id, youtube_url in youtube_config.items():
        session = result["sessions"].get(session_id)
        if session is None:
            raise ValueError(f"data_for_extraction/youtube.json のセッションIDが存在しません: {session_id}")
        session["youtube_url"] = youtube_url


class ScheduleTableParser(HTMLParser):
    """
    <table id="session_table"> からスペシャルイベント行を抽出する。
    program_oral / program_poster セルを持たず、かつ内部リンク (#xxx) を
    持たない行を「特殊イベント」として収集する（オープニング、懇親会、ワークショップ等）。
    """

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._in_table = False
        self._current_date = ""
        self._in_tr = False
        self._row_has_regular_session = False
        self._in_time_td = False
        self._in_event_td = False
        self._in_venue_b = False
        self._has_internal_link = False
        self._time_text: list[str] = []
        self._title_text: list[str] = []
        self._venue_text: list[str] = []
        self._external_url: str | None = None
        self._row_time: str = ""
        self.special_events: list[SpecialEvent] = []

    def handle_starttag(self, tag: str, attrs: Attrs) -> None:
        a = dict(attrs)

        if tag == "table" and a.get("id") == "session_table":
            self._in_table = True
            return

        if not self._in_table:
            return

        if tag == "tr":
            # 前の行が </tr> なしで終わっている場合もフラッシュ
            if self._in_tr:
                self._flush_row()
            self._in_tr = True
            self._row_has_regular_session = False
            self._in_time_td = False
            self._in_event_td = False
            self._in_venue_b = False
            self._has_internal_link = False
            self._time_text = []
            self._title_text = []
            self._venue_text = []
            self._external_url = None
            return
            return

        if not self._in_tr:
            return

        if tag == "td":
            cls = a.get("class") or ""
            if cls == "program_time":
                self._in_time_td = True
                self._time_text = []
            elif "program_oral" in cls or "program_poster" in cls:
                self._row_has_regular_session = True
            elif not cls and a.get("colspan"):
                self._in_event_td = True
                self._title_text = []
                self._venue_text = []
            return

        if self._in_event_td:
            if tag == "b":
                self._in_venue_b = True
            elif tag == "a" and not self._in_venue_b:
                href = a.get("href") or ""
                if href.startswith("#"):
                    self._has_internal_link = True
                else:
                    self._external_url = href

    def handle_data(self, data: str) -> None:
        if not self._in_table:
            return

        m = re.search(r"(\d+/\d+)\s*\([月火水木金土日]\)", data)
        if m:
            month, day = m.group(1).split("/")
            self._current_date = f"2026-{int(month):02d}-{int(day):02d}"

        if self._in_time_td:
            self._time_text.append(data)
        elif self._in_event_td:
            if self._in_venue_b:
                self._venue_text.append(data)
            else:
                self._title_text.append(data)

    def handle_endtag(self, tag: str) -> None:
        if not self._in_table:
            return

        if tag == "table":
            self._in_table = False
            return

        if tag == "b" and self._in_venue_b:
            self._in_venue_b = False

        if tag == "td":
            if self._in_time_td:
                self._row_time = clean("".join(self._time_text))
                self._in_time_td = False
            elif self._in_event_td:
                self._in_event_td = False
            return

        if tag == "tr" and self._in_tr:
            self._in_tr = False
            self._flush_row()

    def _flush_row(self) -> None:
        """現在の行をスペシャルイベントとして記録する（条件を満たす場合）。"""
        title = clean("".join(self._title_text))
        if (
            not self._row_has_regular_session
            and not self._has_internal_link
            and self._row_time
            and title
            and self._current_date
        ):
            venue = clean("".join(self._venue_text))
            m2 = re.match(r"(\d{1,2}:\d{2})-(\d{1,2}:\d{2})", self._row_time)
            start_time = m2.group(1) if m2 else self._row_time
            end_time = m2.group(2) if m2 else ""
            self.special_events.append(
                {
                    "title": title,
                    "date": self._current_date,
                    "start_time": start_time,
                    "end_time": end_time,
                    "rooms": split_rooms(venue),
                    "url": self._external_url,
                }
            )


# ─── メイン ───────────────────────────────────────────────────────


def main() -> None:
    parser = argparse.ArgumentParser(description="NLP2026 プログラムHTML→JSON 抽出スクリプト")
    parser.add_argument("--html", required=True, help="入力HTMLファイルパス")
    parser.add_argument("--out", required=True, help="出力JSONファイルパス")
    parser.add_argument(
        "--base-url",
        default=None,
        help="PDF等の相対URLを解決する基底URL (例: https://www.anlp.jp/proceedings/)",
    )
    parser.add_argument(
        "--workshop-config",
        default=None,
        help="ワークショップ時刻の手動上書きJSON。未指定または存在しない場合は無視する",
    )
    parser.add_argument(
        "--invitedpapers-config",
        default=None,
        help="招待論文セッションの手動補完JSON。未指定または存在しない場合は無視する",
    )
    parser.add_argument(
        "--youtube-config",
        default=None,
        help="セッションごとの YouTube URL を付与するJSON。未指定または存在しない場合は無視する",
    )
    args = parser.parse_args()

    html_path = Path(args.html)
    if not html_path.exists():
        print(f"ERROR: {html_path} が見つかりません", file=sys.stderr)
        sys.exit(1)

    print(f"読み込み中: {html_path} ({html_path.stat().st_size // 1024} KB)")
    html_text = html_path.read_text(encoding="utf-8")
    p = ProgramParser()
    p.feed(html_text)

    sp = ScheduleTableParser()
    sp.feed(html_text)
    workshop_config_path = Path(args.workshop_config) if args.workshop_config else None
    workshop_config = load_workshop_config(workshop_config_path)
    invitedpapers_config_path = Path(args.invitedpapers_config) if args.invitedpapers_config else None
    invitedpapers_config = load_invitedpapers_config(invitedpapers_config_path)
    youtube_config_path = Path(args.youtube_config) if args.youtube_config else None
    youtube_config = load_youtube_config(youtube_config_path)

    print("正規化中...")
    if args.base_url:
        fix_urls(p.raw_presentations, args.base_url)
    result = normalize(p.raw_sessions, p.raw_presentations, p.raw_persons)
    result["generated_at"] = datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    source_update_times = SourceUpdateTimeExtractor(html_text).extract_all()
    last_update: dict[str, dict[str, str | None]] = {}

    def add_last_update_entry(key: str, path: Path, time_override: str | None = None) -> None:
        if not path.exists():
            return
        last_update[key] = {
            "sha256": compute_sha256(path),
            "time": time_override or to_jst_file_time(path),
        }

    add_last_update_entry("program_main", html_path, source_update_times.get("program_main"))
    if workshop_config_path is not None:
        add_last_update_entry("workshop", workshop_config_path)
    if invitedpapers_config_path is not None:
        add_last_update_entry("invitedpapers", invitedpapers_config_path)
    if youtube_config_path is not None:
        add_last_update_entry("youtube", youtube_config_path)

    if last_update:
        result["last_update"] = last_update

    # スケジュール表にのみ存在する特殊イベントをセッションとして追加
    for ev in sp.special_events:
        sid = _special_event_id(ev["title"])
        if sid.startswith("WS"):
            continue
        room_ids: list[str] = []
        for room_name in ev["rooms"]:
            room_id = next((rid for rid, room in result["rooms"].items() if room["name"] == room_name), None)
            if room_id is None:
                room_id = f"r{len(result['rooms']) + 1:04d}"
                result["rooms"][room_id] = {"name": room_name}
            room_ids.append(room_id)
        entry: JsonDict = {
            "title": ev["title"],
            "date": ev["date"],
            "start_time": ev["start_time"],
            "end_time": ev["end_time"],
            "room_ids": room_ids,
            "chair": "",
            "presentation_ids": [],
        }
        if ev["url"]:
            entry["url"] = ev["url"]
        elif ev["title"] in _SPECIAL_EVENT_URLS:
            entry["url"] = _SPECIAL_EVENT_URLS[ev["title"]]
        result["sessions"][sid] = entry

    apply_workshop_overrides(result, workshop_config)
    apply_invitedpapers_config(result, invitedpapers_config)
    apply_youtube_config(result, youtube_config)

    pres = result["presentations"]
    oral_count = sum(1 for p in pres.values() if p.get("oral_session_id"))
    online_count = sum(1 for p in pres.values() if p.get("is_online"))
    english_count = sum(1 for p in pres.values() if p.get("is_english"))

    validated_result = DataJsonRecord.model_validate(result).model_dump(exclude_none=False)
    for session in validated_result["sessions"].values():
        if session.get("url") is None:
            session.pop("url", None)
        if session.get("youtube_url") is None:
            session.pop("youtube_url", None)
    for presentation in validated_result["presentations"].values():
        if presentation.get("oral_session_id") is None:
            presentation.pop("oral_session_id", None)

    out_path = Path(args.out)
    out_path.write_text(json.dumps(validated_result, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"\n✅ 完了: {out_path}")
    print(f"   セッション数        : {len(result['sessions'])}")
    print(f"   発表数              : {len(result['presentations'])}")
    print(f"   著者数 (persons)    : {len(result['persons'])}")
    print(f"   所属数 (affiliations): {len(result['affiliations'])}")
    print(f"   口頭発表あり        : {oral_count}")
    print(f"   オンライン発表      : {online_count}")
    print(f"   英語発表            : {english_count}")


if __name__ == "__main__":
    main()
