"""Utilidades compartilhadas: leitura dos assets, textos, rótulos e formatação."""
import json
import os
import sys

import UnityPy

DEFAULT_GAME = r"C:\Program Files (x86)\Steam\steamapps\common\ShopTitan"
# todos os idiomas que o jogo traz; pt e en também têm interface traduzida no site
LANGS = ("pt", "en", "es", "fr", "de", "it", "ru", "uk", "tk", "ja", "ko", "zh", "zh_tr")
COMMA_DECIMAL = {"pt", "es", "fr", "de", "it", "ru", "uk", "tk"}


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def num(v):
    """Converte strings numéricas do jogo ('0.25', '10') em int/float; vazio -> 0."""
    if v is None or v == "":
        return 0
    try:
        f = float(v)
    except (TypeError, ValueError):
        return 0
    return int(f) if f.is_integer() else f


def split(v, sep=","):
    return [x.strip() for x in str(v).split(sep) if x.strip()] if v not in (None, "") else []


def fmt_num(f, lang="pt"):
    s = f"{f:.2f}".rstrip("0").rstrip(".")
    return s.replace(".", ",") if lang in COMMA_DECIMAL else s


def load_tables(game):
    """Todos os TextAssets JSON de resources.assets -> {nome: objeto}."""
    path = os.path.join(game, "ShopTitan_Data", "resources.assets")
    log("lendo", path)
    env = UnityPy.load(path)
    out = {}
    for o in env.objects:
        if o.type.name != "TextAsset":
            continue
        d = o.read()
        b = d.m_Script
        if isinstance(b, str):
            b = b.encode("utf-8", "surrogateescape")
        try:
            out[d.m_Name] = json.loads(b.decode("utf-8-sig"))
        except (ValueError, UnicodeDecodeError):
            pass  # não é JSON (ex.: listas de caracteres)
    return out


def game_version(game):
    """Versão do app (ex.: 26.11.0, gravada em globalgamemanagers) + build da Steam, se houver."""
    import re
    ver = None
    try:
        raw = open(os.path.join(game, "ShopTitan_Data", "globalgamemanagers"), "rb").read()
        found = re.findall(rb"(?<![\d.])(\d{1,2}\.\d{1,2}\.\d{1,3})(?![\d.f])", raw)
        found = [f.decode() for f in found if not f.startswith(b"0")]
        ver = found[0] if found else None
    except OSError:
        pass
    build = None
    # Steam (Windows): steamapps/common/ShopTitan/../../appmanifest; SteamCMD (+force_install_dir): <dir>/steamapps/appmanifest
    for manifest in (os.path.join(game, "..", "..", "appmanifest_1258080.acf"), os.path.join(game, "steamapps", "appmanifest_1258080.acf")):
        try:
            m = re.search(r'"buildid"\s+"(\d+)"', open(manifest, encoding="utf-8").read())
            build = m.group(1) if m else None
            break
        except OSError:
            continue
    if ver and build:
        return f"{ver} (build {build})"
    return ver or (f"build {build}" if build else None)


def table_rows(tables, name):
    """Tabelas do jogo vêm como {uid: {...}} ou {nome: [ ... ]}."""
    t = tables.get(name) or {}
    if len(t) == 1:
        only = next(iter(t.values()))
        if isinstance(only, list):
            return only
    return list(t.values())


class Texts:
    def __init__(self, tables, lang):
        self.lang = lang
        self.p = (tables.get(f"texts_{lang}") or {}).get("texts", {})
        self.f = (tables.get("texts_en") or {}).get("texts", {})

    def get(self, key, default=None):
        v = self.p.get(key) or self.f.get(key)
        return v if v else default

    def first(self, *keys, default=None):
        for k in keys:
            v = self.get(k)
            if v:
                return v
        return default


