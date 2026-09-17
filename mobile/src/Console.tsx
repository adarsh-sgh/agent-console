import { useState } from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import type { Run, RunStream } from "@shared";
import { RunsScreen } from "./RunsScreen";
import { TraceScreen } from "./TraceScreen";
import { loadRuns as gatewayRuns, runStream } from "./gateway";
import { styles } from "./theme";

/** Two screens, no router. The transports are props so a test can drive the flow without a gateway. */
export function Console({ stream = runStream, loadRuns = gatewayRuns }:
  { stream?: RunStream; loadRuns?: () => Promise<Run[]> }) {
  const [asked, setAsked] = useState<string | null>(null);
  return (
    <View style={styles.app}>
      <StatusBar style="light" />
      {asked === null
        ? <RunsScreen loadRuns={loadRuns} onAsk={setAsked} />
        : <TraceScreen question={asked} stream={stream} onBack={() => setAsked(null)} />}
    </View>
  );
}
