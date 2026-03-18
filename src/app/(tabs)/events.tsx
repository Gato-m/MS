import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { useEffect, useRef, useState } from "react";
import { Linking } from "react-native";
import {
  ActivityIndicator,
  Animated,
  Alert,
  Easing,
  FlatList,
  Modal,
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

const REMINDER_OPTIONS = [15, 30] as const;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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

function parseHoursAndMinutes(
  timeStr?: string,
): { hours: number; minutes: number } | null {
  if (!timeStr) return null;

  const match = timeStr.trim().match(/(\d{1,2})[:.](\d{2})/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return { hours, minutes };
}

function parseEventStart(fields: EventFields): Date | null {
  const dateKey = toDateKey(fields.Date);
  if (!dateKey) return null;

  const [year, month, day] = dateKey.split("-").map(Number);
  const time = parseHoursAndMinutes(fields.Time);
  if (!year || !month || !day || !time) return null;

  return new Date(year, month - 1, day, time.hours, time.minutes, 0, 0);
}

// ─────────────────────────────────────────────────────────────────────────────

export default function EventsScreen() {
  const [records, setRecords] = useState<AirtableRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isReminderModalVisible, setIsReminderModalVisible] = useState(false);
  const [sheetHeight, setSheetHeight] = useState(0);
  const [activeReminderEvent, setActiveReminderEvent] =
    useState<AirtableRecord | null>(null);
  const [reminderActiveByEvent, setReminderActiveByEvent] = useState<
    Record<string, boolean>
  >({});
  const [savedReminderMinutes, setSavedReminderMinutes] = useState<number[]>(
    [],
  );
  const [selectedReminderMinutes, setSelectedReminderMinutes] = useState<
    number[]
  >([]);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(320)).current;

  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const fallback = useThemeColors();
  const colors = theme?.colors ?? fallback;
  const inactiveEventIconColor = theme?.isDark
    ? colors.lightGray
    : colors.inactiveTint;
  const hiddenSheetOffset = Math.max(sheetHeight + 24, 320);

  const setReminderStateForEvent = (eventId: string, isActive: boolean) => {
    setReminderActiveByEvent((prev) => {
      if (!isActive && !prev[eventId]) {
        return prev;
      }

      if (!isActive) {
        const next = { ...prev };
        delete next[eventId];
        return next;
      }

      return { ...prev, [eventId]: true };
    });
  };

  const closeReminderSheet = () => {
    overlayOpacity.stopAnimation();
    sheetTranslateY.stopAnimation();

    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 140,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: hiddenSheetOffset,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setIsReminderModalVisible(false);
        setActiveReminderEvent(null);
        overlayOpacity.setValue(0);
        sheetTranslateY.setValue(hiddenSheetOffset);
      }
    });
  };

  const openReminderSheet = (eventRecord: AirtableRecord) => {
    setIsReminderModalVisible(true);
    setActiveReminderEvent(eventRecord);
    setSelectedReminderMinutes(savedReminderMinutes);

    overlayOpacity.stopAnimation();
    sheetTranslateY.stopAnimation();
    overlayOpacity.setValue(0);
    sheetTranslateY.setValue(hiddenSheetOffset);

    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: 0,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const cancelReminderSheet = () => {
    if (activeReminderEvent) {
      setReminderStateForEvent(activeReminderEvent.id, false);
    }
    setSavedReminderMinutes([]);
    setSelectedReminderMinutes([]);
    closeReminderSheet();
  };

  const toggleReminderMinute = (minutes: number) => {
    setSelectedReminderMinutes((prev) => {
      const next = prev.includes(minutes)
        ? prev.filter((value) => value !== minutes)
        : [...prev, minutes].sort((a, b) => a - b);

      if (activeReminderEvent) {
        setReminderStateForEvent(activeReminderEvent.id, next.length > 0);
      }

      return next;
    });
  };

  const ensureNotificationPermission = async () => {
    const current = await Notifications.getPermissionsAsync();
    let finalStatus = current.status;

    if (finalStatus !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      finalStatus = requested.status;
    }

    if (finalStatus !== "granted") {
      Alert.alert(
        "Atļauja nepieciešama",
        "Lai iestatītu atgādinājumu, lūdzu atļauj paziņojumus ierīces iestatījumos.",
      );
      return false;
    }

    return true;
  };

  const submitReminder = async () => {
    if (!activeReminderEvent) return;

    if (selectedReminderMinutes.length === 0) {
      Alert.alert("Izvēlies laiku", "Atzīmē vismaz vienu atgādinājuma laiku.");
      return;
    }

    const eventStart = parseEventStart(activeReminderEvent.fields);
    if (!eventStart) {
      Alert.alert(
        "Nav iespējams iestatīt",
        "Šim pasākumam nav korekta datuma vai laika.",
      );
      return;
    }

    const hasPermission = await ensureNotificationPermission();
    if (!hasPermission) return;

    let scheduledCount = 0;
    let skippedCount = 0;
    const eventName = activeReminderEvent.fields.Event ?? "Pasākums";
    const chosenMinutes = [...selectedReminderMinutes].sort((a, b) => a - b);

    setReminderStateForEvent(activeReminderEvent.id, chosenMinutes.length > 0);

    for (const minutes of chosenMinutes) {
      const triggerDate = new Date(eventStart.getTime() - minutes * 60 * 1000);
      if (triggerDate <= new Date()) {
        skippedCount += 1;
        continue;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Atgādinājums",
          body: `${eventName} sāksies pēc ${minutes} min.`,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });

      scheduledCount += 1;
    }

    setSavedReminderMinutes(chosenMinutes);

    closeReminderSheet();

    if (scheduledCount === 0) {
      Alert.alert(
        "Laiks jau pagājis",
        "Izvēlētie atgādinājuma laiki šim pasākumam vairs nav pieejami.",
      );
      return;
    }

    if (skippedCount > 0) {
      Alert.alert(
        "Atgādinājums iestatīts daļēji",
        "Daļa izvēlēto laiku jau bija pagājusi, tāpēc iestatījām tikai atlikušos.",
      );
      return;
    }

    Alert.alert("Gatavs", "Atgādinājums iestatīts.");
  };

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
    <View
      style={[styles.screen, { paddingTop: insets.top, paddingHorizontal: 25 }]}
    >
      {/* Screen title */}
      <ThemeText variant="title" style={styles.screenTitle}>
        Pasākumi
      </ThemeText>

      {/* Date chips */}
      <View style={styles.chipsScroll}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
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
                    borderColor: active
                      ? colors.activeTint
                      : theme?.isDark
                        ? colors.white
                        : colors.gray,
                  },
                ]}
              >
                <ThemeText
                  variant="caption"
                  style={[
                    styles.dateChipText,
                    {
                      color: active
                        ? colors.white
                        : theme?.isDark
                          ? colors.white
                          : colors.gray,
                    },
                  ]}
                >
                  {formatChipDate(date)}
                </ThemeText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

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
          style={styles.flatList}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <ThemeText variant="body" style={styles.empty}>
              Nav pasākumu šajā datumā.
            </ThemeText>
          }
          renderItem={({ item }) => (
            <ThemeCard onPress={() => {}}>
              <View style={styles.cardBody}>
                {/* Top row: time chip left · icons right */}
                <View style={styles.cardBottomRow}>
                  {item.fields.Time ? (
                    <View
                      style={[
                        styles.timeChip,
                        { backgroundColor: colors.activeTint },
                      ]}
                    >
                      <ThemeText
                        variant="caption"
                        style={[styles.timeChipText, { color: colors.white }]}
                      >
                        {item.fields.Time}
                      </ThemeText>
                    </View>
                  ) : (
                    <View />
                  )}

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
                        color={inactiveEventIconColor}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => openReminderSheet(item)}
                      hitSlop={8}
                      style={[
                        styles.iconBtn,
                        reminderActiveByEvent[item.id] && [
                          styles.iconBtnActive,
                          { backgroundColor: colors.activeTint },
                        ],
                      ]}
                    >
                      <MaterialIcons
                        name="alarm"
                        size={24}
                        color={
                          reminderActiveByEvent[item.id]
                            ? colors.white
                            : inactiveEventIconColor
                        }
                      />
                    </Pressable>
                  </View>
                </View>

                {/* Title + place */}
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
                      {
                        color: theme?.isDark
                          ? colors.white
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    {item.fields.Location}
                  </ThemeText>
                ) : null}
              </View>
            </ThemeCard>
          )}
        />
      )}
      <Modal
        animationType="none"
        transparent
        visible={isReminderModalVisible}
        onRequestClose={closeReminderSheet}
      >
        <View style={styles.sheetRoot}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={closeReminderSheet}
          >
            <Animated.View
              style={[styles.sheetBackdrop, { opacity: overlayOpacity }]}
            />
          </Pressable>

          <Animated.View
            onLayout={(event) => {
              const nextHeight = event.nativeEvent.layout.height;
              if (nextHeight > 0 && nextHeight !== sheetHeight) {
                setSheetHeight(nextHeight);
              }
            }}
            style={[
              styles.sheetContainer,
              {
                marginBottom: 0,
                backgroundColor: colors.wrapper,
                borderColor: colors.inactiveTint,
                transform: [{ translateY: sheetTranslateY }],
              },
            ]}
          >
            <View style={styles.sheetHeader}>
              <ThemeText
                variant="subtitle"
                style={[styles.sheetTitle, { color: colors.activeTint }]}
              >
                Atgādinājums
              </ThemeText>

              <Pressable onPress={closeReminderSheet} hitSlop={8}>
                <Ionicons name="close" size={24} color={colors.inactiveTint} />
              </Pressable>
            </View>

            <View style={styles.sheetTextBlock}>
              <ThemeText
                style={[styles.sheetEventTitle, { color: colors.text }]}
              >
                {activeReminderEvent?.fields.Event ?? "Pasākums"}
              </ThemeText>

              <ThemeText
                variant="body"
                style={[styles.sheetPrompt, { color: colors.text }]}
              >
                Rādīt atgādinājumu, ka pasākums sāksies pēc:
              </ThemeText>
            </View>

            <View style={styles.checkboxRow}>
              {REMINDER_OPTIONS.map((minutes) => {
                const selected = selectedReminderMinutes.includes(minutes);
                return (
                  <Pressable
                    key={minutes}
                    onPress={() => toggleReminderMinute(minutes)}
                    style={[
                      styles.checkboxOption,
                      {
                        borderColor: selected ? colors.activeTint : colors.gray,
                        backgroundColor: selected
                          ? colors.activeTint
                          : "transparent",
                      },
                    ]}
                  >
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={selected ? colors.white : colors.gray}
                    />
                    <ThemeText
                      variant="caption"
                      style={[
                        styles.checkboxLabel,
                        {
                          color: selected ? colors.white : colors.gray,
                        },
                      ]}
                    >
                      {minutes} min
                    </ThemeText>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.sheetButtonsRow}>
              <Pressable
                onPress={cancelReminderSheet}
                style={[
                  styles.sheetButton,
                  {
                    borderColor: colors.inactiveTint,
                    backgroundColor: "transparent",
                  },
                ]}
              >
                <ThemeText
                  variant="caption"
                  style={[styles.sheetButtonText, { color: colors.gray }]}
                >
                  Atcelt
                </ThemeText>
              </Pressable>

              <Pressable
                onPress={submitReminder}
                style={[
                  styles.sheetButton,
                  {
                    borderColor: colors.activeTint,
                    backgroundColor: colors.activeTint,
                  },
                ]}
              >
                <ThemeText
                  variant="caption"
                  style={[styles.sheetButtonText, { color: colors.white }]}
                >
                  Apstiprināt
                </ThemeText>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  screenTitle: {
    textAlign: "left",
    marginBottom: 16,
    marginTop: 30,
  },
  // ── Date chips ──
  chipsScroll: {
    paddingVertical: 0,
    marginBottom: 10,
  },
  chipsRow: {
    flexDirection: "row",
    gap: 8,
    paddingLeft: 0,
    marginBottom: 10,
  },
  dateChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 3,
  },
  dateChipText: {
    textAlign: "center",
    fontWeight: "700",
  },
  // ── List ──
  flatList: {
    paddingLeft: 0,
    paddingHorizontal: 0,
  },
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
  cardBody: {
    gap: 4,
    paddingHorizontal: 0,
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  timeChip: {
    alignSelf: "flex-start",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 1,
  },
  timeChipText: {
    textAlign: "left",
    fontWeight: "700",
  },
  eventTitle: {
    textAlign: "left",
    marginBottom: 0,
    marginTop: 2,
  },
  eventPlace: {
    textAlign: "left",
    marginTop: 0,
  },
  cardIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    padding: 4,
  },
  iconBtnActive: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.34)",
  },
  sheetContainer: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    paddingHorizontal: 26,
    paddingVertical: 30,
    gap: 12,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: {
    textAlign: "left",
    marginBottom: 0,
    fontSize: 22,
    fontWeight: "700",
  },
  sheetTextBlock: {
    gap: 4,
    fontSize: 16,
  },
  sheetPrompt: {
    textAlign: "left",
    marginVertical: 0,
    fontSize: 14,
  },
  sheetEventTitle: {
    textAlign: "left",
    fontWeight: "700",
    fontSize: 17,
    marginVertical: 0,
    marginBottom: 0,
  },
  checkboxRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
    marginTop: 4,
  },
  checkboxOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  checkboxLabel: {
    marginVertical: 0,
    fontWeight: "700",
  },
  sheetButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: "auto",
  },
  sheetButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
  },
  sheetButtonText: {
    marginVertical: 0,
    fontSize: 13,
    fontWeight: "700",
  },
});
