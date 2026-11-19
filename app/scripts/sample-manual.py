"""Generate the bundled sample manual: a fictitious 120-page reducer manual for the demo PDF viewer.

Every name, figure and procedure in it is invented. Run with `python3 scripts/sample-manual.py`
(needs reportlab). The two passages the demo procedures cite are on pages 47 and 112, each on one line
so the viewer can highlight it.
"""
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

OUT = "public/manuals/reducer-r-200.pdf"
PAGES = 120
W, H = A4
M = 64

CHAPTERS = [
    (1, "Safety"), (9, "Description"), (21, "Installation"), (33, "Operation"), (41, "Maintenance intervals"),
    (45, "Cover and seals"), (61, "Lubrication"), (79, "Gearing"), (97, "Shafts"), (105, "Bearings"), (117, "Spare parts"),
]

# The passages the demo procedures cite. Keep them identical to src/lib/api/fixtures/procedures.ts.
CITED = {
    47: ("6.3 Removing the inspection cover", [
        "Isolate the drive and lock it out before you open the reducer. Let the housing cool below 40 °C.",
        "Remove the breather first, then the cover bolts in a crosswise order.",
    ], "Cover bolts M10, reference torque 45 N·m.", [
        "On reassembly fit a new gasket (part 200-117) and tighten the bolts in two passes.",
        "Record the torque and the gasket batch in the maintenance log.",
    ]),
    112: ("10.8 Fitting the output bearing", [
        "Clean the shaft seat and check it for scoring before you heat the bearing.",
        "Use an induction heater with a temperature probe; never an open flame.",
    ], "Mount 6312-2Z/C3 hot; do not exceed 120 °C.", [
        "Push the bearing fully home against the shoulder and hold it until it grips.",
        "Let it cool in place before you fit the circlip and the seal carrier.",
    ]),
}

FILLER = [
    "This page belongs to a fictitious sample manual made for the Araxos demo.",
    "Values, part numbers and instructions are invented and must not be used on real equipment.",
    "Follow the plant's own approved procedures and the manufacturer's real documentation.",
]


def chapter(page: int) -> str:
    name = CHAPTERS[0][1]
    for start, title in CHAPTERS:
        if page >= start:
            name = title
    return name


def frame(c: canvas.Canvas, page: int) -> None:
    c.setFont("Helvetica-Bold", 9)
    c.drawString(M, H - 40, "REDUCER R-200 · OPERATION AND MAINTENANCE MANUAL")
    c.setFont("Helvetica", 9)
    c.drawRightString(W - M, H - 40, chapter(page))
    c.line(M, H - 46, W - M, H - 46)
    c.line(M, 50, W - M, 50)
    c.drawString(M, 36, "Fictitious sample for the Araxos demo · not a real product")
    c.drawRightString(W - M, 36, f"p. {page}")


def lines(c: canvas.Canvas, y: float, text: list[str], size: int = 11) -> float:
    c.setFont("Helvetica", size)
    for t in text:
        c.drawString(M, y, t)
        y -= size * 1.7
    return y


def main() -> None:
    c = canvas.Canvas(OUT, pagesize=A4)
    c.setTitle("Reducer R-200 manual (fictitious sample)")
    c.setAuthor("Araxos demo")
    c.setSubject("Sample PDF for the Araxos demo; all content is invented.")
    for page in range(1, PAGES + 1):
        frame(c, page)
        y = H - 100
        if page == 1:
            c.setFont("Helvetica-Bold", 26)
            c.drawString(M, y - 80, "Reducer R-200")
            c.setFont("Helvetica", 14)
            c.drawString(M, y - 110, "Operation and maintenance manual · edition 3")
            lines(c, y - 170, FILLER)
        elif page in CITED:
            title, before, quote, after = CITED[page]
            c.setFont("Helvetica-Bold", 15)
            c.drawString(M, y, title)
            y = lines(c, y - 32, before)
            c.setFont("Helvetica-Bold", 12)
            c.drawString(M, y - 6, quote)
            y = lines(c, y - 36, after)
            lines(c, y - 24, FILLER, 9)
        else:
            start = next(s for s, t in reversed(CHAPTERS) if page >= s)
            c.setFont("Helvetica-Bold", 15)
            c.drawString(M, y, f"{CHAPTERS.index((start, chapter(page))) + 1}.{page - start + 1} {chapter(page)}")
            lines(c, y - 32, FILLER)
        c.showPage()
    c.save()


if __name__ == "__main__":
    main()
