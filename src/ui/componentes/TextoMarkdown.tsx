import { Fragment, type ReactNode } from "react";

// Aceita apenas URLs absolutas explícitas; links desconhecidos permanecem texto.
function urlSegura(url: string): boolean {
  if (!/^(https?:\/\/|mailto:)/i.test(url) || /[\s\u0000-\u001f\u007f]/.test(url)) return false;
  try {
    const parsed = new URL(url);
    return ["http:", "https:", "mailto:"].includes(parsed.protocol) &&
      (parsed.protocol === "mailto:" ? Boolean(parsed.pathname) : Boolean(parsed.hostname));
  } catch {
    return false;
  }
}

function inline(texto: string): ReactNode[] {
  const partes: ReactNode[] = [];
  // Não interpretar HTML: tudo que não for Markdown reconhecido vira texto React.
  const padrao = /\[([^\]\n]+)\]\(([^)\n]+)\)|\*\*([^*\n]+)\*\*|__([^_\n]+)__|(?<!\*)\*([^*\n]+)\*(?!\*)|(?<![\w_])_([^_\n]+)_(?![\w_])|`([^`\n]+)`/g;
  let anterior = 0;
  for (const match of texto.matchAll(padrao)) {
    const inicio = match.index;
    partes.push(texto.slice(anterior, inicio));
    const [original, rotulo, url, negritoA, negritoB, italicoA, italicoB, codigo] = match;
    if (rotulo !== undefined && url !== undefined) {
      partes.push(urlSegura(url) ? <a key={inicio} href={url} className="text-[#5B168F] underline break-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#820AD1]">{inline(rotulo)}</a> : original);
    } else if (negritoA !== undefined || negritoB !== undefined) {
      partes.push(<strong key={inicio}>{inline(negritoA ?? negritoB)}</strong>);
    } else if (italicoA !== undefined || italicoB !== undefined) {
      partes.push(<em key={inicio}>{inline(italicoA ?? italicoB)}</em>);
    } else {
      partes.push(<code key={inicio} className="rounded bg-[#F0F0F0] px-1">{codigo}</code>);
    }
    anterior = inicio + original.length;
  }
  partes.push(texto.slice(anterior));
  return partes;
}

function celulasTabela(linha: string): string[] | null {
  if (!linha.includes("|")) return null;
  let fonte = linha.trim();
  if (fonte.startsWith("|")) fonte = fonte.slice(1);
  if (fonte.endsWith("|") && !fonte.endsWith("\\|")) fonte = fonte.slice(0, -1);
  const celulas: string[] = [];
  let atual = "";
  for (let i = 0; i < fonte.length; i++) {
    if (fonte[i] === "\\" && fonte[i + 1] === "|") { atual += "|"; i++; }
    else if (fonte[i] === "|") { celulas.push(atual.trim()); atual = ""; }
    else atual += fonte[i];
  }
  celulas.push(atual.trim());
  return celulas;
}

export function TextoMarkdown({ texto }: { texto: string }) {
  const linhas = texto.split("\n");
  const blocos: ReactNode[] = [];
  let i = 0;
  const lista = (linha: string) => linha.match(/^ {0,3}([-+*]|\d+[.)])\s+(.+)$/);
  const titulo = (linha: string) => linha.match(/^ {0,3}(#{1,6})\s+(.+)$/);
  const inicioTabela = (indice: number) => {
    const cabecalho = celulasTabela(linhas[indice] ?? "");
    const separador = celulasTabela(linhas[indice + 1] ?? "");
    return Boolean(cabecalho && separador && cabecalho.length === separador.length && separador.every((c) => /^:?-{3,}:?$/.test(c)));
  };
  while (i < linhas.length) {
    const linha = linhas[i]!;
    if (!linha.trim()) { i++; continue; }
    const indice = i;
    // Formata cercas completas; preserva literalmente blocos não terminados.
    if (/^\s*```/.test(linha)) {
      const bloco = [linha];
      i++;
      let fechado = false;
      while (i < linhas.length) {
        const atual = linhas[i++]!;
        bloco.push(atual);
        if (/^\s*```\s*$/.test(atual)) { fechado = true; break; }
      }
      const linguagem = linha.trim().slice(3).trim();
      blocos.push(fechado ? (
        <div key={indice} className="min-w-0 rounded-xl bg-[#F8F8F8] p-3">
          {linguagem && <div className="mb-1 text-xs text-[#646464]">{linguagem}</div>}
          <pre className="overflow-x-auto whitespace-pre-wrap break-words"><code>{bloco.slice(1, -1).join("\n")}</code></pre>
        </div>
      ) : <pre key={indice} className="whitespace-pre-wrap break-words">{bloco.join("\n")}</pre>);
      continue;
    }
    const cabecalho = celulasTabela(linha);
    const separador = i + 1 < linhas.length ? celulasTabela(linhas[i + 1]!) : null;
    if (cabecalho && separador && cabecalho.length === separador.length && separador.every((c) => /^:?-{3,}:?$/.test(c))) {
      const linhasTabela: string[][] = [];
      let proxima = i + 2;
      while (proxima < linhas.length && linhas[proxima]!.trim() && linhas[proxima]!.includes("|")) {
        linhasTabela.push(celulasTabela(linhas[proxima]!)!);
        proxima++;
      }
      // Se qualquer linha estiver incompleta, preserva a entrada literal inteira.
      if (linhasTabela.every((c) => c.length === cabecalho.length)) {
        blocos.push(<div key={indice} role="region" aria-label="Tabela" tabIndex={0} className="max-w-full overflow-x-auto"><table className="w-full text-left text-sm border-collapse"><thead><tr>{cabecalho.map((c, n) => <th scope="col" key={n} className="border-b border-[#BDBDBD] px-2 py-1 font-semibold">{inline(c)}</th>)}</tr></thead><tbody>{linhasTabela.map((linhaTabela, n) => <tr key={n}>{linhaTabela.map((c, j) => <td key={j} className="border-b border-[#EEEEEE] px-2 py-1">{inline(c)}</td>)}</tr>)}</tbody></table></div>);
        i = proxima;
        continue;
      }
    }
    const h = titulo(linha);
    if (h) {
      const Tag = `h${h[1]!.length}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
      blocos.push(<Tag key={indice} className="font-semibold text-base">{inline(h[2]!)}</Tag>);
      i++;
      continue;
    }
    const primeiro = lista(linha);
    if (primeiro) {
      const ordenada = /^\d/.test(primeiro[1]!);
      const itens: ReactNode[] = [];
      while (i < linhas.length) {
        const item = lista(linhas[i]!);
        if (!item || /^\d/.test(item[1]!) !== ordenada) break;
        itens.push(<li key={i} value={ordenada ? parseInt(item[1]!, 10) : undefined}>{inline(item[2]!)}</li>);
        i++;
      }
      blocos.push(ordenada ? <ol key={indice} className="list-decimal pl-6">{itens}</ol> : <ul key={indice} className="list-disc pl-6">{itens}</ul>);
      continue;
    }
    const paragrafo = [linha];
    i++;
    while (i < linhas.length && linhas[i]!.trim() && !titulo(linhas[i]!) && !lista(linhas[i]!) && !/^\s*```/.test(linhas[i]!) && !inicioTabela(i)) paragrafo.push(linhas[i++]!);
    blocos.push(<p key={indice} className="whitespace-pre-wrap">{paragrafo.map((textoLinha, n) => <Fragment key={n}>{n > 0 && "\n"}{inline(textoLinha)}</Fragment>)}</p>);
  }
  return <div className="flex flex-col gap-2 break-words leading-relaxed">{blocos}</div>;
}
