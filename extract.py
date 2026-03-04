#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""
NLP2026 プログラムHTML から正規化JSONを抽出するスクリプト。
標準ライブラリのみ使用。

Usage:
    uv run extract.py --html <HTML> --out <JSON>
"""

import argparse
import json
import re
import sys
import unicodedata
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin


# ─── ユーティリティ ────────────────────────────────────────────

def clean(text: str) -> str:
    text = text.replace("\u00a0", " ").replace("\u3000", " ")
    return re.sub(r"\s+", " ", text).strip()


def normalize_room_name(name: str) -> str:
    name = clean(name)
    if name in {"3F 中ホール", "ライトキューブ宇都宮 3F"}:
        return "3F"
    if name == "2F 大会議室201・202":
        return "2F"
    return name


def normalize_session_title_key(title: str) -> str:
    return clean(unicodedata.normalize("NFKC", title))


_SESSION_ID_OVERRIDES: dict[str, str] = {
    normalize_session_title_key("テーマセッション3：法ドメインにおける言語処理（ポスター）"): "TS3-q",
    normalize_session_title_key("TS3:テーマセッション3：法ドメインにおける言語処理（ポスター）"): "TS3-q",
    normalize_session_title_key("テーマセッション3：法ドメインにおける言語処理（総合討論）"): "TS3-a",
    normalize_session_title_key("TS3:テーマセッション3：法ドメインにおける言語処理（総合討論）"): "TS3-a",
}


def parse_authors(raw: str) -> tuple[list[dict], str | None, bool]:
    """
    著者文字列をパースし (authors, presenter_name, is_english) を返す。
      authors = [{"name": str, "affiliation": str | None}, ...]
      is_english: ◊ マークがあれば True
    括弧外のカンマで分割する。
    """
    raw = clean(raw)
    presenter_name: str | None = None
    is_english = False
    authors: list[dict] = []

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


def parse_speakers(raw: str) -> tuple[list[dict], str | None]:
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

    authors: list[dict] = []
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
                        suffix = raw[cursor + 1:suffix_end]
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

    return [
        normalize_room_name(part)
        for part in re.split(r"\s*[、，,／/]\s*", raw)
        if part
    ]


def parse_header_text(text: str) -> dict:
    result: dict = {}

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

        self.raw_sessions: list[dict] = []
        self.raw_presentations: list[dict] = []  # ORAL エントリを含む
        self.raw_persons: list[dict] = []

        # セクション状態
        self._in_session_list = False
        self._in_author_list = False

        # セッション
        self._cur_session: dict | None = None
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
        self._row_is_oral: bool = False           # span id が ORAL 末尾
        self._row_oral_session_ref: str | None = None  # (A1) リンク先
        self._row_is_online: bool = False         # 💻 マーク

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

    def handle_starttag(self, tag: str, attrs: list[tuple]) -> None:
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
            cls = a.get("class", "")
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
                href = a.get("href", "")
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
                self._cur_session.update(parse_header_text(text))
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
            if (self._cur_session is not None
                    and self._session_div_depth == self._global_div_depth):
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
        self.raw_presentations.append({
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
        })
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
                self.raw_presentations.append({
                    "id": self._cur_pid,
                    "title": self._cur_title,
                    "authors": authors,           # [{"name": ..., "affiliation": ...}]
                    "presenter_name": presenter_name,
                    "session_id": self._cur_session["id"],
                    "pdf_url": self._cur_pdf_url,
                    "is_oral": self._cur_is_oral,
                    "oral_session_ref": self._cur_oral_session_ref,
                    "is_online": self._cur_is_online,
                    "is_english": is_english,
                })
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

        self.raw_persons.append({
            "name": name,
            "paper_ids": paper_ids,
            "presenter_paper_ids": presenter_ids,
        })


# ─── 後処理・正規化 ───────────────────────────────────────────────

def fix_urls(raw_presentations: list[dict], base_url: str) -> None:
    """pdf_url が相対URLの場合、base_url を基準に絶対URLへ変換する。"""
    for entry in raw_presentations:
        if entry.get("pdf_url"):
            entry["pdf_url"] = urljoin(base_url, entry["pdf_url"])


def normalize(
    raw_sessions: list[dict],
    raw_presentations: list[dict],
    raw_persons: list[dict],
) -> dict:
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
    persons: dict[str, dict] = {}
    name_to_pid: dict[str, str] = {}

    for i, rp in enumerate(raw_persons):
        pid = f"p{i+1:04d}"
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
    affiliations: dict[str, dict] = {}
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
    rooms: dict[str, dict] = {}
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
            oral_session_for.setdefault(entry["id"], entry["oral_session_ref"])

    # ── 5. 発表エントリを正規化（ORAL重複は除去） ───────────────
    presentations: dict[str, dict] = {}

    for entry in raw_presentations:
        if entry["is_oral"]:
            continue  # ORAL エントリは session.presentation_ids への登録のみ

        pid = entry["id"]

        norm_authors = []
        for a in entry["authors"]:
            person_id = get_or_create_person(a["name"])
            aff_id = get_or_create_aff(a["affiliation"]) if a["affiliation"] else None
            norm_authors.append({"person_id": person_id, "affiliation_id": aff_id})

        presenter_id = (
            name_to_pid.get(entry["presenter_name"]) if entry["presenter_name"] else None
        )

        p: dict = {
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
    sessions: dict[str, dict] = {}

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

_WS_ZEN_DIGIT = {"１": 1, "２": 2, "３": 3, "４": 4}


def _special_event_id(title: str) -> str:
    if title in _SPECIAL_EVENT_IDS:
        return _SPECIAL_EVENT_IDS[title]
    m = re.search(r"ワークショップ([１２３４])", title)
    if m:
        return f"WS{_WS_ZEN_DIGIT[m.group(1)]}"
    return re.sub(r"[^\w]", "_", unicodedata.normalize("NFKC", title))[:16]


_TIME_RE = re.compile(r"^\d{1,2}:\d{2}$")


def load_workshop_config(path: Path | None) -> dict[str, dict]:
    """workshop.json を読み込む。存在しない場合は空辞書を返す。"""
    if path is None or not path.exists():
        return {}

    raw = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        raise ValueError("workshop.json のトップレベルは object である必要があります")

    config: dict[str, dict] = {}
    for sid, entry in raw.items():
        if not isinstance(sid, str) or not sid.startswith("WS"):
            raise ValueError(f"workshop.json のキーは WS1 のようなセッションIDにしてください: {sid!r}")
        if not isinstance(entry, dict):
            raise ValueError(f"workshop.json[{sid!r}] は object である必要があります")

        title = entry.get("title")
        date = entry.get("date")
        start_time = entry.get("start_time")
        end_time = entry.get("end_time")
        rooms = entry.get("rooms")
        if not isinstance(title, str) or not title:
            raise ValueError(f"workshop.json[{sid!r}].title は必須です")
        if not isinstance(date, str) or not date:
            raise ValueError(f"workshop.json[{sid!r}].date は必須です")
        if start_time is not None and not isinstance(start_time, str):
            raise ValueError(f"workshop.json[{sid!r}].start_time は文字列である必要があります")
        if end_time is not None and not isinstance(end_time, str):
            raise ValueError(f"workshop.json[{sid!r}].end_time は文字列である必要があります")
        if start_time is not None and not _TIME_RE.fullmatch(start_time):
            raise ValueError(f"workshop.json[{sid!r}].start_time は H:MM 形式で指定してください")
        if end_time is not None and not _TIME_RE.fullmatch(end_time):
            raise ValueError(f"workshop.json[{sid!r}].end_time は H:MM 形式で指定してください")
        if not isinstance(rooms, list) or not rooms or not all(isinstance(room, str) and room for room in rooms):
            raise ValueError(f"workshop.json[{sid!r}].rooms は会場名文字列の配列で必須です")

        sessions = entry.get("sessions")
        if sessions is not None:
            if not isinstance(sessions, list):
                raise ValueError(f"workshop.json[{sid!r}].sessions は配列である必要があります")
            for i, session in enumerate(sessions, start=1):
                if not isinstance(session, dict):
                    raise ValueError(f"workshop.json[{sid!r}].sessions[{i-1}] は object である必要があります")
                child_id = session.get("id")
                title = session.get("title")
                child_start = session.get("start_time")
                child_end = session.get("end_time")
                if not isinstance(child_id, str) or not child_id:
                    raise ValueError(f"workshop.json[{sid!r}].sessions[{i-1}].id は必須です")
                if not isinstance(title, str) or not title:
                    raise ValueError(f"workshop.json[{sid!r}].sessions[{i-1}].title は必須です")
                if not isinstance(child_start, str) or not _TIME_RE.fullmatch(child_start):
                    raise ValueError(
                        f"workshop.json[{sid!r}].sessions[{i-1}].start_time は H:MM 形式で必須です"
                    )
                if not isinstance(child_end, str) or not _TIME_RE.fullmatch(child_end):
                    raise ValueError(
                        f"workshop.json[{sid!r}].sessions[{i-1}].end_time は H:MM 形式で必須です"
                    )
                presentations = session.get("presentations")
                if presentations is not None:
                    if not isinstance(presentations, list):
                        raise ValueError(
                            f"workshop.json[{sid!r}].sessions[{i-1}].presentations は配列である必要があります"
                        )
                    for j, presentation in enumerate(presentations, start=1):
                        if not isinstance(presentation, dict):
                            raise ValueError(
                                f"workshop.json[{sid!r}].sessions[{i-1}].presentations[{j-1}] は object である必要があります"
                            )
                        pid = presentation.get("id")
                        ptitle = presentation.get("title")
                        authors = presentation.get("authors")
                        if not isinstance(pid, str) or not pid:
                            raise ValueError(
                                f"workshop.json[{sid!r}].sessions[{i-1}].presentations[{j-1}].id は必須です"
                            )
                        if not isinstance(ptitle, str) or not ptitle:
                            raise ValueError(
                                f"workshop.json[{sid!r}].sessions[{i-1}].presentations[{j-1}].title は必須です"
                            )
                        if authors is not None:
                            if not isinstance(authors, list):
                                raise ValueError(
                                    f"workshop.json[{sid!r}].sessions[{i-1}].presentations[{j-1}].authors は配列である必要があります"
                                )
                            for k, author in enumerate(authors, start=1):
                                if not isinstance(author, dict):
                                    raise ValueError(
                                        f"workshop.json[{sid!r}].sessions[{i-1}].presentations[{j-1}].authors[{k-1}] は object である必要があります"
                                    )
                                if not isinstance(author.get("name"), str) or not author["name"]:
                                    raise ValueError(
                                        f"workshop.json[{sid!r}].sessions[{i-1}].presentations[{j-1}].authors[{k-1}].name は必須です"
                                    )

        config[sid] = entry

    return config


def apply_workshop_overrides(result: dict, workshop_config: dict[str, dict]) -> None:
    """workshop.json の内容で WS セッションの時刻等を上書きし、個別セッションも追加する。"""
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
        room_ids = [get_or_create_room(normalize_room_name(name)) for name in override["rooms"]]
        session = {
            "title": override["title"],
            "date": override["date"],
            "start_time": override.get("start_time", ""),
            "end_time": override.get("end_time", ""),
            "room_ids": room_ids,
            "chair": override.get("chair", ""),
            "presentation_ids": [],
        }
        if override.get("url"):
            session["url"] = override["url"]
        result["sessions"][sid] = session

        child_prefix = f"{sid}-"
        stale_child_ids = [existing_sid for existing_sid in result["sessions"] if existing_sid.startswith(child_prefix)]
        for stale_sid in stale_child_ids:
            del result["sessions"][stale_sid]

        child_sessions = override.get("sessions", [])
        for child in child_sessions:
            child_sid = child["id"]
            child_room_ids = (
                [get_or_create_room(normalize_room_name(name)) for name in child.get("rooms", [])]
                if child.get("rooms")
                else session["room_ids"]
            )
            if child_sid in result["sessions"]:
                raise ValueError(f"workshop.json の個別セッションIDが重複しています: {child_sid}")

            child_presentations = child.get("presentations", [])
            presentation_ids: list[str] = []
            for presentation in child_presentations:
                pid = presentation["id"]
                if pid in result["presentations"]:
                    raise ValueError(f"workshop.json の発表IDが重複しています: {pid}")

                authors = presentation.get("authors", [])
                normalized_authors = []
                for author in authors:
                    person_id = get_or_create_person(author["name"])
                    affiliation_id = get_or_create_affiliation(author.get("affiliation"))
                    normalized_authors.append({
                        "person_id": person_id,
                        "affiliation_id": affiliation_id,
                    })

                presenter_name = presentation.get("presenter")
                if presenter_name is None and authors:
                    presenter_name = authors[0]["name"]
                presenter_id = get_or_create_person(presenter_name) if presenter_name else None

                result["presentations"][pid] = {
                    "title": presentation["title"],
                    "session_id": child_sid,
                    "presenter_id": presenter_id,
                    "is_english": presentation.get("is_english", False),
                    "is_online": presentation.get("is_online", False),
                    "authors": normalized_authors,
                    "pdf_url": presentation.get("pdf_url"),
                }
                presentation_ids.append(pid)

            entry = {
                "title": child["title"],
                "date": child.get("date", session["date"]),
                "start_time": child["start_time"],
                "end_time": child["end_time"],
                "room_ids": child_room_ids,
                "chair": child.get("chair", ""),
                "presentation_ids": presentation_ids,
            }
            if child.get("url"):
                entry["url"] = child["url"]
            elif session.get("url"):
                entry["url"] = session["url"]

            result["sessions"][child_sid] = entry


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
        self.special_events: list[dict] = []

    def handle_starttag(self, tag: str, attrs: list[tuple]) -> None:
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
            cls = a.get("class", "")
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
                href = a.get("href", "")
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
            self.special_events.append({
                "title": title,
                "date": self._current_date,
                "start_time": start_time,
                "end_time": end_time,
                "rooms": split_rooms(venue),
                "url": self._external_url,
            })


# ─── メイン ───────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="NLP2026 プログラムHTML→JSON 抽出スクリプト")
    parser.add_argument("--html", required=True, help="入力HTMLファイルパス")
    parser.add_argument("--out", required=True, help="出力JSONファイルパス")
    parser.add_argument("--base-url", default=None, help="PDF等の相対URLを解決する基底URL (例: https://www.anlp.jp/proceedings/)")
    parser.add_argument(
        "--workshop-config",
        default="workshop.json",
        help="ワークショップ時刻の手動上書きJSON。存在しない場合は無視する",
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

    print("正規化中...")
    if args.base_url:
        fix_urls(p.raw_presentations, args.base_url)
    result = normalize(p.raw_sessions, p.raw_presentations, p.raw_persons)

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
        entry: dict = {
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
        result["sessions"][sid] = entry

    apply_workshop_overrides(result, workshop_config)

    pres = result["presentations"]
    oral_count   = sum(1 for p in pres.values() if p.get("oral_session_id"))
    online_count = sum(1 for p in pres.values() if p.get("is_online"))
    english_count = sum(1 for p in pres.values() if p.get("is_english"))

    out_path = Path(args.out)
    out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

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
