# -*- coding: utf-8 -*-
"""Génère Veille_Technologique_2.pdf (~5 pages A4, texte uniquement, sans images)."""
from pathlib import Path

from fpdf import FPDF
from fpdf.enums import XPos, YPos


def clean(text: str) -> str:
    """Normalise la typo pour un rendu PDF stable (pas de glyphes problématiques)."""
    if not text:
        return text
    replacements = {
        "\u2192": " -> ",
        "\u2013": "-",
        "\u2014": "-",
        "\u00ab": '"',
        "\u00bb": '"',
        "\u2026": "...",
        "bêta": "beta",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text

OUT = Path(__file__).resolve().parent / "Veille_Technologique_2.pdf"
FONT = "ArialUni"
FONT_DIR = Path(r"C:\Windows\Fonts")


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
        """Paragraphe pleine largeur ; replace toujours x à la marge gauche."""
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
            f"Veille technologique n°2 – Grinda Korto – Page {self.page_no()}/{{nb}}",
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

    # —— Page 1 ——
    pdf.add_page()
    pdf.para("Veille technologique n°2", h=10, style="B", size=20, color=(15, 23, 42))
    pdf.para(
        "L'intelligence artificielle dans la génération",
        h=8,
        style="B",
        size=15,
        color=(15, 118, 110),
    )
    pdf.ln(4)
    meta = [
        "Étudiant : Grinda Korto",
        "Formation : BTS Services Informatiques aux Organisations – Option SLAM",
        "Établissement : EPSI Montpellier – Session 2026",
        "Période de veille : décembre 2024 – mai 2026",
        "Fréquence : veille bi-hebdomadaire sur les sorties de modèles génératifs",
    ]
    for line in meta:
        pdf.para(line, h=6, size=11, color=(51, 65, 85))
    pdf.ln(6)

    pdf.section_title("Objet et problématique de la veille")
    pdf.body(
        "L'intelligence artificielle générative a évolué bien au-delà du simple chat textuel : "
        "en 2025-2026, un même écosystème produit du code, des images photoréalistes, des vidéos "
        "avec son natif et de la synthèse vocale. Cette veille répond à la question suivante : "
        "comment ces outils transforment-ils la création numérique (design, prototypage, marketing, "
        "développement), quelles limites techniques persistent, et quelles bonnes pratiques adopter "
        "en contexte scolaire et professionnel ?"
    )

    pdf.section_title("Outils et méthodologie")
    pdf.body(
        "La veille s'appuie sur des sources primaires (blogs OpenAI, Google DeepMind, documentation "
        "Gemini API), des médias spécialisés (VentureBeat, Gizmodo), des plateformes de benchmark "
        "(LMArena) et des catalogues de modèles (Hugging Face). Chaque actualité est datée, "
        "recoupée et classée du plus récent au plus ancien. Une analyse critique est ajoutée "
        "pour relier chaque évolution aux compétences visées en BTS SIO SLAM."
    )
    pdf.body("Outils utilisés : Hugging Face, blogs OpenAI / Google DeepMind, VentureBeat, LMArena, Product Hunt, arXiv (cs.CV).")

    pdf.section_title("Résumé exécutif")
    pdf.body(
        "L'IA générative est devenue multimodale et industrielle : en moins de six mois, OpenAI enchaîne "
        "GPT-Image-1.5 (décembre 2025) puis ChatGPT Images 2.0 (avril 2026), tandis que Google déploie "
        "Veo 3.1 pour la vidéo avec son natif et l'extension de scènes via l'API Gemini. La course "
        "OpenAI / Google impose des cycles de mise à jour très courts ; LMArena sert d'antenne pour "
        "détecter les modèles avant annonce officielle."
    )
    pdf.body(
        "Les progrès les plus visibles concernent le texte dans l'image (infographies, manga, 4K) et la "
        "vidéo courte professionnelle (storyboards, teasers). Les limites restent réelles : hallucinations, "
        "coûts API, droits d'auteur et risque de désinformation. En BTS SIO, l'IA générative est un "
        "accélérateur de prototypage et de documentation, jamais un substitut à la validation technique "
        "et à la responsabilité du développeur."
    )

    # —— Page 2 ——
    pdf.add_page()
    pdf.section_title("Actualités relevées (1/2)")
    pdf.body("Actualités classées du plus récent au plus ancien, avec analyse et sources.")

    pdf.news_block(
        "21 avril 2026",
        "OpenAI déploie ChatGPT Images 2.0 (modèle gpt-image-2)",
        "OpenAI annonce ChatGPT Images 2.0, successeur de GPT-Image-1.5. Le modèle améliore le rendu "
        "du texte multilingue dans les visuels, les infographies, les planches manga et les grilles d'images, "
        "avec résolutions jusqu'à 4K en bêta API et ratios extrêmes (3:1 à 1:3). Deux modes : Instant "
        "(rapide, tous les utilisateurs) et Thinking (recherche web, vérification, jusqu'à 8 images cohérentes, offres payantes).",
        "Le texte lisible dans l'image était le principal verrou des générateurs ; sa résolution ouvre la voie "
        "à des visuels marketing et pédagogiques exploitables sans retouche massive. En SLAM, cela change "
        "la production de maquettes et de documentation illustrée.",
        "VentureBeat ; OpenAI Blog",
    )

    pdf.news_block(
        "5 avril 2026",
        "Fuite puis confirmation : GPT-Image-2 testé sur LMArena",
        "Avant l'annonce officielle, un modèle non publié apparaît sur LMArena sous des noms de code. "
        "Les testeurs soulignent une intégration naturelle du texte (notes manuscrites, bulles de BD) "
        "et une concurrence directe avec Nano Banana Pro (Google).",
        "LMArena est devenu un indicateur avancé des sorties majeures — utile en veille pour anticiper "
        "les changements avant la documentation API.",
        "Frontierbeat",
    )

    pdf.news_block(
        "2 avril 2026",
        "Veo 3.1 Lite en préversion — vidéo plus accessible",
        "Google annonce Veo 3.1 Lite en preview (Gemini Enterprise), visant des générations plus légères "
        "tout en conservant texte vers video et image vers video - signal d'une segmentation prix/performance "
        "comme pour les LLM.",
        source="Google Cloud – Documentation Veo 3.1",
    )

    # —— Page 3 ——
    pdf.add_page()
    pdf.section_title("Actualités relevées (2/2)")

    pdf.news_block(
        "Février 2026",
        "Course à l'échelle : ChatGPT au-delà de 900 millions d'utilisateurs",
        "OpenAI communique sur une base utilisateur massive ; les nouveautés image servent aussi "
        "à la rétention et à la monétisation. Google répond avec Gemini 3 et Nano Banana Pro fin 2025, "
        "déclenchant une accélération interne des sorties chez OpenAI.",
        "La guerre des modèles profite aux utilisateurs (qualité) mais augmente la fragmentation : "
        "choisir un stack (OpenAI vs Google vs open source) devient un choix d'architecture.",
        "Gizmodo",
    )

    pdf.news_block(
        "Décembre 2025",
        "GPT-Image-1.5 : palier intermédiaire avant Images 2.0",
        "OpenAI publie GPT-Image-1.5 avec meilleur suivi d'instructions, éclairage et couleurs — "
        "étape visible sur la courbe d'amélioration rapide entre fin 2025 et printemps 2026.",
        "La cadence semestrielle des modèles image impose une veille continue : un workflow figé "
        "sur une version devient obsolète en quelques mois.",
        "VentureBeat",
    )

    pdf.news_block(
        "17 novembre 2025",
        "Google généralise Veo 3.1 (vidéo + audio natif) via l'API Gemini",
        "Veo 3.1 et Veo 3.1 Fast passent en disponibilité générale sur Gemini API, Vertex AI et "
        "Google AI Studio. Nouveautés : audio synchronisé, extension de scène (clips enchaînés), "
        "transitions entre images de début et de fin, cohérence des personnages, résolutions 720p / 1080p / 4K.",
        "La vidéo IA devient un outil de storyboard et de prévisualisation. Coût et quotas API "
        "restent des freins pour la production à grande échelle.",
        "Google Developers Blog ; Google DeepMind – Veo",
    )

    pdf.section_title("Panorama des modalités")
    modalities = [
        "Texte / code : assistants, agents autonomes, génération de tests et documentation.",
        "Image : mockups UI, assets marketing, variation de style, inpainting.",
        "Vidéo : teasers, storyboards animés, extension de plans (Veo 3.1).",
        "Audio : voix off, doublage, effets (souvent couplé à la vidéo).",
        "Multimodal : chaines prompt -> image -> video -> post-production.",
    ]
    for m in modalities:
        pdf.bullet(m)

    # —— Page 4 ——
    pdf.add_page()
    pdf.section_title("Limites, risques et cadre réglementaire")
    limits = [
        "Hallucinations factuelles (texte, données dans les visuels).",
        "Biais culturels et stéréotypes dans les représentations.",
        "Coût GPU, tokens et crédits vidéo (budget projet).",
        "Droits : copyright des sorties et des données d'entraînement.",
        "Désinformation : deepfakes, contenus trompeurs (EU AI Act).",
        "Dépendance fournisseur : changement de tarifs, dépréciation d'API.",
    ]
    for item in limits:
        pdf.bullet(item)

    pdf.ln(2)
    pdf.body(
        "Le règlement européen sur l'IA (AI Act) impose une montée en transparence pour certains "
        "systèmes à risque. En veille, il est essentiel de croiser les annonces marketing avec "
        "les fiches techniques (latence, quotas, conditions d'usage) et les politiques de confidentialité."
    )

    pdf.section_title("Application en BTS SIO (option SLAM)")
    apps = [
        "Prototypage : maquettes Figma assistées, visuels temporaires pour valider l'UX avant production.",
        "Documentation : schémas, infographies et captures explicatives (Images 2.0).",
        "Développement : Copilot / Cursor pour boilerplate, toujours avec relecture, tests et revue de sécurité.",
        "Portfolio : distinguer clairement créations IA et travail manuel (transparence jury).",
        "API : intégrer Hugging Face ou Gemini API en projet — comprendre quotas, clés, RGPD.",
        "Veille continue : suivre LMArena et les release notes pour ne pas figer les compétences sur un seul modèle.",
    ]
    for a in apps:
        pdf.bullet(a)

    pdf.section_title("Comparaison des écosystèmes (synthèse)")
    pdf.body(
        "OpenAI mise sur l'intégration grand public (ChatGPT) et des cycles rapides sur l'image. "
        "Google capitalise sur la vidéo (Veo) et l'intégration cloud (Vertex AI, Gemini Enterprise). "
        "L'open source (Stable Diffusion, modèles Hugging Face) reste pertinent pour l'autonomie, "
        "l'hébergement on-premise et les projets avec contraintes de coût. Le développeur SLAM doit "
        "savoir comparer ces options selon le contexte : POC, production, budget, conformité."
    )

    # —— Page 5 ——
    pdf.add_page()
    pdf.section_title("Synthèse personnelle")
    pdf.body(
        "En 2026, l'IA generative n'est plus un simple generateur d'images : c'est une chaine de "
        "production multimodale accessible via API. La compétence d'un futur développeur SLAM n'est pas "
        "de tout générer automatiquement, mais d'orchestrer les bons modèles, vérifier les sorties, "
        "respecter les licences et garder la responsabilité métier (accessibilité, vérité des contenus, "
        "performance). La veille sur ce sujet est indispensable tant que les modèles changent plusieurs fois par an."
    )
    pdf.body(
        "Cette veille m'a permis de structurer une méthode : sources officielles en priorité, recoupement "
        "presse spécialisée, test sur LMArena quand disponible, et traduction systématique en impacts "
        "concrets pour mes projets (portfolio, E5, stages). Je retiens que la valeur ajoutée du développeur "
        "reste l'analyse, l'architecture logicielle et la validation — l'IA accélère l'exécution, pas le jugement."
    )

    pdf.section_title("Perspectives 2026-2027")
    pdf.body(
        "Tendances à suivre : agents multimodaux capables d'enchaîner recherche, génération et déploiement ; "
        "baisse des coûts vidéo ; standardisation des métadonnées de provenance (watermarking, C2PA) ; "
        "intégration native dans les IDE et les suites bureautiques. Je poursuivrai cette veille sur les "
        "release notes OpenAI et Google, ainsi que sur les évolutions réglementaires européennes."
    )

    pdf.section_title("Bibliographie et sources")
    sources = [
        "Hugging Face – Modèles : https://huggingface.co/models",
        "OpenAI Research : https://openai.com/research",
        "Google DeepMind Blog : https://deepmind.google/discover/blog/",
        "Gemini API – Vidéo (Veo) : https://ai.google.dev/gemini-api/docs/video",
        "VentureBeat – ChatGPT Images 2.0 (avril 2026)",
        "Google Developers Blog – Introducing Veo 3.1",
        "arXiv – Computer Vision : https://arxiv.org/list/cs.CV/recent",
        "EU AI Act – Portail : https://artificialintelligenceact.eu/",
    ]
    for s in sources:
        pdf.bullet(s)

    pdf.output(str(OUT))
    return OUT


if __name__ == "__main__":
    path = build()
    print(f"PDF généré : {path} ({path.stat().st_size // 1024} Ko)")
