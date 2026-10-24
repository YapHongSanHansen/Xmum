"""Fill the official SDC 2026 submission templates from answers.md.

Writes, into this folder:
  SDC2026_<Team>_Preliminary.pdf
  SDC2026_<Team>_TechDeclaration.pdf
  SDC2026_<Team>_Replit_POU.pdf
  SDC2026_<Team>_Runpod_POU.pdf

Usage:  python submission/build_pdfs.py [--team TeamName]
Needs:  pip install pymupdf

Box positions were read from the official templates in templates/ (PDF points,
origin top-left). Word limits are checked before anything is written.
"""

import argparse
import html
import re
import sys
from pathlib import Path

import fitz  # PyMuPDF

HERE = Path(__file__).resolve().parent
TEMPLATES = HERE / "templates"

WORD_LIMITS = {
    "prelim.problem": 250,
    "prelim.solution": 300,
    "prelim.design": 200,
    "tech.architecture": 200,
    "tech.aireview": 100,
    "tech.sponsor_essential": 100,
    "tech.privacy": 150,
    "tech.limitations": 150,
}

CSS = """
* { font-family: sans-serif; color: #222222; line-height: 1.25; }
p { margin: 0 0 5px 0; }
ul { margin: 0 0 5px 0; padding-left: 12px; }
li { margin: 0 0 2px 0; }
.todo { color: #d01010; font-weight: bold; }
"""

# Narrow table columns and single-line fields would be unreadable below this.
MIN_SCALE = 0.55


# ---------- answers.md ----------

def load_answers(path):
    text = path.read_text(encoding="utf-8")
    answers = {}
    for block in re.split(r"(?m)^### ", text)[1:]:
        key, _, body = block.partition("\n")
        # Section rules ("---") and "## " headings end a block.
        body = re.split(r"(?m)^(?:---\s*$|## )", body)[0]
        lines = [l for l in body.strip().splitlines() if not l.startswith("> ")]
        answers[key.strip()] = "\n".join(lines).strip()
    return answers


def word_count(text):
    plain = re.sub(r"[*`]", "", text)
    plain = re.sub(r"(?m)^- (\[[ x]\] )?", "", plain)
    return len(plain.split())


def check_limits(answers):
    errors = []
    for key, limit in WORD_LIMITS.items():
        n = word_count(answers[key])
        status = "OK " if n <= limit else "OVER"
        print(f"  {status} {key}: {n}/{limit} words")
        if n > limit:
            errors.append(key)
    if errors:
        sys.exit(f"Word limit exceeded: {', '.join(errors)}")


# ---------- markdown-lite to HTML ----------

def inline(text):
    out = html.escape(text, quote=False)
    out = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", out)
    out = re.sub(r"`(.+?)`", r"\1", out)
    out = re.sub(r"(TODO[^<]*)", r'<span class="todo">\1</span>', out)
    return out


def to_html(text, size):
    parts, bullets, para = [], [], []

    def flush():
        if para:
            parts.append("<p>" + "<br>".join(inline(l) for l in para) + "</p>")
            para.clear()
        if bullets:
            parts.append("<ul>" + "".join(f"<li>{inline(b)}</li>" for b in bullets) + "</ul>")
            bullets.clear()

    for line in text.splitlines():
        if not line.strip():
            flush()
        elif line.startswith("- "):
            if para:
                flush()
            bullets.append(line[2:])
        else:
            if bullets:
                flush()
            para.append(line)
    flush()
    return f'<div style="font-size:{size}pt">' + "".join(parts) + "</div>"


# ---------- drawing ----------

def put(page, rect, text, size=13, pad=6, label=""):
    r = fitz.Rect(rect)
    r = fitz.Rect(r.x0 + pad, r.y0 + pad, r.x1 - pad, r.y1 - pad)
    spare, scale = page.insert_htmlbox(r, to_html(text, size), css=CSS, scale_low=0)
    if spare < 0:
        sys.exit(f"Text does not fit even when scaled: {label}")
    if scale < MIN_SCALE:
        print(f"  WARN {label}: shrunk to {scale:.0%} to fit; consider shortening")


def put_line(page, baseline_y, text, x0=128, x1=500):
    put(page, (x0, baseline_y - 22, x1, baseline_y - 1), text, size=14, pad=2, label=text[:30])


def tick(page, box):
    r = fitz.Rect(box)
    w, h = r.width, r.height
    shape = page.new_shape()
    shape.draw_polyline([
        (r.x0 + 0.2 * w, r.y0 + 0.55 * h),
        (r.x0 + 0.42 * w, r.y0 + 0.8 * h),
        (r.x0 + 0.85 * w, r.y0 + 0.2 * h),
    ])
    shape.finish(color=(0.05, 0.35, 0.75), width=1.8, closePath=False)
    shape.commit()


