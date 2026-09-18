import { resolveDeliveryStatus } from "./delivery";

describe("resolveDeliveryStatus", () => {
  it("considera pendente quando não há atualização", () => {
    expect(resolveDeliveryStatus([])).toBe("PENDING");
    expect(resolveDeliveryStatus(undefined)).toBe("PENDING");
    expect(resolveDeliveryStatus(null)).toBe("PENDING");
  });

  it("devolve o estado mais avançado da lista", () => {
    expect(resolveDeliveryStatus([{ status: "SERVER_ACK" }, { status: "DELIVERY_ACK" }])).toBe("DELIVERY_ACK");
  });

  it("independe da ordem das atualizações", () => {
    expect(resolveDeliveryStatus([{ status: "READ" }, { status: "SERVER_ACK" }])).toBe("READ");
  });

  it("prioriza ERROR sobre qualquer confirmação", () => {
    expect(resolveDeliveryStatus([{ status: "READ" }, { status: "ERROR" }])).toBe("ERROR");
  });

  it("ignora estados desconhecidos", () => {
    expect(resolveDeliveryStatus([{ status: "WHATEVER" }, { status: "SERVER_ACK" }])).toBe("SERVER_ACK");
  });

  it("considera pendente quando só há estados desconhecidos", () => {
    expect(resolveDeliveryStatus([{ status: "WHATEVER" }])).toBe("PENDING");
  });
});
