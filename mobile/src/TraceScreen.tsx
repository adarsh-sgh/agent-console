import { useEffect } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { stepBody, stepLabel, useRun, visibleSteps, type RunStream } from "@shared";
import { styles } from "./theme";

/** Same steps the web viewer renders, drawn with RN primitives as they stream in. */
export function TraceScreen({ question, stream, onBack }:
  { question: string; stream: RunStream; onBack: () => void }) {
  const { steps, running, error, ask } = useRun(stream);

  useEffect(() => { void ask(question); }, [question, ask]);

  return (
    <View style={styles.screen}>
      <Pressable accessibilityRole="button" onPress={onBack}>
        <Text style={styles.link}>◂ Runs</Text>
      </Pressable>
      <Text style={styles.title}>{question}</Text>
      <Text style={styles.dim}>{running ? "streaming…" : "done"}</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <ScrollView contentContainerStyle={{ gap: 8 }}>
        {visibleSteps(steps).map((s, i) => (
          <View key={i} style={styles.card}>
            <Text style={styles.label}>{stepLabel(s.type)}</Text>
            <Text style={s.type === "tool_call" || s.type === "observation" ? styles.mono : styles.body}>
              {stepBody(s)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
