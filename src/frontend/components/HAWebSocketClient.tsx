import React, { useEffect, useState } from "react";

export function useHAWebSocket() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [states, setStates] = useState<Record<string, any>>({});
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      setConnected(true);
      websocket.send(
        JSON.stringify({
          type: "subscribe",
          entity_ids: ["light.living_room", "light.bedroom"],
        }),
      );
    };

    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === "event" && message.event.event_type === "state_changed") {
        const { entity_id, new_state } = message.event.data;
        setStates((prev) => ({
          ...prev,
          [entity_id]: new_state,
        }));
      }
    };

    websocket.onerror = (error) => {
      console.error("WebSocket error:", error);
      setConnected(false);
    };

    websocket.onclose = () => {
      setConnected(false);
    };

    setWs(websocket);

    return () => websocket.close();
  }, []);

  const callService = (domain: string, service: string, service_data: any) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "call_service",
          domain,
          service,
          service_data,
          user_agent: navigator.userAgent,
        }),
      );
    }
  };

  return { states, connected, callService };
}

export function LightToggle({ entityId }: { entityId: string }) {
  const { states, callService } = useHAWebSocket();
  const stateObj = states[entityId];
  const state = stateObj ? stateObj.state : "unknown";

  return (
    <button
      onClick={() => callService("light", "toggle", { entity_id: entityId })}
      className={`px-4 py-2 rounded-md font-semibold text-white transition-colors ${state === "on" ? "bg-yellow-500 hover:bg-yellow-600" : "bg-gray-500 hover:bg-gray-600"}`}
    >
      {state === "on" ? "💡 On" : "⚫ Off"}
    </button>
  );
}
