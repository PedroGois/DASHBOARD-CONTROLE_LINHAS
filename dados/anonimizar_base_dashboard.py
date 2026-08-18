"""Anonimiza a base JSON/JS consumida pelo Dashboard de Telefonia.

Cria backups datados antes de alterar dados_dashboard.json e dados_dashboard.js.
"""

from __future__ import annotations

import argparse
import json
import shutil
from datetime import datetime
from pathlib import Path


def novo(mapa: dict[str, str], original: object, rotulo: str) -> str | None:
    if original is None or str(original).strip() == "":
        return original
    chave = str(original).strip()
    if chave not in mapa:
        mapa[chave] = f"{rotulo} Fictício {len(mapa) + 1:03d}"
    return mapa[chave]


def anonimizar(registros: list[dict]) -> list[dict]:
    nomes: dict[str, str] = {}
    linhas: dict[str, str] = {}
    centros: dict[str, int] = {}

    for registro in registros:
        registro["nome"] = novo(nomes, registro.get("nome"), "Pessoa")
        registro["linha"] = novo(linhas, registro.get("linha"), "Linha")

        # CDC e código do CDC recebem a mesma numeração fictícia, preservando
        # o vínculo entre ambos para que os filtros e totais do Dashboard sigam funcionais.
        chave_centro = str(registro.get("codCdc") or registro.get("cdc") or "").strip()
        if chave_centro:
            indice = centros.setdefault(chave_centro, len(centros) + 1)
            registro["codCdc"] = f"CDC-FICT-{indice:03d}"
            registro["cdc"] = f"Centro de Custo Fictício {indice:03d}"

    return registros


def salvar_com_backup(arquivo: Path, conteudo: str, sufixo: str) -> None:
    backup = arquivo.with_name(f"{arquivo.stem}.backup-{sufixo}{arquivo.suffix}")
    shutil.copy2(arquivo, backup)
    arquivo.write_text(conteudo, encoding="utf-8", newline="\n")
    print(f"Backup: {backup.name}")
    print(f"Anonimizado: {arquivo.name}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Anonimiza a base de dados do Dashboard.")
    parser.add_argument("pasta", type=Path, help="Pasta que contém dados_dashboard.json e dados_dashboard.js")
    args = parser.parse_args()

    json_path = args.pasta / "dados_dashboard.json"
    js_path = args.pasta / "dados_dashboard.js"
    if not json_path.is_file() or not js_path.is_file():
        parser.error("A pasta precisa conter dados_dashboard.json e dados_dashboard.js.")

    base = json.loads(json_path.read_text(encoding="utf-8"))
    if not isinstance(base.get("dados"), list):
        parser.error("O campo 'dados' não foi encontrado ou não é uma lista.")

    anonimizar(base["dados"])
    texto_json = json.dumps(base, ensure_ascii=False, indent=2) + "\n"
    texto_js = "window.DADOS_TELEFONIA = " + texto_json
    sufixo = datetime.now().strftime("%Y%m%d-%H%M%S")
    salvar_com_backup(json_path, texto_json, sufixo)
    salvar_com_backup(js_path, texto_js, sufixo)


if __name__ == "__main__":
    main()
