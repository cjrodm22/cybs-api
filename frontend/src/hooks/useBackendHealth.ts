import { useEffect, useState } from "react";
import { checkBackendHealth } from "../api/http";

export type BackendHealth = "checking" | "online" | "offline";

export function useBackendHealth(): BackendHealth {
  const [health, setHealth] = useState<BackendHealth>("checking");

  useEffect(() => {
    let active = true;
    checkBackendHealth().then((online) => {
      if (active) setHealth(online ? "online" : "offline");
    });
    return () => {
      active = false;
    };
  }, []);

  return health;
}