def yes_no(page, value, yes_box, no_box, label):
    if value == "Yes":
        tick(page, yes_box)
    elif value == "No":
        tick(page, no_box)
    else:
        print(f"  TODO {label}: neither Yes nor No ticked")


def checklist(page, text, boxes, label):
    items = [l for l in text.splitlines() if l.startswith("- [")]
    assert len(items) == len(boxes), f"{label}: expected {len(boxes)} items, got {len(items)}"
    for item, box in zip(items, boxes):
        if item.startswith("- [x]"):
            tick(page, box)


def table(page, text, rows, cols, label, size=11):
    lines = [l for l in text.splitlines() if l.strip()]
    if len(lines) > len(rows):
        sys.exit(f"{label}: {len(lines)} rows, template has {len(rows)}")
    for line, (y0, y1) in zip(lines, rows):
        cells = [c.strip() for c in line.split(" | ")]
        assert len(cells) == len(cols), f"{label}: row needs {len(cols)} cells: {line}"
        for cell, (x0, x1) in zip(cells, cols):
            put(page, (x0, y0, x1, y1), cell, size=size, pad=3, label=f"{label}: {cell[:25]}")


COLS3 = [(51.2, 182.7), (185.9, 395.5), (399.5, 546.2)]
ROWS7 = [(290.1, 331.0), (335.6, 409.2), (414.8, 472.6), (476.7, 534.6),
         (538.7, 596.5), (600.6, 658.5), (662.6, 720.4)]


# ---------- the forms ----------

def preliminary(a, out):
    doc = fitz.open(TEMPLATES / "SDC2026_TeamName_Preliminary.pdf")
    p = doc[1]
    for y, key in [(243.6, "team_name"), (310.0, "prelim.domain"), (376.4, "prelim.sdg"),
                   (442.9, "project_name"), (509.3, "leader_name"), (575.7, "leader_contact"),
                   (642.1, "university"), (708.2, "members")]:
        put_line(p, y, a[key])
    put(doc[2], (84.7, 351.3, 535.9, 726.6), a["prelim.problem"], label="2.1")
    put(doc[3], (84.7, 388.5, 535.9, 738.8), a["prelim.solution"], label="2.2")
    put(doc[4], (84.7, 388.5, 535.9, 738.8), a["prelim.stack"], label="3.1")
    put(doc[5], (84.7, 304.6, 535.9, 654.9), a["prelim.design"], label="3.2")
    put(doc[7], (243.5, 230.7, 542.9, 452.3), a["prelim.sdg_target"], size=12, label="4 target")
    put(doc[7], (243.5, 457.6, 542.9, 679.2), a["prelim.sdg_baseline"], size=12, label="4 baseline")
    put(doc[8], (243.5, 230.7, 542.9, 421.5), a["prelim.sdg_kpi"], size=12, label="4 KPI")
    put(doc[8], (243.5, 427.9, 542.9, 600.2), a["prelim.sdg_target2"], size=12, label="4 Phase 2")
    checklist(doc[9], a["prelim.checklist"],
              [(69.6, y, 85.2, y + 15.6) for y in (224.2, 287.5, 351.2, 414.8)], "5")
    yes_no(doc[10], a["prelim.preexisting_yesno"], (85.8, 278.5, 98.8, 291.6), (143.9, 278.5, 156.9, 291.6), "6.1")
    put(doc[10], (84.7, 347.7, 535.9, 698.0), a["prelim.preexisting"], label="6.1")
    yes_no(doc[11], a["prelim.thirdparty_yesno"], (85.8, 278.5, 98.8, 291.6), (143.9, 278.5, 156.9, 291.6), "6.2")
    table(doc[11], a["prelim.thirdparty"],
          [(390.7, 431.6), (436.2, 509.8), (514.7, 555.6), (560.2, 633.8), (638.6, 679.5)], COLS3, "6.2")
    yes_no(doc[12], a["prelim.employment_yesno"], (85.8, 303.5, 98.8, 316.6), (143.9, 303.5, 156.9, 316.6), "6.3")
    put(doc[12], (84.7, 368.7, 535.9, 719.0), a["prelim.employment"], label="6.3")
    put_line(doc[13], 398, a["sign_date"], x0=118, x1=400)
    doc.save(out, garbage=3, deflate=True)


