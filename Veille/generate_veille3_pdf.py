# -*- coding: utf-8 -*-
"""Génère Veille_Technologique_3.pdf (~5 pages A4, texte uniquement)."""
from pathlib import Path

from fpdf import FPDF
from fpdf.enums import XPos, YPos

OUT = Path(__file__).resolve().parent / "Veille_Technologique_3.pdf"
FONT = "ArialUni"
FONT_DIR = Path(r"C:\Windows\Fonts")
VEILLE_NUM = 3


def clean(text: str) -> str:
    if not text:
        return text
    replacements = {
        "\u2192": " -> ",
        "\u2013": "-",
        "\u2014": "-",
        "\u00ab": '"',
        "\u00bb": '"',
        "\u2026": "...",
        "\u00a0": " ",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text


def setup_fonts(pdf: FPDF):
    pdf.add_font(FONT, "", str(FONT_DIR / "arial.ttf"))
    pdf.add_font(FONT, "B", str(FONT_DIR / "arialbd.ttf"))
    pdf.add_font(FONT, "I", str(FONT_DIR / "ariali.ttf"))


class VeillePDF(FPDF):
    def w_full(self):
        return self.epw

    def para(
        self,
        text: str,
        h: float = 5.5,
        style: str = "",
        size: int = 11,
        color: tuple[int, int, int] = (30, 41, 59),
    ):
        self.set_x(self.l_margin)
        self.set_font(FONT, style, size)
        self.set_text_color(*color)
        self.multi_cell(
            self.w_full(),
            h,
            clean(text),
            new_x=XPos.LMARGIN,
            new_y=YPos.NEXT,
        )

    def footer(self):
        self.set_y(-15)
        self.set_x(self.l_margin)
        self.set_font(FONT, "I", 9)
        self.set_text_color(100, 100, 100)
        self.cell(
            self.w_full(),
            10,
            f"Veille technologique n°{VEILLE_NUM} – Grinda Korto – Page {self.page_no()}/{{nb}}",
            align="C",
            new_x=XPos.LMARGIN,
            new_y=YPos.NEXT,
        )

    def section_title(self, title: str):
        self.ln(4)
        self.para(title, h=7, style="B", size=13, color=(15, 23, 42))
        self.ln(2)

    def body(self, text: str):
        self.para(text)
        self.ln(2)

    def bullet(self, text: str):
        self.set_x(self.l_margin + 4)
        self.set_font(FONT, "", 11)
        self.set_text_color(30, 41, 59)
        self.multi_cell(
            self.w_full() - 4,
            5.5,
            "- " + clean(text),
            new_x=XPos.LMARGIN,
            new_y=YPos.NEXT,
        )

    def news_block(self, date: str, title: str, body: str, analysis: str = "", source: str = ""):
        self.para(date, h=6, style="B", size=10, color=(15, 118, 110))
        self.para(title, h=5.5, style="B", size=11, color=(15, 23, 42))
        self.para(body, h=5.2, size=10)
        if analysis:
            self.para("Analyse : " + analysis, h=5.2, style="I", size=10)
        if source:
            self.para("Source : " + source, h=4.8, size=9, color=(71, 85, 105))
        self.ln(3)


def build():
    pdf = VeillePDF()
    setup_fonts(pdf)
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.set_margins(20, 20, 20)

    # Page 1
    pdf.add_page()
    pdf.para("Veille technologique n°3", h=10, style="B", size=20, color=(15, 23, 42))
    pdf.para(
        "L'IA remplace-t-elle les métiers ?",
        h=8,
        style="B",
        size=15,
        color=(15, 118, 110),
    )
    pdf.ln(4)
    for line in [
        "Étudiant : Grinda Korto",
        "Formation : BTS Services Informatiques aux Organisations - Option SLAM",
        "Établissement : EPSI Montpellier - Session 2026",
        "Période de veille : janvier 2025 - mai 2026",
        "Angle : métiers du numérique et parcours BTS SIO SLAM",
    ]:
        pdf.para(line, h=6, size=11, color=(51, 65, 85))
    pdf.ln(6)

    pdf.section_title("Objet et problématique de la veille")
    pdf.body(
        "La question « L'IA va-t-elle remplacer les développeurs ? » revient dans chaque promotion BTS SIO "
        "depuis l'essor de Copilot, ChatGPT et Cursor. Les études convergent vers une réponse nuancée : "
        "l'IA automatise des tâches (code boilerplate, tests simples, documentation), mais ne supprime pas "
        "le besoin de cadrage métier, d'architecture, de sécurité et de responsabilité juridique des systèmes."
    )
    pdf.body(
        "Cette veille croise des sources internationales (Forum économique mondial, OCDE, OIT) et françaises "
        "(Indeed Hiring Lab, conjoncture 2026) pour comprendre ce qui change réellement sur le marché du travail, "
        "en particulier pour les profils web, mobile et data."
    )

    pdf.section_title("Outils et méthodologie")
    pdf.body(
        "Sources suivies : rapports WEF Future of Jobs 2025, publications OCDE et OIT, baromètres Indeed Hiring Lab "
        "France, presse économique et sites institutionnels (France Travail, ministère de l'Économie). "
        "Chaque information est datée et analysée sous l'angle du référentiel SLAM."
    )
    pdf.body("Outils : WEF, OCDE, Indeed Hiring Lab, France Travail, presse éco.")

    pdf.section_title("Résumé exécutif")
    pdf.body(
        "La question « L'IA remplace-t-elle les développeurs ? » appelle une réponse nuancée : les études "
        "internationales (WEF, janvier 2025) prévoient une transformation massive des emplois (+78 millions nets "
        "d'ici 2030), pas une suppression totale des métiers du numérique. L'IA automatise surtout des tâches "
        "répétitives (boilerplate, documentation initiale) tout en créant de la demande sur l'IA, la data et la cybersécurité."
    )
    pdf.body(
        "En France (Indeed, avril 2026), l'IA apparaît déjà dans environ 21 % des offres en développement "
        "informatique. Le métier évolue vers le développeur augmenté : copilotes (Cursor, Copilot) et revue humaine "
        "obligatoire sur la sécurité et le métier. Pour un étudiant BTS SIO SLAM, l'enjeu est de maîtriser l'IA "
        "sans déléguer sa responsabilité technique."
    )

    # Page 2
    pdf.add_page()
    pdf.section_title("Actualités et études relevées (1/2)")
    pdf.body("Classées du plus récent au plus ancien, avec analyse et sources.")

    pdf.news_block(
        "1er avril 2026",
        "Indeed Hiring Lab : l'IA progresse dans un marché français fragilisé",
        "Le baromètre Indeed Hiring Lab France (avril 2026) note un contexte économique incertain "
        "(croissance 2026 revue à environ 0,8 % par l'OCDE). Les offres mentionnant l'IA progressent, "
        "mais la France reste en dessous du Royaume-Uni (7,5 % des annonces) et des États-Unis (4,9 %), "
        "avec environ 3,4 % des offres françaises citant l'IA en février 2026. "
        "Dans le développement informatique, environ 21 % des annonces mentionnent déjà l'IA "
        "(contre environ 15 % en admin systèmes/réseaux) : le métier de développeur est en première ligne d'adoption.",
        "Savoir utiliser l'IA devient un critère explicite dans les offres, pas seulement un plus.",
        "Indeed Hiring Lab France - Avril 2026",
    )

    pdf.news_block(
        "2026",
        "Copilotes de code : Cursor, GitHub Copilot, agents",
        "En entreprise et en formation, l'usage d'assistants de code se généralise : complétion, "
        "génération de tests, refactoring, documentation. Les équipes qui performent imposent une revue humaine "
        "systématique (sécurité OWASP, tests, conformité RGPD) plutôt que d'interdire ou d'accepter aveuglément "
        "les sorties du modèle.",
        "Le métier développeur se rapproche de l'ingénieur qui pilote des agents - compétence alignée "
        "avec le référentiel SLAM (analyse, conception, tests, déploiement).",
    )

    # Page 3
    pdf.add_page()
    pdf.section_title("Actualités et études relevées (2/2)")

    pdf.news_block(
        "8 janvier 2025",
        "WEF Future of Jobs 2025 : +78 millions d'emplois nets d'ici 2030",
        "Le Future of Jobs Report 2025 du Forum économique mondial (plus de 1 000 entreprises interrogées) "
        "projette 170 millions de postes créés et 92 millions détruits d'ici 2030, soit un solde net de +78 millions. "
        "L'IA et le traitement de l'information sont la tendance technologique la plus structurante : "
        "86 % des employeurs estiment qu'elle transformera leur activité d'ici 2030. "
        "Côté compétences : IA et big data, cybersécurité et littératie technologique dominent les besoins montants ; "
        "les compétences humaines (créativité, résilience, apprentissage continu) restent critiques.",
        "Le rapport insiste sur la transformation plutôt que la suppression pure : 77 % des employeurs prévoient "
        "de former leurs équipes ; 41 % envisagent aussi des réductions d'effectifs sur des tâches automatisables.",
        "WEF - Communiqué janvier 2025 ; Rapport complet Future of Jobs 2025",
    )

    pdf.news_block(
        "Janvier 2025",
        "Métiers qui explosent vs métiers en déclin",
        "Parmi les rôles à la plus forte croissance d'ici 2030 : spécialistes IA et ML, big data, "
        "ingénieurs FinTech, développeurs logiciels. En déclin : caissiers, employés administratifs, saisie de données. "
        "L'IA « information processing » créerait environ 11 millions d'emplois tout en en déplaçant environ 9 millions.",
        source="WEF - Chapitre 2 Jobs outlook",
    )

    pdf.news_block(
        "2025",
        "OCDE / OIT : nuancer le remplacement total",
        "L'OCDE et l'OIT rappellent que l'exposition d'un métier à l'IA ne signifie pas sa disparition : "
        "une partie des tâches peut être augmentée (copilote) plutôt que supprimée.",
        "Un développeur web/mobile est exposé car une grande part de ses tâches est textuelle et structurable, "
        "mais son rôle évolue vers l'intégration, la revue de code IA et l'architecture.",
        "OCDE - Intelligence artificielle ; OIT - Future of Work",
    )

    pdf.news_block(
        "2025 - France",
        "Adoption encore inégale des collaborateurs",
        "Selon plusieurs synthèses publiques (France Stratégie, enquêtes sectorielles), une part significative "
        "des salariés français n'utilise pas encore l'IA au quotidien au travail, ce qui laisse une fenêtre "
        "de montée en compétence pour les jeunes diplômés formés explicitement.",
        "Être à l'aise avec l'IA en sortie de BTS SIO est un différenciateur sur le marché de l'alternance "
        "et du premier emploi.",
    )

    # Page 4
    pdf.add_page()
    pdf.section_title("Ce que l'IA remplace (partiellement)")
    for item in [
        "Boilerplate CRUD, scripts répétitifs, conversion de formats.",
        "Premiers jets de documentation et commentaires.",
        "Recherche d'erreurs simples, suggestions de correctifs.",
        "Traduction technique, résumés de logs.",
        "Maquettes et visuels de présentation standardisés.",
    ]:
        pdf.bullet(item)

    pdf.section_title("Ce que l'humain conserve")
    for item in [
        "Cadrage besoin client, choix d'architecture, arbitrages métier.",
        "Sécurité, conformité, gestion des données personnelles.",
        "Tests d'acceptation, recette, mise en production critique.",
        "Communication équipe / client, gestion de projet agile.",
        "Responsabilité légale en cas d'incident ou de biais.",
    ]:
        pdf.bullet(item)

    pdf.section_title("Positionnement personnel (BTS SIO SLAM)")
    pdf.body(
        "Mon parcours (stages Prends Ma Photo, 3Dmap/Odoo, projets web et mobile) montre que l'IA est utile "
        "comme accélérateur, jamais comme substitut à la compréhension du système. J'utilise des outils type "
        "Cursor pour explorer des solutions, mais je valide chaque livrable (SQL, ERP, API REST, interfaces)."
    )
    pdf.para("Compétences développées en priorité face à l'IA :", h=5.5, style="B", size=11)
    for item in [
        "Architecture logicielle et modélisation (MCD, UML, API).",
        "Sécurité et qualité (tests, revue, bonnes pratiques OWASP).",
        "Esprit critique sur les sorties générées (hallucinations, failles).",
        "Veille continue pour rester à jour sur des modèles qui changent tous les trimestres.",
    ]:
        pdf.bullet(item)

    # Page 5
    pdf.add_page()
    pdf.section_title("Synthèse personnelle")
    pdf.body(
        "L'IA ne remplace pas le métier de développeur en 2026 : elle remplace des tâches et élève le niveau "
        "d'entrée attendu. Les chiffres du WEF parlent de millions d'emplois créés dans la tech ; le marché "
        "français demande déjà l'IA dans un cinquième des offres dev. La menace réelle est pour les profils "
        "qui refusent de s'adapter, pas pour ceux qui combinent technique solide et usage maîtrisé des copilotes."
    )
    pdf.body(
        "Cette veille confirme mon choix de parcours SLAM : l'automatisation pousse vers plus de responsabilité "
        "sur l'architecture, la sécurité et la qualité. Mon objectif est de me positionner comme développeur "
        "augmenté, capable d'exploiter l'IA tout en garantissant des livrables fiables pour l'entreprise et le client."
    )

    pdf.section_title("Bibliographie et sources")
    for s in [
        "WEF - Future of Jobs Report 2025 : https://www.weforum.org/publications/the-future-of-jobs-report-2025/",
        "Indeed Hiring Lab France : https://www.hiringlab.org/fr/",
        "OCDE - Intelligence artificielle : https://www.oecd.org/en/topics/sub-issues/artificial-intelligence.html",
        "OIT - Avenir du travail : https://www.ilo.org/global/topics/future-of-work/",
        "France Travail - ROME / offres : https://www.francetravail.fr/",
        "Ministère de l'Économie - IA : https://www.economie.gouv.fr/intelligence-artificielle",
    ]:
        pdf.bullet(s)

    pdf.output(str(OUT))
    return OUT


if __name__ == "__main__":
    path = build()
    print(f"PDF généré : {path} ({path.stat().st_size // 1024} Ko)")
