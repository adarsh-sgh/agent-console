import { StyleSheet } from "react-native";

export const colors = {
  bg: "#0f1115", card: "#181b22", line: "#272b34",
  text: "#e6e8ee", dim: "#8b93a7", accent: "#7aa2f7", error: "#f7768e",
};

export const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.bg },
  screen: { flex: 1, padding: 16, gap: 12 },
  title: { color: colors.text, fontSize: 20, fontWeight: "600" },
  dim: { color: colors.dim, fontSize: 12 },
  error: { color: colors.error },
  input: {
    borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 12,
    color: colors.text, backgroundColor: colors.card,
  },
  card: { backgroundColor: colors.card, borderRadius: 8, padding: 12, gap: 4 },
  question: { color: colors.text, fontSize: 15 },
  label: { color: colors.accent, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 },
  body: { color: colors.text, fontSize: 14 },
  mono: { color: colors.text, fontSize: 13, fontFamily: "Courier" },
  link: { color: colors.accent, fontSize: 14 },
});
