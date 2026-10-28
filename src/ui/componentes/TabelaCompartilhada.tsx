import type { ReactNode } from "react";

export type ColunaTabela<T> = {
  chave: string;
  titulo: string;
  alinharDireita?: boolean;
  renderizar: (item: T, indice: number) => ReactNode;
};

export function TabelaCompartilhada<T>({
  caption,
  colunas,
  itens,
  obterChave,
  vazioTexto = "Nenhum item encontrado.",
}: {
  caption: string;
  colunas: ColunaTabela<T>[];
  itens: T[];
  obterChave: (item: T, indice: number) => string;
  vazioTexto?: string;
}) {
  if (itens.length === 0) {
    return (
      <p className="text-sm text-[#646464] py-2" role="note">
        {vazioTexto}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto w-full border border-[#EEEEEE] rounded-xl bg-white">
      <table className="w-full text-left border-collapse text-xs">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-[#EEEEEE] bg-[#F8F8F8] text-[#646464]">
            {colunas.map((col) => (
              <th
                key={col.chave}
                scope="col"
                className={`py-2 px-2.5 font-medium ${col.alinharDireita ? "text-right" : "text-left"}`}
              >
                {col.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EEEEEE] text-[#111111]">
          {itens.map((item, idx) => (
            <tr key={obterChave(item, idx)}>
              {colunas.map((col) => (
                <td
                  key={col.chave}
                  className={`py-2 px-2.5 align-top ${col.alinharDireita ? "text-right tabular-nums" : "text-left"}`}
                >
                  {col.renderizar(item, idx)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
