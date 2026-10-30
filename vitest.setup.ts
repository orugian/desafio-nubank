// testes nunca usam rede; os testes de mercado injetam fetch e ativo explicitamente
process.env.MERCADO_AO_VIVO ??= "0";

import "@testing-library/jest-dom/vitest";
