import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Linking } from "react-native";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Airtable } from "../../../lib/airtable";
import { ThemeCard } from "../../components/ThemeCard";
import { ThemeText } from "../../components/ThemeText";
import { useAppTheme } from "../../theme/theme-context";
import { useThemeColors } from "../../theme/useThemeColors";

// ── Airtable field names for the ms99 table ─────────────────────────────────
type EventFields = {
  ID?: string;
  Date?: string;
  Time?: string;
  Event?: string;
  Location?: string;
  EventType?: string;
  Lat?: number;
  Lon?: number;
  GoogleMapsLink?: string;
};

type AirtableRecord = {
  id: string;
  fields: EventFields;
};

function toDateKey(dateStr?: string): string {
  if (!dateStr) return "";
  // Airtable returns ISO "2025-06-05" or "2025-06-05T00:00:00.000Z"
  return dateStr.slice(0, 10); // "YYYY-MM-DD"
}

function formatChipDate(dateKey: string): string {
  if (!dateKey) return "";
  // Parse parts explicitly to avoid timezone shifting
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return dateKey;
  const d = new Date(year, month - 1, day);
  return d
    .toLocaleDateString("lv-LV", { day: "numeric", month: "long" })
    .toUpperCase();
}

// ─────────────────────────────────────────────────────────────────────────────

export default function EventsScreen() {
  const [records, setRecords] = useState<AirtableRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>("");

  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const fallback = useThemeColors();
  const colors = theme?.colors ?? fallback;

  useEffect(() => {
    Airtable.listEvents()
      .then((raw) => {
        const typed = raw as AirtableRecord[];
        setRecords(typed);
        const firstDate = toDateKey(typed[0]?.fields?.Date);
        if (firstDate) setSelectedDate(firstDate);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Unique, sorted date keys
  const dates = [
    ...new Set(records.map((r) => toDateKey(r.fields.Date)).filter(Boolean)),
  ].sort();

  const filtered = selectedDate
    ? records.filter((r) => toDateKey(r.fields.Date) === selectedDate)
    : records;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 16 }]}>
      {/* Screen title */}
      <ThemeText variant="title" style={styles.screenTitle}>
        Pasākumi
      </ThemeText>

      {/* Date chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        style={styles.chipsScroll}
      >
        {dates.map((date) => {
          const active = selectedDate === date;
          return (
            <Pressable
              key={date}
              onPress={() => setSelectedDate(date)}
              style={[
                styles.dateChip,
                {
                  backgroundColor: active ? colors.activeTint : "transparent",
                  borderColor: active ? colors.activeTint : colors.inactiveTint,
                },
              ]}
            >
              <ThemeText
                variant="caption"
                style={{
                  color: active ? "#FFFFFF" : colors.textSecondary,
                  textAlign: "center",
                }}
              >
                {formatChipDate(date)}
              </ThemeText>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Events list */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.activeTint}
          style={styles.loader}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <ThemeText variant="body" style={styles.empty}>
              Nav pasākumu šajā datumā.
            </ThemeText>
          }
          renderItem={({ item }) => (
            <ThemeCard onPress={() => {}}>
              <View style={styles.cardRow}>
                {/* Left: time chip + title + place */}
                <View style={styles.cardLeft}>
                  {item.fields.Time ? (
                    <View
                      style={[
                        styles.timeChip,
                        { backgroundColor: colors.activeTint + "28" },
                      ]}
                    >
                      <ThemeText
                        variant="caption"
                        style={[
                          styles.timeChipText,
                          { color: colors.activeTint },
                        ]}
                      >
                        {item.fields.Time}
                      </ThemeText>
                    </View>
                  ) : null}

                  <ThemeText
                    variant="subtitle"
                    style={[styles.eventTitle, { color: colors.text }]}
                  >
                    {item.fields.Event ?? ""}
                  </ThemeText>

                  {item.fields.Location ? (
                    <ThemeText
                      variant="caption"
                      style={[
                        styles.eventPlace,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {item.fields.Location}
                    </ThemeText>
                  ) : null}
                </View>

                {/* Right: map + time icons */}
                <View style={styles.cardIcons}>
                  <Pressable
                    onPress={() => {
                      const url = item.fields.GoogleMapsLink;
                      if (url) Linking.openURL(url);
                    }}
                    hitSlop={8}
                    style={styles.iconBtn}
                  >
                    <Ionicons
                      name="map-outline"
                      size={22}
                      color={
                        item.fields.GoogleMapsLink
                          ? colors.activeTint
                          : colors.inactiveTint
                      }
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => {}}
                    hitSlop={8}
                    style={styles.iconBtn}
                  >
                    <Ionicons
                      name="time-outline"
                      size={22}
                      color={colors.inactiveTint}
                    />
                  </Pressable>
                </View>
              </View>
            </ThemeCard>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 16,
  },
  screenTitle: {
    textAlign: "left",
    marginBottom: 12,
  },
  // ── Date chips ──
  chipsScroll: {
    flexGrow: 0,
    marginBottom: 14,
  },
  chipsRow: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 16,
  },
  dateChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  // ── List ──
  loader: {
    marginTop: 48,
  },
  list: {
    paddingBottom: 32,
  },
  empty: {
    textAlign: "center",
    marginTop: 48,
  },
  // ── Card internals ──
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardLeft: {
    flex: 1,
    gap: 4,
  },
  timeChip: {
    alignSelf: "flex-start",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 2,
  },
  timeChipText: {
    textAlign: "left",
  },
  eventTitle: {
    textAlign: "left",
    marginBottom: 0,
  },
  eventPlace: {
    textAlign: "left",
  },
  cardIcons: {
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    paddingLeft: 14,
  },
  iconBtn: {
    padding: 4,
  },
});
