import { DurableObject } from "cloudflare:workers";

export class HAWebSocketRelay extends DurableObject {
  private haWebSocket: WebSocket | null = null;
  private clients: Set<WebSocket> = new Set();
  private haUrl: string;
  private haToken: string;

  constructor(state: DurableObjectState, env: any) {
    super(state, env);
    this.haUrl = env.HOMEASSISTANT_URL || "http://localhost:8123";
    this.haToken = env.HA_TOKEN || "dummy_token";

    this.connectToHomeAssistant();
  }

  async connectToHomeAssistant() {
    try {
      const wsUrl =
        this.haUrl.replace("https://", "wss://").replace("http://", "ws://") + "/api/websocket";

      this.haWebSocket = new WebSocket(wsUrl);

      this.haWebSocket.addEventListener("open", async () => {
        console.log("Connected to Home Assistant");

        this.haWebSocket!.send(
          JSON.stringify({
            type: "auth",
            access_token: this.haToken,
          }),
        );
      });

      this.haWebSocket.addEventListener("message", (event) => {
        const message = JSON.parse(event.data as string);

        if (message.type === "event" && message.event.event_type === "state_changed") {
          this.logStateChange(message.event.data);
        }

        this.broadcastToClients(message);
      });

      this.haWebSocket.addEventListener("error", (error) => {
        console.error("HA WebSocket error:", error);
        this.reconnect();
      });

      this.haWebSocket.addEventListener("close", () => {
        console.log("HA WebSocket closed");
        this.reconnect();
      });
    } catch (error) {
      console.error("Failed to connect to HA:", error);
      this.reconnect();
    }
  }

  private broadcastToClients(message: any) {
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      } else {
        this.clients.delete(client);
      }
    });
  }

  private async logStateChange(data: any) {
    const { new_state, old_state } = data;

    if (new_state) {
      const _event = {
        entity_id: new_state.entity_id,
        new_state: new_state.state,
        old_state: old_state?.state,
        attributes: new_state.attributes,
        timestamp: new Date().toISOString(),
      };

      // In a real implementation, we'd use Drizzle ORM to insert this into the D1 DB
      // Assuming env.DB is available and we can use Drizzle
      // (This requires passing D1 to the Durable Object environment and importing schema)
    }
  }

  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get("Upgrade");
    if (!upgradeHeader || upgradeHeader !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    const [client, server] = Object.values(new WebSocketPair());

    this.handleSession(server);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async handleSession(webSocket: WebSocket) {
    // Durable Objects require accept()
    // @ts-ignore
    webSocket.accept();
    this.clients.add(webSocket);

    webSocket.addEventListener("message", async (event) => {
      const message = JSON.parse(event.data as string);

      if (message.type === "subscribe") {
        this.haWebSocket?.send(
          JSON.stringify({
            id: message.id,
            type: "subscribe_entities",
            entity_ids: message.entity_ids,
          }),
        );
      } else if (message.type === "call_service") {
        this.haWebSocket?.send(
          JSON.stringify({
            id: message.id,
            type: "call_service",
            domain: message.domain,
            service: message.service,
            service_data: message.service_data,
          }),
        );

        await this.logAction({
          type: "service_call",
          domain: message.domain,
          service: message.service,
          service_data: message.service_data,
          user_agent: message.user_agent,
          timestamp: new Date().toISOString(),
        });
      }
    });

    webSocket.addEventListener("close", () => {
      this.clients.delete(webSocket);
    });
  }

  private async logAction(_action: any) {
    // Similar to logStateChange, this would interact with D1 via Drizzle
  }

  private async reconnect() {
    setTimeout(() => this.connectToHomeAssistant(), 5000);
  }
}
