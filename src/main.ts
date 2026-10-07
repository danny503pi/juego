import "./style.css";
import {
  CONFIG,
  avisar,
  crearEstado,
  drenar,
  terminarTurno,
  type Zona
} from "./juego";

type Accion = "avisar" | "drenar";

const raiz = document.querySelector<HTMLDivElement>("#app");

if (!raiz) {
  throw new Error('No se encontró el elemento raíz "#app".');
}

const elementoRaiz: HTMLDivElement = raiz;

let estado = crearEstado(6);
let accionSeleccionada: Accion = "avisar";
let ultimaMensaje = "Elegí una zona para avisar a sus familias.";

function pluralizarFamilias(cantidad: number): string {
  return cantidad === 1 ? "familia" : "familias";
}

function obtenerZonaStatus(zona: Zona): string {
  if (zona.evacuada) {
    return "Evacuada";
  }

  if (zona.inundada) {
    return "Inundada";
  }

  if (zona.agua >= CONFIG.nivelInundacion - 2) {
    return "Peligro";
  }

  if (zona.agua >= 2) {
    return "En riesgo";
  }

  return "Tranquila";
}

function obtenerClaseZona(zona: Zona): string {
  if (zona.evacuada) {
    return "zona--evacuada";
  }

  if (zona.inundada) {
    return "zona--inundada";
  }

  if (zona.agua >= CONFIG.nivelInundacion - 2) {
    return "zona--peligro";
  }

  if (zona.agua >= 2) {
    return "zona--riesgo";
  }

  return "zona--tranquila";
}

function describirZona(zona: Zona): string {
  return `Zona ${zona.fila + 1}, ${zona.columna + 1}: ${zona.familias} ${
    zona.familias === 1 ? "familia" : "familias"
  }, agua ${zona.agua} de ${CONFIG.nivelInundacion}. ${obtenerZonaStatus(zona)}.`;
}

function renderizar(): void {
  const zonas = estado.zonas.flat();
  const familiasEnRiesgo = zonas
    .filter((zona) => !zona.evacuada && !zona.inundada)
    .reduce((total, zona) => total + zona.familias, 0);
  const porcentajeSalvado = Math.round(
    (estado.familiasSalvadas / estado.familiasTotales) *
      CONFIG.porcentajeCompleto
  );
  const partidaEnCurso = estado.resultado === "en curso";
  const tablero = estado.zonas
    .map((fila) =>
      fila
        .map((zona) => {
          const deshabilitada =
            !partidaEnCurso ||
            estado.accionesRestantes === 0 ||
            zona.inundada ||
            (accionSeleccionada === "avisar" && zona.evacuada);
          const esQuebrada = zona.fila === CONFIG.filas - 1;
          const estadoVisible = obtenerZonaStatus(zona);

          return `
            <button
              class="zona ${obtenerClaseZona(zona)}${esQuebrada ? " zona--quebrada" : ""}"
              type="button"
              data-fila="${zona.fila}"
              data-columna="${zona.columna}"
              aria-label="${describirZona(zona)}"
              aria-disabled="${deshabilitada}"
              ${deshabilitada ? "disabled" : ""}
            >
              <span class="zona__familias">${zona.familias} fam.</span>
              <span class="zona__agua">${estadoVisible} · ${zona.agua}/${CONFIG.nivelInundacion}</span>
            </button>`;
        })
        .join("")
    )
    .join("");

  const mensajeFinal =
    estado.resultado === "ganada"
      ? "¡La comunidad está a salvo! Alcanzaste la meta."
      : "La inundación superó la capacidad de respuesta. La partida terminó.";

  elementoRaiz.innerHTML = `
    <main class="juego">
      <header class="encabezado">
        <p class="sobrelinea">EL TURNO DE LA COMUNIDAD</p>
        <h1>Tormenta</h1>
        <p class="introduccion">Sube el agua. Decidí a quién avisar y dónde abrir drenaje.</p>
      </header>

      <section class="panel-resumen" aria-label="Estado de la partida">
        <div class="dato dato--turno">
          <span class="dato__etiqueta">Turno</span>
          <strong>${estado.turno}<span class="dato__suave"> / ${CONFIG.turnosMaximos}</span></strong>
        </div>
        <div class="dato dato--acciones">
          <span class="dato__etiqueta">Acciones</span>
          <strong>${estado.accionesRestantes}<span class="dato__suave"> / ${CONFIG.accionesPorTurno}</span></strong>
        </div>
        <div class="dato dato--salvas">
          <span class="dato__etiqueta">A salvo</span>
          <strong>${estado.familiasSalvadas}<span class="dato__suave"> ${pluralizarFamilias(estado.familiasSalvadas)}</span></strong>
        </div>
        <div class="dato dato--riesgo">
          <span class="dato__etiqueta">En riesgo</span>
          <strong>${familiasEnRiesgo}<span class="dato__suave"> ${pluralizarFamilias(familiasEnRiesgo)}</span></strong>
        </div>
        <div class="dato dato--perdidas">
          <span class="dato__etiqueta">Perdidas</span>
          <strong>${estado.familiasPerdidas}<span class="dato__suave"> ${pluralizarFamilias(estado.familiasPerdidas)}</span></strong>
        </div>
        <div class="progreso">
          <div class="progreso__texto">
            <span>Meta: ${CONFIG.porcentajeMeta}%</span>
            <strong>${porcentajeSalvado}% salvado</strong>
          </div>
          <progress
            class="progreso__barra"
            value="${estado.familiasSalvadas}"
            max="${estado.familiasTotales}"
            aria-label="${porcentajeSalvado}% de familias salvadas; la meta es ${CONFIG.porcentajeMeta}%"
          ></progress>
        </div>
      </section>

      <section class="zona-juego" aria-label="Tablero y acciones">
        <div class="tablero-cabecera">
          <div>
            <h2>La comunidad</h2>
            <p>Seleccioná una acción y tocá una zona.</p>
          </div>
          <span class="indicador-turno">${partidaEnCurso ? "LLUVIA AL FINAL DEL TURNO" : "PARTIDA TERMINADA"}</span>
        </div>

        <div class="acciones" aria-label="Elegir acción">
          <button
            class="boton-accion${accionSeleccionada === "avisar" ? " boton-accion--activo" : ""}"
            type="button"
            data-accion="avisar"
            aria-pressed="${accionSeleccionada === "avisar"}"
            ${!partidaEnCurso || estado.accionesRestantes === 0 ? "disabled" : ""}
          >
            <span class="boton-accion__icono" aria-hidden="true">↗</span>
            <span><strong>Avisar</strong><small>Evacuar una zona</small></span>
          </button>
          <button
            class="boton-accion${accionSeleccionada === "drenar" ? " boton-accion--activo" : ""}"
            type="button"
            data-accion="drenar"
            aria-pressed="${accionSeleccionada === "drenar"}"
            ${!partidaEnCurso || estado.accionesRestantes === 0 ? "disabled" : ""}
          >
            <span class="boton-accion__icono" aria-hidden="true">⌁</span>
            <span><strong>Drenar</strong><small>Reducir el nivel de agua</small></span>
          </button>
        </div>

        <p class="mensaje" role="status" aria-live="polite">${partidaEnCurso ? ultimaMensaje : mensajeFinal}</p>

        <div class="tablero-marco">
          <div class="tablero" role="group" aria-label="Tablero de cinco filas por cinco columnas">
            ${tablero}
          </div>
          <p class="etiqueta-quebrada"><span aria-hidden="true">↓</span> La quebrada: recibe más agua por turno</p>
        </div>

        <div class="leyenda" aria-label="Referencias de nivel de agua">
          <span><i class="leyenda__punto leyenda__punto--tranquila"></i>Tranquila</span>
          <span><i class="leyenda__punto leyenda__punto--riesgo"></i>En riesgo</span>
          <span><i class="leyenda__punto leyenda__punto--peligro"></i>Peligro</span>
          <span><i class="leyenda__punto leyenda__punto--inundada"></i>Inundada</span>
          <span><i class="leyenda__punto leyenda__punto--evacuada"></i>Evacuada</span>
        </div>

        <div class="pie-tablero">
          <p class="nota-turno">Cada turno llueve. Usá tus ${CONFIG.accionesPorTurno} acciones antes de que suba el agua.</p>
          <button
            class="boton-turno"
            type="button"
            data-fin-turno
            ${!partidaEnCurso || estado.accionesRestantes > 0 ? "disabled" : ""}
          >Terminar turno <span aria-hidden="true">→</span></button>
        </div>
        ${
          !partidaEnCurso
            ? `<button class="boton-reiniciar" type="button" data-nueva-partida>Jugar otra vez</button>`
            : ""
        }
      </section>
      <footer class="pie-pagina">
        <span>${estado.familiasTotales} ${pluralizarFamilias(estado.familiasTotales)} en ${CONFIG.filas * CONFIG.columnas} zonas</span>
        <span>Meta de rescate: ${estado.familiasNecesarias} ${pluralizarFamilias(estado.familiasNecesarias)}</span>
      </footer>
    </main>`;
}

