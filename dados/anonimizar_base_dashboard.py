"""Anonimiza os dados pessoais e identificadores do Dashboard de Telefonia.

Cria backups datados antes de alterar dados_dashboard.json e dados_dashboard.js.
"""

from __future__ import annotations

import argparse
import json
import shutil
from datetime import datetime
from pathlib import Path


SITUACOES_PUBLICAS = {"FROTA", "FAMILIA", "FORA SIGO"}


def novo(mapa: dict[str, str], original: object, rotulo: str) -> str | None:
    if original is None or str(original).strip() == "":
        return original
    chave = str(original).strip()
    if chave not in mapa:
        mapa[chave] = f"{rotulo} Fictício {len(mapa) + 1:03d}"
    return mapa[chave]


def anonimizar_centro(registro: dict, centros: dict[tuple[str, str], int]) -> None:
    """Substitui o CDC, preservando o vínculo entre linhas e aparelhos."""
    codigo = str(registro.get("codCdc") or "").strip()
    descricao = str(registro.get("cdc") or "").strip()
    if not codigo and not descricao:
        return

    chave = (codigo, descricao)
    indice = centros.setdefault(chave, len(centros) + 1)
    registro["codCdc"] = f"CDC-FICT-{indice:03d}"
    registro["cdc"] = f"Centro de Custo Fictício {indice:03d}"


def anonimizar_identificador(
    mapa: dict[str, str],
    original: object,
    *,
    preservar_situacao: bool = False,
) -> str | None:
    """Anonimiza CPF, chapa e identificadores, mantendo marcadores do processo."""
    if preservar_situacao and str(original or "").strip().upper() in SITUACOES_PUBLICAS:
        return str(original).strip().upper()
    return novo(mapa, original, "Identificador Fictício")


def anonimizar(dados: list[dict], aparelhos: list[dict]) -> None:
    """Anonimiza linhas e aparelhos com os mesmos mapas de relacionamento."""
    nomes: dict[str, str] = {}
    linhas: dict[str, str] = {}
    identificadores: dict[str, str] = {}
    patrimonios: dict[str, str] = {}
    series: dict[str, str] = {}
    imeis: dict[str, str] = {}
    centros: dict[tuple[str, str], int] = {}

    for registro in dados:
        registro["nome"] = novo(nomes, registro.get("nome"), "Pessoa")
        registro["linha"] = novo(linhas, registro.get("linha"), "Linha")
        registro["cpf"] = anonimizar_identificador(identificadores, registro.get("cpf"))
        registro["chapaCpf"] = anonimizar_identificador(
            identificadores,
            registro.get("chapaCpf"),
            preservar_situacao=True,
        )
        anonimizar_centro(registro, centros)

    for aparelho in aparelhos:
        aparelho["nome"] = novo(nomes, aparelho.get("nome"), "Pessoa")
        aparelho["linha"] = novo(linhas, aparelho.get("linha"), "Linha")
        aparelho["chapa"] = anonimizar_identificador(identificadores, aparelho.get("chapa"))
        aparelho["patrimonio"] = novo(patrimonios, aparelho.get("patrimonio"), "Patrimônio Fictício")
        aparelho["serie"] = novo(series, aparelho.get("serie"), "Série Fictícia")
        aparelho["imei"] = novo(imeis, aparelho.get("imei"), "IMEI Fictício")
        anonimizar_centro(aparelho, centros)


def salvar_com_backup(arquivo: Path, conteudo: str, sufixo: str) -> None:
    backup = arquivo.with_name(f"{arquivo.stem}.backup-{sufixo}{arquivo.suffix}")
    shutil.copy2(arquivo, backup)
    arquivo.write_text(conteudo, encoding="utf-8", newline="\n")
    print(f"Backup: {backup.name}")
    print(f"Anonimizado: {arquivo.name}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Anonimiza a base de dados do Dashboard.")
    parser.add_argument(
        "pasta",
        type=Path,
        nargs="?",
        default=Path(__file__).resolve().parent,
        help="Pasta que contém dados_dashboard.json e dados_dashboard.js",
    )
    args = parser.parse_args()

    json_path = args.pasta / "dados_dashboard.json"
    js_path = args.pasta / "dados_dashboard.js"
    if not json_path.is_file() or not js_path.is_file():
        parser.error("A pasta precisa conter dados_dashboard.json e dados_dashboard.js.")

    base = json.loads(json_path.read_text(encoding="utf-8"))
    if not isinstance(base.get("dados"), list):
        parser.error("O campo 'dados' não foi encontrado ou não é uma lista.")

    if not isinstance(base.get("aparelhos"), list):
        parser.error("O campo 'aparelhos' não foi encontrado ou não é uma lista.")

    anonimizar(base["dados"], base["aparelhos"])
    texto_json = json.dumps(base, ensure_ascii=False, indent=2) + "\n"
    texto_js = "window.DADOS_TELEFONIA = " + texto_json
    sufixo = datetime.now().strftime("%Y%m%d-%H%M%S")
    salvar_com_backup(json_path, texto_json, sufixo)
    salvar_com_backup(js_path, texto_js, sufixo)


if __name__ == "__main__":
    main()
