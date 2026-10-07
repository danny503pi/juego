import { describe, expect, it } from "vitest";
import {
  CONFIG,
  avisar,
  crearEstado,
  drenar,
  terminarTurno,
  type Estado
} from "../src/juego";

function prepararEstado(familiasPorZona = 1, aguaInicial = 0): Estado {
  const estado = crearEstado(1);
  estado.familiasTotales = 0;
  estado.familiasSalvadas = 0;
  estado.familiasPerdidas = 0;
  estado.familiasNecesarias = 0;

  for (const fila of estado.zonas) {
    for (const zona of fila) {
      zona.familias = familiasPorZona;
      zona.agua = aguaInicial;
      zona.evacuada = false;
      zona.inundada = false;
      estado.familiasTotales += zona.familias;
    }
  }

  estado.familiasNecesarias = Math.ceil(
    (estado.familiasTotales * CONFIG.porcentajeMeta) /
      CONFIG.porcentajeCompleto
  );
  return estado;
}

function gastarAccionesDrenando(estado: Estado): void {
  while (estado.accionesRestantes > 0) {
    const zona = estado.zonas
      .flat()
      .find((candidata) => !candidata.inundada);

    if (!zona) {
      throw new Error("No hay una zona válida para gastar la acción.");
    }

    expect(drenar(estado, zona.fila, zona.columna)).toBe(true);
  }
}

function contarFamiliasEnJuego(estado: Estado): number {
  const familiasEnRiesgo = estado.zonas
    .flat()
    .filter((zona) => !zona.evacuada && !zona.inundada)
    .reduce((total, zona) => total + zona.familias, 0);

  return (
    estado.familiasSalvadas +
    estado.familiasPerdidas +
    familiasEnRiesgo
  );
}