# Rótulos usados pelo extrator (o restante da interface é traduzido no site).
LBL = {
    "pt": {
        "cat.weapon": "Armas", "cat.armor": "Armaduras", "cat.accessory": "Acessórios",
        "cat.consumable": "Consumíveis", "cat.enchant": "Encantamentos", "cat.other": "Outros",
        "src.none": "Inicial / desbloqueado por projeto", "src.pack": "Pacote de projetos",
        "src.chest": "Baú", "src.special": "Especial / evento",
        "eff.bp": "Desbloqueia projeto: {0}", "eff.reward": "Recompensa: {0}x {1}",
        "eff.cquality": "Qualidade exigida do componente {0} -{1}",
        "eff.multi": "Chance de fabricação múltipla +{0}%", "eff.quality": "Chance de qualidade +{0}",
        "value": "Valor", "time": "Tempo de fabricação", "favor": "Graça", "surchargeOne": "Valor da sobretaxa",
        "surchargeOneEnergy": "Energia da sobretaxa", "baseStats": "Atributos base (ATQ/DEF/PV)",
        "airshippower": "Poder da Aeronave",
        "atk": "ATQ", "def": "DEF", "hp": "PV", "eva": "Esquiva", "crit": "Crítico", "shieldHp": "PV de escudo",
        "sk.atk": "ATQ", "sk.def": "DEF", "sk.hp": "PV", "sk.shieldHp": "PV de escudo", "sk.evasion": "Esquiva",
        "sk.critical": "Chance de crítico", "sk.critMult": "Dano crítico", "sk.critRateOverride": "Chance de crítico fixa",
        "sk.evaOverride": "Esquiva fixa", "sk.item": "Atributos dos itens", "sk.healMult": "Cura",
        "sk.regen": "Regeneração de PV", "sk.survive": "Sobreviver a golpe fatal", "sk.xp": "XP",
        "sk.eleAtk": "ATQ elemental", "sk.atkBuf": "ATQ do grupo", "sk.evaBuf": "Esquiva do grupo",
        "sk.critBuf": "Crítico do grupo", "sk.monsAtkBuf": "ATQ dos monstros", "sk.bossAtk": "ATQ contra chefes",
        "sk.bossDef": "DEF contra chefes", "sk.surcharge": "Sobretaxa", "sk.aggro": "Ameaça",
        "sk.break": "Quebra de itens", "sk.rest": "Tempo de descanso", "sk.qxp": "XP de missão",
        "sk.loot": "Saque", "sk.key": "Chance de chave", "sk.time": "Duração da missão",
        "sk.xpToAtk": "XP convertida em ATQ", "sk.tombCurse": "Maldição da tumba", "sk.stealOdds": "Chance de roubo",
        "sk.elementOdds": "Chance de elemento", "sk.affects": "Afeta: {0}",
        "level": "Nível", "boss": "Chefe", "upg.stat": "Atributos +{0}%", "upg.skl": "Nível da habilidade +{0}",
        "card.dupe": "Fragmentos por carta duplicada x{0}",
    },
    "en": {
        "cat.weapon": "Weapons", "cat.armor": "Armor", "cat.accessory": "Accessories",
        "cat.consumable": "Consumables", "cat.enchant": "Enchantments", "cat.other": "Other",
        "src.none": "Starter / unlocked by blueprint", "src.pack": "Blueprint pack",
        "src.chest": "Chest", "src.special": "Special / event",
        "eff.bp": "Unlocks blueprint: {0}", "eff.reward": "Reward: {0}x {1}",
        "eff.cquality": "Component {0} quality requirement -{1}",
        "eff.multi": "Multicraft chance +{0}%", "eff.quality": "Quality chance +{0}",
        "value": "Value", "time": "Crafting time", "favor": "Favor", "surchargeOne": "Surcharge value",
        "surchargeOneEnergy": "Surcharge energy", "baseStats": "Base stats (ATK/DEF/HP)",
        "airshippower": "Airship power",
        "atk": "ATK", "def": "DEF", "hp": "HP", "eva": "Evasion", "crit": "Critical", "shieldHp": "Shield HP",
        "sk.atk": "ATK", "sk.def": "DEF", "sk.hp": "HP", "sk.shieldHp": "Shield HP", "sk.evasion": "Evasion",
        "sk.critical": "Critical chance", "sk.critMult": "Critical damage", "sk.critRateOverride": "Fixed critical chance",
        "sk.evaOverride": "Fixed evasion", "sk.item": "Item stats", "sk.healMult": "Healing",
        "sk.regen": "HP regeneration", "sk.survive": "Survive lethal hit", "sk.xp": "XP",
        "sk.eleAtk": "Elemental ATK", "sk.atkBuf": "Party ATK", "sk.evaBuf": "Party evasion",
        "sk.critBuf": "Party critical", "sk.monsAtkBuf": "Monster ATK", "sk.bossAtk": "ATK vs bosses",
        "sk.bossDef": "DEF vs bosses", "sk.surcharge": "Surcharge", "sk.aggro": "Threat",
        "sk.break": "Item break", "sk.rest": "Rest time", "sk.qxp": "Quest XP",
        "sk.loot": "Loot", "sk.key": "Key chance", "sk.time": "Quest duration",
        "sk.xpToAtk": "XP converted to ATK", "sk.tombCurse": "Tomb curse", "sk.stealOdds": "Steal chance",
        "sk.elementOdds": "Element chance", "sk.affects": "Affects: {0}",
        "level": "Level", "boss": "Boss", "upg.stat": "Stats +{0}%", "upg.skl": "Skill level +{0}",
        "card.dupe": "Shards per duplicate card x{0}",
    },
}