function manejarClic(evento: Event): void {
  const objetivo = evento.target;

  if (!(objetivo instanceof Element)) {
    return;
  }

  const boton = objetivo.closest<HTMLButtonElement>("button");

  if (!boton) {
    return;
  }

  const accion = boton.dataset.accion;

  if (accion === "avisar" || accion === "drenar") {
    accionSeleccionada = accion;
    ultimaMensaje =
      accion === "avisar"
        ? "Elegí una zona para poner a sus familias a salvo."
        : "Elegí una zona para drenar el agua a su alrededor.";
    renderizar();
    return;
  }

  if (boton.hasAttribute("data-fin-turno")) {
    if (terminarTurno(estado)) {
      ultimaMensaje =
        estado.resultado === "en curso"
          ? "Llovió. El agua subió; planificá tus próximas acciones."
          : ultimaMensaje;
      renderizar();
    }
    return;
  }

  if (boton.hasAttribute("data-nueva-partida")) {
    estado = crearEstado(estado.semilla + 1);
    accionSeleccionada = "avisar";
    ultimaMensaje = "Elegí una zona para avisar a sus familias.";
    renderizar();
    return;
  }

  const fila = Number(boton.dataset.fila);
  const columna = Number(boton.dataset.columna);
  const accionValida =
    accionSeleccionada === "avisar"
      ? avisar(estado, fila, columna)
      : drenar(estado, fila, columna);

  if (!accionValida) {
    ultimaMensaje =
      accionSeleccionada === "avisar"
        ? "No se puede avisar esa zona: ya fue evacuada o está inundada."
        : "No se puede drenar una zona inundada.";
    renderizar();
    return;
  }

  const zona = estado.zonas[fila]?.[columna];

  if (accionSeleccionada === "avisar" && zona) {
    ultimaMensaje = `Aviso enviado. ${zona.familias} ${
      zona.familias === 1 ? "familia está" : "familias están"
    } a salvo.`;
  } else if (accionSeleccionada === "drenar") {
    ultimaMensaje = "Drenaje abierto: baja el agua en esa zona y las vecinas.";
  }

  renderizar();
}

elementoRaiz.addEventListener("click", manejarClic);
renderizar();
