export const CONFIG = {
  cero: 0, // unidad: valor mínimo de agua y de índice de coordenada
  uno: 1, // unidad: incremento mínimo de agua, familia y turno
  dos: 2, // unidad: incremento de lluvia en la quebrada
  filas: 5, // unidad: filas del tablero
  columnas: 5, // unidad: columnas del tablero
  familiasMinimas: 1, // unidad: familias por zona
  familiasMaximas: 3, // unidad: familias por zona
  aguaInicialMinima: 0, // unidad: niveles de agua inicial por zona
  aguaInicialMaxima: 3, // unidad: niveles de agua inicial por zona
  accionesPorTurno: 3, // unidad: acciones por turno
  turnosMaximos: 8, // unidad: turnos por partida
  lluviaNormal: 1, // unidad: niveles de agua por turno en zona normal
  lluviaQuebrada: 2, // unidad: niveles de agua por turno en zona de quebrada
  nivelInundacion: 6, // unidad: niveles de agua para inundar una zona
  drenajeZona: 3, // unidad: niveles de agua que drena la zona elegida
  drenajeVecinas: 1, // unidad: niveles de agua que drena cada zona vecina
  porcentajeMeta: 70, // unidad: porcentaje mínimo de familias salvadas
  porcentajeCompleto: 100, // unidad: porcentaje usado para calcular la meta
  multiplicadorAzar: 48271, // unidad: factor del generador pseudoaleatorio
  moduloAzar: 2147483647 // unidad: módulo del generador pseudoaleatorio
} as const;

export type EstadoPartida = "en curso" | "ganada" | "perdida";

export interface Zona {
  fila: number;
  columna: number;
  familias: number;
  agua: number;
  evacuada: boolean;
  inundada: boolean;
}

export interface Estado {
  semilla: number;
  zonas: Zona[][];
  turno: number;
  accionesRestantes: number;
  familiasTotales: number;
  familiasSalvadas: number;
  familiasPerdidas: number;
  familiasNecesarias: number;
  resultado: EstadoPartida;
}

export function crearGeneradorAleatorio(semilla: number): () => number {
  if (!Number.isFinite(semilla)) {
    throw new RangeError("La semilla debe ser un número finito.");
  }

  let valor =
    (Math.trunc(semilla) % (CONFIG.moduloAzar - CONFIG.uno) +
      CONFIG.moduloAzar -
      CONFIG.uno) %
      (CONFIG.moduloAzar - CONFIG.uno) +
    CONFIG.uno;

  return (): number => {
    valor = (valor * CONFIG.multiplicadorAzar) % CONFIG.moduloAzar;
    return valor / CONFIG.moduloAzar;
  };
}

export function crearEstado(semilla: number): Estado {
  const aleatorio = crearGeneradorAleatorio(semilla);
  const zonas: Zona[][] = [];
  let familiasTotales = CONFIG.cero;

  for (let fila = CONFIG.cero; fila < CONFIG.filas; fila += CONFIG.uno) {
    const zonasFila: Zona[] = [];

    for (
      let columna = CONFIG.cero;
      columna < CONFIG.columnas;
      columna += CONFIG.uno
    ) {
      const familias =
        CONFIG.familiasMinimas +
        Math.floor(
          aleatorio() *
            (CONFIG.familiasMaximas - CONFIG.familiasMinimas + CONFIG.uno)
        );
      const agua =
        CONFIG.aguaInicialMinima +
        Math.floor(
          aleatorio() *
            (CONFIG.aguaInicialMaxima - CONFIG.aguaInicialMinima + CONFIG.uno)
        );

      zonasFila.push({
        fila,
        columna,
        familias,
        agua,
        evacuada: false,
        inundada: false
      });
      familiasTotales += familias;
    }

    zonas.push(zonasFila);
  }

  return {
    semilla,
    zonas,
    turno: CONFIG.uno,
    accionesRestantes: CONFIG.accionesPorTurno,
    familiasTotales,
    familiasSalvadas: CONFIG.cero,
    familiasPerdidas: CONFIG.cero,
    familiasNecesarias: Math.ceil(
      (familiasTotales * CONFIG.porcentajeMeta) / CONFIG.porcentajeCompleto
    ),
    resultado: "en curso"
  };
}