def tech_declaration(a, out):
    doc = fitz.open(TEMPLATES / "SDC2026_TeamName_TechDeclaration.pdf")
    p = doc[1]
    for y, key in [(251.6, "team_name"), (329.3, "project_name"), (406.9, "leader_name"),
                   (484.5, "leader_contact"), (562.1, "university"), (639.8, "live_url"),
                   (717.4, "repo_url")]:
        put_line(p, y, a[key])
    put(doc[2], (84.7, 371.6, 535.9, 746.9), a["tech.architecture"], label="2.1")
    table(doc[3], a["tech.libraries"],
          [(352.4, 393.2), (397.9, 471.5), (477.0, 534.9), (540.5, 598.3), (603.9, 661.8), (667.4, 725.2)],
          COLS3, "2.2")
    table(doc[4], a["tech.apis"], ROWS7, COLS3, "3.1")
    table(doc[5], a["tech.cloud"], ROWS7, COLS3, "3.2")
    table(doc[6], a["tech.models"],
          [(343.0, 377.4), (381.2, 443.3), (447.7, 496.4), (499.8, 548.5), (551.9, 600.5), (604.7, 653.4), (657.5, 706.2)],
          [(50.1, 153.9), (156.9, 260.8), (263.2, 428.7), (431.9, 547.7)], "4.1")
    table(doc[7], a["tech.datasets"],
          [(326.1, 360.5), (364.4, 426.2), (430.6, 479.4), (482.7, 531.5), (534.7, 583.5), (587.6, 636.4), (640.4, 689.2), (692.5, 741.3)],
          [(48.4, 134.2), (136.5, 222.3), (224.8, 347.4), (349.7, 449.4), (452.0, 547.7)], "4.2", size=10)
    yes_no(doc[8], a["tech.aitools_yesno"], (85.8, 373.2, 98.8, 386.3), (143.9, 373.2, 156.9, 386.3), "4.3")
    table(doc[8], a["tech.aitools"], [(458.5, 499.4), (504.0, 577.6), (583.2, 656.8), (662.3, 735.9)], COLS3, "4.3")
    put(doc[9], (84.7, 284.4, 535.9, 659.7), a["tech.aireview"], label="4.3 review")
    yes_no(doc[10], a["tech.sponsor_yesno"], (74.0, 314.8, 87.1, 327.9), (132.1, 314.8, 145.2, 327.9), "5")
    table(doc[10], a["tech.sponsor"], [(416.5, 457.4), (462.0, 535.6), (541.2, 614.8), (619.0, 692.5)], COLS3, "5")
    put(doc[11], (84.7, 299.1, 535.9, 674.4), a["tech.sponsor_essential"], label="5 essential")
    put(doc[12], (84.7, 343.6, 535.9, 719.0), a["tech.privacy"], label="6.1")
    put(doc[13], (84.7, 343.6, 535.9, 719.0), a["tech.limitations"], label="6.2")
    checklist(doc[14], a["tech.checklist"],
              [(69.6, y, 85.2, y + 15.6) for y in (224.2, 287.5, 372.6, 435.4, 498.2, 561.1, 624.0)], "7")
    put_line(doc[15], 424, a["sign_date"], x0=118, x1=400)
    doc.save(out, garbage=3, deflate=True)


def proof_of_use(a, title, key, out):
    doc = fitz.open()
    page = doc.new_page(width=595.5, height=842.25)
    header = (f"**{title}**\n\n"
              f"Team: {a['team_name']}\n"
              f"Project: {a['project_name']}\n"
              f"Repository: {a['repo_url']}")
    put(page, (60, 60, 535, 190), header, size=16, label=title)
    page.draw_line((60, 195), (535, 195), color=(0.6, 0.6, 0.6), width=0.8)
    put(page, (60, 205, 535, 640), a[key], size=14, label=title)
    footer = (f"Team leader: {a['leader_name']}\n\n"
              "Signature: ________________________\n\n"
              f"Date: {a['sign_date']}")
    put(page, (60, 660, 535, 790), footer, size=14, label=title)
    doc.save(out, garbage=3, deflate=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--team", default="TeamName",
                        help="team name for the file names (default: TeamName)")
    args = parser.parse_args()
    team = re.sub(r"[^A-Za-z0-9_-]", "", args.team) or "TeamName"

    answers = load_answers(HERE / "answers.md")
    print("Word limits:")
    check_limits(answers)

    print("Filling templates:")
    preliminary(answers, HERE / f"SDC2026_{team}_Preliminary.pdf")
    tech_declaration(answers, HERE / f"SDC2026_{team}_TechDeclaration.pdf")
    proof_of_use(answers, "REPLIT PROOF OF USE", "replit_pou", HERE / f"SDC2026_{team}_Replit_POU.pdf")
    proof_of_use(answers, "RUNPOD PROOF OF USE", "runpod_pou", HERE / f"SDC2026_{team}_Runpod_POU.pdf")

    todos = sorted(k for k, v in answers.items() if "TODO" in v)
    if todos:
        print(f"Still TODO ({len(todos)}): {', '.join(todos)}")
    print(f"Done: submission/SDC2026_{team}_*.pdf")


if __name__ == "__main__":
    main()