# campo -> formato: pct (valor*100 %), x (multiplicador), n (número)
STAT_FIELDS = {
    "atk": "pct", "atkAbs": "n", "def": "pct", "defAbs": "n", "hp": "pct", "hpAbs": "n", "shieldHp": "pct",
    "evasion": "pct", "critical": "pct", "critMult": "x", "critRateOverride": "pct", "evaOverride": "pct",
    "item": "pct", "healMult": "pct", "regen": "n", "survive": "pct", "xp": "pct", "eleAtk": "pct",
    "atkBuf": "pct", "evaBuf": "pct", "critBuf": "pct", "monsAtkBuf": "pct", "bossAtk": "pct", "bossDef": "pct",
    "surcharge": "pct", "aggro": "n", "break": "pct", "rest": "pct", "qxp": "pct", "loot": "pct", "key": "pct",
    "time": "pct", "xpToAtk": "pct", "tombCurse": "pct", "stealOdds": "pct", "elementOdds": "pct",
}
ABS_LABEL = {"atkAbs": "atk", "defAbs": "def", "hpAbs": "hp"}

# demais idiomas: st/lbl_i18n.json ({idioma: {chave: texto}}); o que faltar cai no inglês
try:
    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "lbl_i18n.json"), encoding="utf-8") as _f:
        for _lang, _d in json.load(_f).items():
            if _lang not in ("pt", "en"):
                LBL[_lang] = {**LBL["en"], **{k: v for k, v in _d.items() if k in LBL["en"] and v}}
except (OSError, ValueError):
    pass


def lbl(lang):
    """Rótulos do extrator no idioma; idiomas sem tradução própria usam inglês."""
    return LBL.get(lang, LBL["en"])


TYPE_KEYS = {
    "ws": "sword", "wa": "axe", "wd": "dagger", "wm": "mace", "wp": "spear",
    "wb": "bow", "wt": "staff", "ww": "wand", "wc": "crossbow", "wg": "gun",
    "wi": "instrument", "w2": "dualwield", "wy": "catalyst", "wh": "scythe",
    "uh": "herb", "up": "potion", "us": "scrolls",
    "ah": "armorheavy", "am": "armormedium", "al": "armorlight",
    "hh": "helmet", "hm": "roguehat", "hl": "hat", "hk": "mask",
    "gh": "gauntlets", "gl": "bracers", "bh": "boots", "bl": "shoes",
    "xs": "shield", "xq": "quiver", "xc": "cloak", "xi": "idol",
    "xr": "ring", "xa": "amulet", "xf": "familiar", "xx": "aurastone",
    "xu": "stone", "xm": "moonstone",
    "fm": "meal", "fd": "dessert",
    "z": "enchantment", "m": "component", "ma": "fragment",
}


def type_name(T, code):
    return T.get(f"item_type_{TYPE_KEYS.get(code, code)}", code)


def stat_effects(row, T, fields=STAT_FIELDS):
    """Lista de efeitos legíveis a partir dos campos numéricos de uma skill/modificador."""
    L = lbl(T.lang)
    out = []
    for f, kind in fields.items():
        v = num(row.get(f))
        if not v:
            continue
        if f == "critMult" and v == 0:
            continue
        lab = L.get("sk." + ABS_LABEL.get(f, f), f)
        if kind == "pct":
            out.append(f"{lab} {'+' if v > 0 else ''}{fmt_num(v * 100, T.lang)}%")
        elif kind == "x":
            out.append(f"{lab} x{fmt_num(v, T.lang)}")
        else:
            out.append(f"{lab} {'+' if v > 0 else ''}{fmt_num(v, T.lang)}")
    types = row.get("itemTypes")
    if types:
        out.append(L["sk.affects"].format(", ".join(type_name(T, c) for c in split(types))))
    return out


def write_js(path, key, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(f"(window.ST=window.ST||{{}}).{key}=")
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")