describe("reglas de la partida", () => {
  it("arma un tablero con veinticinco zonas", () => {
    const estado = crearEstado(1);

    expect(estado.zonas).toHaveLength(CONFIG.filas);
    expect(estado.zonas.flat()).toHaveLength(
      CONFIG.filas * CONFIG.columnas
    );
    expect(estado.zonas.every((fila) => fila.length === CONFIG.columnas)).toBe(
      true
    );
  });

  it("genera el mismo tablero cuando recibe la misma semilla", () => {
    expect(crearEstado(314).zonas).toEqual(crearEstado(314).zonas);
  });

  it("genera tableros distintos cuando recibe semillas distintas", () => {
    expect(crearEstado(314).zonas).not.toEqual(crearEstado(315).zonas);
  });

  it("avisa una zona válida, la salva y consume una acción", () => {
    const estado = prepararEstado(2);

    expect(avisar(estado, 0, 0)).toBe(true);
    expect(estado.zonas[0]?.[0]?.evacuada).toBe(true);
    expect(estado.familiasSalvadas).toBe(2);
    expect(estado.accionesRestantes).toBe(CONFIG.accionesPorTurno - 1);
  });

  it("rechaza avisar una zona evacuada, inundada o inexistente", () => {
    const estado = prepararEstado();
    const evacuada = estado.zonas[0]?.[0];
    const inundada = estado.zonas[0]?.[1];

    if (!evacuada || !inundada) {
      throw new Error("El tablero no contiene las zonas esperadas.");
    }

    evacuada.evacuada = true;
    inundada.inundada = true;

    expect(avisar(estado, 0, 0)).toBe(false);
    expect(avisar(estado, 0, 1)).toBe(false);
    expect(avisar(estado, -1, 0)).toBe(false);
  });

  it("drena tres niveles en la zona elegida y uno en sus vecinas", () => {
    const estado = prepararEstado(1, 4);

    expect(drenar(estado, 2, 2)).toBe(true);
    expect(estado.zonas[2]?.[2]?.agua).toBe(1);
    expect(estado.zonas[1]?.[2]?.agua).toBe(3);
    expect(estado.zonas[3]?.[2]?.agua).toBe(3);
    expect(estado.zonas[2]?.[1]?.agua).toBe(3);
    expect(estado.zonas[2]?.[3]?.agua).toBe(3);
    expect(estado.zonas[1]?.[1]?.agua).toBe(4);
    expect(estado.accionesRestantes).toBe(CONFIG.accionesPorTurno - 1);
  });

  it("rechaza drenar una zona inundada o inexistente", () => {
    const estado = prepararEstado();
    const inundada = estado.zonas[0]?.[0];

    if (!inundada) {
      throw new Error("El tablero no contiene la zona esperada.");
    }

    inundada.inundada = true;

    expect(drenar(estado, 0, 0)).toBe(false);
    expect(drenar(estado, CONFIG.filas, 0)).toBe(false);
  });

  it("no permite ninguna acción cuando ya no quedan acciones disponibles", () => {
    const estado = prepararEstado();

    expect(avisar(estado, 0, 0)).toBe(true);
    expect(avisar(estado, 0, 1)).toBe(true);
    expect(avisar(estado, 0, 2)).toBe(true);
    expect(estado.accionesRestantes).toBe(0);
    expect(avisar(estado, 0, 3)).toBe(false);
    expect(drenar(estado, 1, 0)).toBe(false);
  });

  it("no termina el turno antes de gastar las tres acciones", () => {
    const estado = prepararEstado();

    expect(terminarTurno(estado)).toBe(false);
    expect(estado.turno).toBe(1);
  });

  it("hace llover al terminar el turno y restaura las acciones", () => {
    const estado = prepararEstado();

    gastarAccionesDrenando(estado);

    expect(terminarTurno(estado)).toBe(true);
    expect(estado.turno).toBe(2);
    expect(estado.accionesRestantes).toBe(CONFIG.accionesPorTurno);
    expect(estado.zonas[0]?.[0]?.agua).toBe(CONFIG.lluviaNormal);
    expect(estado.zonas[CONFIG.filas - 1]?.[0]?.agua).toBe(
      CONFIG.lluviaQuebrada
    );
  });

  it("inunda una zona al alcanzar seis niveles de agua y pierde sus familias", () => {
    const estado = prepararEstado(2);
    const zona = estado.zonas[0]?.[0];

    if (!zona) {
      throw new Error("El tablero no contiene la zona esperada.");
    }

    zona.agua = CONFIG.nivelInundacion - CONFIG.lluviaNormal;
    for (let accion = 0; accion < CONFIG.accionesPorTurno; accion += 1) {
      expect(drenar(estado, CONFIG.filas - 1, CONFIG.columnas - 1)).toBe(true);
    }

    expect(terminarTurno(estado)).toBe(true);
    expect(zona.inundada).toBe(true);
    expect(estado.familiasPerdidas).toBe(2);
    expect(zona.agua).toBe(CONFIG.nivelInundacion);
  });

  it("declara la victoria al salvar la cantidad mínima de familias en el último turno", () => {
    const estado = prepararEstado();
    estado.turno = CONFIG.turnosMaximos;

    for (let indice = 0; indice < estado.familiasNecesarias; indice += 1) {
      const zona = estado.zonas.flat()[indice];

      if (!zona) {
        throw new Error("No hay suficientes zonas para alcanzar la meta.");
      }

      zona.evacuada = true;
      estado.familiasSalvadas += zona.familias;
    }

    gastarAccionesDrenando(estado);

    expect(terminarTurno(estado)).toBe(true);
    expect(estado.resultado).toBe("ganada");
  });

  it("declara la derrota si termina el último turno sin alcanzar la meta", () => {
    const estado = prepararEstado();
    estado.turno = CONFIG.turnosMaximos;

    for (let indice = 0; indice < estado.familiasNecesarias - 1; indice += 1) {
      const zona = estado.zonas.flat()[indice];

      if (!zona) {
        throw new Error("No hay suficientes zonas para preparar la partida.");
      }

      zona.evacuada = true;
      estado.familiasSalvadas += zona.familias;
    }

    gastarAccionesDrenando(estado);

    expect(terminarTurno(estado)).toBe(true);
    expect(estado.resultado).toBe("perdida");
  });

  it("declara la derrota cuando ya no es posible alcanzar la meta", () => {
    const estado = prepararEstado();
    const zonas = estado.zonas.flat();

    for (let indice = 0; indice < estado.familiasTotales - estado.familiasNecesarias + 1; indice += 1) {
      const zona = zonas[indice];

      if (!zona) {
        throw new Error("No hay suficientes zonas para preparar la derrota.");
      }

      zona.inundada = true;
      zona.agua = CONFIG.nivelInundacion;
      estado.familiasPerdidas += zona.familias;
    }

    gastarAccionesDrenando(estado);

    expect(terminarTurno(estado)).toBe(true);
    expect(estado.resultado).toBe("perdida");
  });

  it("mantiene constante el total de familias durante las acciones y los turnos", () => {
    const estado = prepararEstado();
    const totalInicial = estado.familiasTotales;

    for (
      let turno = 0;
      turno < CONFIG.turnosMaximos && estado.resultado === "en curso";
      turno += 1
    ) {
      for (let accion = 0; accion < CONFIG.accionesPorTurno; accion += 1) {
        if (estado.resultado !== "en curso") {
          break;
        }

        const zona = estado.zonas
          .flat()
          .find((candidata) => !candidata.evacuada && !candidata.inundada);

        if (zona) {
          expect(avisar(estado, zona.fila, zona.columna)).toBe(true);
        } else {
          const zonaDrenable = estado.zonas
            .flat()
            .find((candidata) => !candidata.inundada);

          if (zonaDrenable) {
            expect(drenar(estado, zonaDrenable.fila, zonaDrenable.columna)).toBe(
              true
            );
          }
        }

        expect(contarFamiliasEnJuego(estado)).toBe(totalInicial);
      }

      if (estado.accionesRestantes === 0) {
        expect(terminarTurno(estado)).toBe(true);
        expect(contarFamiliasEnJuego(estado)).toBe(totalInicial);
      } else {
        break;
      }

      if (estado.resultado !== "en curso") {
        break;
      }
    }
  });

  it("permite ganar una partida completa con una estrategia que prioriza las zonas urgentes", () => {
    const estado = crearEstado(6);

    while (estado.resultado === "en curso") {
      for (let accion = 0; accion < CONFIG.accionesPorTurno; accion += 1) {
        const zonaUrgente = estado.zonas
          .flat()
          .filter((zona) => !zona.evacuada && !zona.inundada)
          .sort((primera, segunda) => {
            const turnosPrimera = Math.ceil(
              (CONFIG.nivelInundacion - primera.agua) /
                (primera.fila === CONFIG.filas - 1
                  ? CONFIG.lluviaQuebrada
                  : CONFIG.lluviaNormal)
            );
            const turnosSegunda = Math.ceil(
              (CONFIG.nivelInundacion - segunda.agua) /
                (segunda.fila === CONFIG.filas - 1
                  ? CONFIG.lluviaQuebrada
                  : CONFIG.lluviaNormal)
            );

            return (
              turnosPrimera - turnosSegunda ||
              segunda.familias - primera.familias
            );
          })[0];

        if (zonaUrgente) {
          expect(avisar(estado, zonaUrgente.fila, zonaUrgente.columna)).toBe(
            true
          );
        } else {
          const zonaDrenable = estado.zonas
            .flat()
            .find((zona) => !zona.inundada);

          if (!zonaDrenable) {
            break;
          }

          expect(drenar(estado, zonaDrenable.fila, zonaDrenable.columna)).toBe(
            true
          );
        }
      }

      if (estado.accionesRestantes === 0) {
        expect(terminarTurno(estado)).toBe(true);
      } else {
        break;
      }
    }

    expect(estado.resultado).toBe("ganada");
    expect(estado.familiasSalvadas).toBeGreaterThanOrEqual(
      estado.familiasNecesarias
    );
  });

  it("termina en derrota si se pasan los turnos sin avisar a ninguna zona", () => {
    const estado = crearEstado(1);

    while (estado.resultado === "en curso") {
      for (let accion = 0; accion < CONFIG.accionesPorTurno; accion += 1) {
        const zona = estado.zonas
          .flat()
          .find((candidata) => !candidata.inundada);

        if (!zona) {
          break;
        }

        expect(drenar(estado, zona.fila, zona.columna)).toBe(true);
      }

      if (estado.accionesRestantes === 0) {
        expect(terminarTurno(estado)).toBe(true);
      } else {
        break;
      }
    }

    expect(estado.familiasSalvadas).toBe(0);
    expect(estado.resultado).toBe("perdida");
  });
});