export function avisar(
  estado: Estado,
  fila: number,
  columna: number
): boolean {
  const zona = obtenerZona(estado, fila, columna);

  if (
    estado.resultado !== "en curso" ||
    estado.accionesRestantes <= CONFIG.cero ||
    zona === undefined ||
    zona.inundada ||
    zona.evacuada
  ) {
    return false;
  }

  zona.evacuada = true;
  estado.familiasSalvadas += zona.familias;
  estado.accionesRestantes -= CONFIG.uno;
  return true;
}

export function drenar(
  estado: Estado,
  fila: number,
  columna: number
): boolean {
  const zona = obtenerZona(estado, fila, columna);

  if (
    estado.resultado !== "en curso" ||
    estado.accionesRestantes <= CONFIG.cero ||
    zona === undefined ||
    zona.inundada
  ) {
    return false;
  }

  for (const vecina of obtenerZonasVecinas(estado, fila, columna)) {
    const cantidad = vecina === zona ? CONFIG.drenajeZona : CONFIG.drenajeVecinas;
    vecina.agua = Math.max(CONFIG.cero, vecina.agua - cantidad);
  }

  estado.accionesRestantes -= CONFIG.uno;
  return true;
}

export function terminarTurno(estado: Estado): boolean {
  if (
    estado.resultado !== "en curso" ||
    estado.accionesRestantes !== CONFIG.cero
  ) {
    return false;
  }

  for (const fila of estado.zonas) {
    for (const zona of fila) {
      if (zona.inundada) {
        continue;
      }

      const lluvia =
        zona.fila === CONFIG.filas - CONFIG.uno
          ? CONFIG.lluviaQuebrada
          : CONFIG.lluviaNormal;
      zona.agua += lluvia;

      if (zona.agua >= CONFIG.nivelInundacion) {
        zona.agua = CONFIG.nivelInundacion;
        zona.inundada = true;

        if (!zona.evacuada) {
          estado.familiasPerdidas += zona.familias;
        }
      }
    }
  }

  if (
    estado.familiasTotales - estado.familiasPerdidas <
    estado.familiasNecesarias
  ) {
    estado.resultado = "perdida";
    return true;
  }

  if (estado.turno === CONFIG.turnosMaximos) {
    estado.resultado =
      estado.familiasSalvadas >= estado.familiasNecesarias
        ? "ganada"
        : "perdida";
    return true;
  }

  estado.turno += CONFIG.uno;
  estado.accionesRestantes = CONFIG.accionesPorTurno;
  return true;
}

function obtenerZona(
  estado: Estado,
  fila: number,
  columna: number
): Zona | undefined {
  if (
    !Number.isInteger(fila) ||
    !Number.isInteger(columna) ||
    fila < CONFIG.cero ||
    fila >= CONFIG.filas ||
    columna < CONFIG.cero ||
    columna >= CONFIG.columnas
  ) {
    return undefined;
  }

  return estado.zonas[fila]?.[columna];
}

function obtenerZonasVecinas(
  estado: Estado,
  fila: number,
  columna: number
): Zona[] {
  const coordenadas = [
    [fila, columna],
    [fila - CONFIG.uno, columna],
    [fila + CONFIG.uno, columna],
    [fila, columna - CONFIG.uno],
    [fila, columna + CONFIG.uno]
  ];

  return coordenadas
    .map(([filaVecina, columnaVecina]) =>
      obtenerZona(estado, filaVecina, columnaVecina)
    )
    .filter((zona): zona is Zona => zona !== undefined && !zona.inundada);
}
