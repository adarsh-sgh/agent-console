import { useEffect, useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import type { Run } from "@shared";
import { styles } from "./theme";

/** Run history from the gateway's GraphQL schema; tapping a run replays its question live. */
export function RunsScreen({ loadRuns, onAsk }: { loadRuns: () => Promise<Run[]>; onAsk: (q: string) => void }) {
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState("Which customers generated the most revenue?");

  useEffect(() => {
    loadRuns().then(setRuns).catch((e: Error) => setError(e.message));
  }, [loadRuns]);

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>agent-console</Text>
      <TextInput
        style={styles.input}
        accessibilityLabel="question"
        value={question}
        onChangeText={setQuestion}
        onSubmitEditing={() => question.trim() && onAsk(question.trim())}
        placeholderTextColor="#666"
      />
      <Pressable accessibilityRole="button" onPress={() => question.trim() && onAsk(question.trim())}>
        <Text style={styles.link}>Run ▸</Text>
      </Pressable>
      <Text style={styles.dim}>History</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={runs ?? []}
        keyExtractor={(r) => r.id}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={<Text style={styles.dim}>{runs ? "No runs yet." : "Loading…"}</Text>}
        renderItem={({ item }) => (
          <Pressable accessibilityRole="button" style={styles.card} onPress={() => onAsk(item.question)}>
            <Text style={styles.question}>{item.question}</Text>
            <Text style={styles.dim}>{item.status} · {new Date(item.createdAt).toLocaleString()}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}
