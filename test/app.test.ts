// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";

describe("interfaz del juego", () => {
  it("permite hacer acciones y terminar el turno desde el tablero", async () => {
    document.body.innerHTML = '<div id="app"></div>';
    await import("../src/main");
    const app = document.querySelector<HTMLDivElement>("#app");

    expect(app?.querySelectorAll("[data-fila]")).toHaveLength(25);
    expect(app?.querySelector("[data-accion='avisar']")).not.toBeNull();
    expect(app?.querySelector("[data-accion='drenar']")).not.toBeNull();

    app?.querySelector<HTMLButtonElement>(
      '[data-fila="0"][data-columna="0"]'
    )?.click();
    expect(app?.querySelector(".dato--acciones strong")?.textContent).toBe(
      "2 / 3"
    );

    app?.querySelector<HTMLButtonElement>('[data-accion="drenar"]')?.click();
    app?.querySelector<HTMLButtonElement>(
      '[data-fila="2"][data-columna="2"]'
    )?.click();
    app?.querySelector<HTMLButtonElement>('[data-accion="avisar"]')?.click();
    app?.querySelector<HTMLButtonElement>(
      '[data-fila="0"][data-columna="1"]'
    )?.click();

    expect(app?.querySelector(".dato--acciones strong")?.textContent).toBe(
      "0 / 3"
    );

    app?.querySelector<HTMLButtonElement>("[data-fin-turno]")?.click();

    expect(app?.querySelector(".dato--turno strong")?.textContent).toBe(
      "2 / 8"
    );
    expect(app?.querySelector(".dato--acciones strong")?.textContent).toBe(
      "3 / 3"
    );
  });
});
