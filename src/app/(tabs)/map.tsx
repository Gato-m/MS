import {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import * as Notifications from "expo-notifications";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Alert,
  Easing,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import MapView, { Callout, Marker, Region } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Airtable } from "../../../lib/airtable";
import { ThemeText } from "../../components/ThemeText";
import { useAppTheme } from "../../theme/theme-context";
import { useThemeColors } from "../../theme/useThemeColors";

type EventFields = {
  Event?: string;
  Location?: string;
  EventType?: string;
  Date?: string;
  Time?: string;
  Lat?: number | string;
  Lon?: number | string;
  GoogleMapsLink?: string;
  Image?: unknown;
  Images?: unknown;
  image?: unknown;
  images?: unknown;
  Photo?: unknown;
  Photos?: unknown;
  photo?: unknown;
  photos?: unknown;
  [key: string]: unknown;
};

type AirtableRecord = {
  id: string;
  fields: EventFields;
};

type MarkerEvent = {
  id: string;
  title: string;
  location: string;
  eventType: string;
  date: string | undefined;
  time: string | undefined;
  latitude: number;
  longitude: number;
  googleMapsLink: string | undefined;
  imageUrl: string | null;
};

const MADONA_CENTER = {
  latitude: 56.8527,
  longitude: 26.2169,
};

const MADONA_REGION: Region = {
  ...MADONA_CENTER,
  latitudeDelta: 0.2,
  longitudeDelta: 0.2,
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

function toCoordinate(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toDateKey(dateStr?: string): string {
  if (!dateStr) return "";
  return dateStr.slice(0, 10);
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

function parseEventStart(event: MarkerEvent | null): Date | null {
  const dateKey = toDateKey(event?.date);
  if (!dateKey) return null;

  const [year, month, day] = dateKey.split("-").map(Number);
  const time = parseHoursAndMinutes(event?.time);
  if (!year || !month || !day || !time) return null;

  return new Date(year, month - 1, day, time.hours, time.minutes, 0, 0);
}

function formatEventSheetDate(dateKey: string): string {
  if (!dateKey) return "";
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return dateKey;

  return new Date(year, month - 1, day).toLocaleDateString("lv-LV", {
    day: "numeric",
    month: "long",
  });
}

function getEventImageUrl(fields: EventFields): string | null {
  const directCandidates = [
    fields.Image,
    fields.Images,
    fields.image,
    fields.images,
    fields.Photo,
    fields.Photos,
    fields.photo,
    fields.photos,
  ];

  for (const candidate of directCandidates) {
    if (typeof candidate === "string" && candidate) {
      return candidate;
    }

    if (Array.isArray(candidate)) {
      const firstItem = candidate[0] as
        | { url?: string; thumbnails?: { large?: { url?: string } } }
        | undefined;

      if (firstItem?.url) return firstItem.url;
      if (firstItem?.thumbnails?.large?.url) {
        return firstItem.thumbnails.large.url;
      }
    }
  }

  for (const value of Object.values(fields)) {
    if (!Array.isArray(value) || value.length === 0) continue;

    const firstItem = value[0] as
      | { url?: string; thumbnails?: { large?: { url?: string } } }
      | undefined;

    if (firstItem?.url) return firstItem.url;
    if (firstItem?.thumbnails?.large?.url)
      return firstItem.thumbnails.large.url;
  }

  return null;
}

function getMarkerIconName(eventType: string): keyof typeof Ionicons.glyphMap {
  const normalized = eventType.trim().toLowerCase();

  if (normalized.includes("music") || normalized.includes("koncert")) {
    return "musical-notes";
  }

  if (
    normalized.includes("sport") ||
    normalized.includes("basket") ||
    normalized.includes("football")
  ) {
    return "football";
  }

  if (
    normalized.includes("film") ||
    normalized.includes("kino") ||
    normalized.includes("movie")
  ) {
    return "film";
  }

  if (
    normalized.includes("food") ||
    normalized.includes("ēdiens") ||
    normalized.includes("market")
  ) {
    return "restaurant";
  }

  return "location";
}

function getMarkerMaterialIcon(
  eventType: string,
): keyof typeof MaterialCommunityIcons.glyphMap | null {
  const normalized = eventType.trim().toLowerCase();

  if (normalized.includes("teātr") || normalized.includes("theater")) {
    return "drama-masks";
  }

  if (normalized.includes("izstād") || normalized.includes("art")) {
    return "palette";
  }

  if (normalized.includes("bērn") || normalized.includes("family")) {
    return "baby-face-outline";
  }

  return null;
}

export default function MapScreen() {
  const [records, setRecords] = useState<AirtableRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [activeEvent, setActiveEvent] = useState<MarkerEvent | null>(null);
  const [isEventSheetVisible, setIsEventSheetVisible] = useState(false);
  const [isEventExpanded, setIsEventExpanded] = useState(false);
  const [reminderSheetMeasuredHeight, setReminderSheetMeasuredHeight] =
    useState(0);
  const [isReminderModalVisible, setIsReminderModalVisible] = useState(false);
  const [activeReminderEvent, setActiveReminderEvent] =
    useState<MarkerEvent | null>(null);
  const [savedReminderMinutes, setSavedReminderMinutes] = useState<number[]>(
    [],
  );
  const [selectedReminderMinutes, setSelectedReminderMinutes] = useState<
    number[]
  >([]);
  const [reminderActiveByEvent, setReminderActiveByEvent] = useState<
    Record<string, boolean>
  >({});

  const mapRef = useRef<MapView | null>(null);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const theme = useAppTheme();
  const fallbackColors = useThemeColors();
  const colors = theme?.colors ?? fallbackColors;

  const eventOverlayOpacity = useRef(new Animated.Value(0)).current;
  const eventSheetTranslateY = useRef(new Animated.Value(380)).current;
  const eventSheetExpandProgress = useRef(new Animated.Value(0)).current;
  const reminderOverlayOpacity = useRef(new Animated.Value(0)).current;
  const reminderSheetTranslateY = useRef(new Animated.Value(340)).current;

  const compactEventSheetHeight = Math.max(
    260,
    Math.min(windowHeight * 0.72, reminderSheetMeasuredHeight || 320),
  );
  const expandedEventSheetHeight = Math.max(
    compactEventSheetHeight + 80,
    Math.round(windowHeight * 0.92),
  );

  const animatedEventSheetHeight = eventSheetExpandProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [compactEventSheetHeight, expandedEventSheetHeight],
  });

  useEffect(() => {
    eventSheetExpandProgress.stopAnimation();
    Animated.timing(eventSheetExpandProgress, {
      toValue: isEventExpanded ? 1 : 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [eventSheetExpandProgress, isEventExpanded]);

  const openEventSheet = (event: MarkerEvent) => {
    setActiveEvent(event);
    setIsEventExpanded(false);
    setIsEventSheetVisible(true);

    eventOverlayOpacity.stopAnimation();
    eventSheetTranslateY.stopAnimation();
    eventSheetExpandProgress.stopAnimation();
    eventOverlayOpacity.setValue(0);
    eventSheetTranslateY.setValue(380);
    eventSheetExpandProgress.setValue(0);

    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.timing(eventOverlayOpacity, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(eventSheetTranslateY, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const closeEventSheet = (onClosed?: () => void) => {
    eventOverlayOpacity.stopAnimation();
    eventSheetTranslateY.stopAnimation();
    eventSheetExpandProgress.stopAnimation();

    Animated.parallel([
      Animated.timing(eventOverlayOpacity, {
        toValue: 0,
        duration: 140,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(eventSheetTranslateY, {
        toValue: 380,
        duration: 210,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) return;
      setIsEventSheetVisible(false);
      setIsEventExpanded(false);
      eventSheetExpandProgress.setValue(0);
      if (onClosed) onClosed();
    });
  };

  const inactiveEventIconColor = theme?.isDark
    ? colors.lightGray
    : colors.inactiveTint;

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

  const openReminderSheet = (eventRecord: MarkerEvent) => {
    setActiveReminderEvent(eventRecord);
    setSelectedReminderMinutes(savedReminderMinutes);
    setIsReminderModalVisible(true);

    reminderOverlayOpacity.stopAnimation();
    reminderSheetTranslateY.stopAnimation();
    reminderOverlayOpacity.setValue(0);
    reminderSheetTranslateY.setValue(340);

    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.timing(reminderOverlayOpacity, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(reminderSheetTranslateY, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const closeReminderSheet = () => {
    reminderOverlayOpacity.stopAnimation();
    reminderSheetTranslateY.stopAnimation();

    Animated.parallel([
      Animated.timing(reminderOverlayOpacity, {
        toValue: 0,
        duration: 140,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(reminderSheetTranslateY, {
        toValue: 340,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) return;
      setIsReminderModalVisible(false);
      setActiveReminderEvent(null);
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

  const ensureNotificationPermission = async () => {
    const current = await Notifications.getPermissionsAsync();
    if (
      current.granted ||
      current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
    ) {
      return true;
    }

    const requested = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: false,
        allowSound: true,
      },
    });

    return (
      requested.granted ||
      requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
    );
  };

  const submitReminder = async () => {
    if (!activeReminderEvent) return;

    const eventStart = parseEventStart(activeReminderEvent);
    if (!eventStart) {
      Alert.alert(
        "Nav laika",
        "Šim pasākumam trūkst datuma vai laika, lai iestatītu atgādinājumu.",
      );
      return;
    }

    const hasPermission = await ensureNotificationPermission();
    if (!hasPermission) {
      Alert.alert(
        "Atļauja nav piešķirta",
        "Lūdzu ieslēdz paziņojumus, lai iestatītu atgādinājumu.",
      );
      return;
    }

    const chosenMinutes = [...selectedReminderMinutes].sort((a, b) => a - b);

    setReminderStateForEvent(activeReminderEvent.id, chosenMinutes.length > 0);

    let scheduledCount = 0;
    let skippedCount = 0;

    for (const minutes of chosenMinutes) {
      const triggerDate = new Date(eventStart.getTime() - minutes * 60 * 1000);
      if (triggerDate <= new Date()) {
        skippedCount += 1;
        continue;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Atgādinājums",
          body: `${activeReminderEvent.title} sāksies pēc ${minutes} min.`,
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
    let mounted = true;

    Airtable.listEvents()
      .then((raw) => {
        if (!mounted) return;
        setRecords(raw as AirtableRecord[]);
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        setErrorText(
          error instanceof Error ? error.message : "Neizdevās ielādēt karti.",
        );
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const markerEvents = useMemo<MarkerEvent[]>(() => {
    return records.reduce<MarkerEvent[]>((acc, record) => {
      const latitude = toCoordinate(record.fields.Lat);
      const longitude = toCoordinate(record.fields.Lon);

      if (latitude === null || longitude === null) {
        return acc;
      }

      acc.push({
        id: record.id,
        title: record.fields.Event?.trim() || "Pasākums",
        location: record.fields.Location?.trim() || "Madona",
        eventType: record.fields.EventType?.trim() || "",
        date: record.fields.Date,
        time: record.fields.Time,
        latitude,
        longitude,
        googleMapsLink: record.fields.GoogleMapsLink,
        imageUrl: getEventImageUrl(record.fields),
      });

      return acc;
    }, []);
  }, [records]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    if (markerEvents.length >= 2) {
      mapRef.current.fitToCoordinates(
        markerEvents.map((event) => ({
          latitude: event.latitude,
          longitude: event.longitude,
        })),
        {
          edgePadding: {
            top: 120,
            right: 56,
            bottom: 160,
            left: 56,
          },
          animated: true,
        },
      );
      return;
    }

    if (markerEvents.length === 1) {
      mapRef.current.animateToRegion(
        {
          latitude: markerEvents[0].latitude,
          longitude: markerEvents[0].longitude,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        },
        450,
      );
      return;
    }

    mapRef.current.animateToRegion(MADONA_REGION, 450);
  }, [mapReady, markerEvents]);

  const isReminderOverEventSheet =
    isEventSheetVisible && isReminderModalVisible && !!activeEvent;

  return (
    <View style={styles.screen}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={MADONA_REGION}
        onMapReady={() => setMapReady(true)}
        mapPadding={{
          top: 96,
          right: 0,
          left: 0,
          bottom: Platform.OS === "ios" ? 118 : 108,
        }}
        loadingEnabled
        toolbarEnabled={Platform.OS === "android"}
        showsCompass
      >
        {markerEvents.map((event) => {
          const materialIcon = getMarkerMaterialIcon(event.eventType);
          return (
            <Marker
              key={event.id}
              coordinate={{
                latitude: event.latitude,
                longitude: event.longitude,
              }}
              onPress={() => openEventSheet(event)}
              tracksViewChanges={false}
            >
              <View
                style={[
                  styles.marker,
                  {
                    backgroundColor: colors.activeTint,
                    borderColor: colors.white,
                  },
                ]}
              >
                {materialIcon ? (
                  <MaterialCommunityIcons
                    name={materialIcon}
                    size={16}
                    color={colors.white}
                  />
                ) : (
                  <Ionicons
                    name={getMarkerIconName(event.eventType)}
                    size={16}
                    color={colors.white}
                  />
                )}
              </View>

              <Callout tooltip={false}>
                <View style={styles.calloutBox}>
                  <ThemeText
                    variant="subtitle"
                    style={[styles.calloutTitle, { color: colors.text }]}
                  >
                    {event.title}
                  </ThemeText>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      <View
        pointerEvents="box-none"
        style={[styles.overlay, { paddingTop: insets.top + 8 }]}
      >
        <View
          style={[
            styles.headerCard,
            {
              backgroundColor: theme?.isDark
                ? "rgba(59, 59, 59, 0.9)"
                : "rgba(255, 255, 255, 0.9)",
              borderColor: colors.inactiveTint,
            },
          ]}
        >
          <ThemeText variant="title" style={styles.screenTitle}>
            Karte
          </ThemeText>
          <ThemeText
            variant="caption"
            style={[styles.metaText, { color: colors.gray }]}
          >
            {markerEvents.length} pasākumu vietas Madonā
          </ThemeText>
        </View>

        {loading ? (
          <View
            style={[styles.statusCard, { backgroundColor: colors.wrapper }]}
          >
            <ActivityIndicator color={colors.activeTint} />
            <ThemeText
              variant="caption"
              style={[styles.metaText, { color: colors.gray }]}
            >
              Ielādējam pasākumu vietas...
            </ThemeText>
          </View>
        ) : null}

        {!loading && errorText ? (
          <View
            style={[styles.statusCard, { backgroundColor: colors.wrapper }]}
          >
            <ThemeText
              variant="caption"
              style={[styles.metaText, { color: colors.activeTint }]}
            >
              {errorText}
            </ThemeText>
          </View>
        ) : null}
      </View>

      <View
        pointerEvents="box-none"
        style={[
          styles.recenterWrap,
          { bottom: Platform.OS === "ios" ? 128 : 120 },
        ]}
      >
        <Pressable
          onPress={() => {
            if (!mapRef.current) return;

            if (markerEvents.length > 1) {
              mapRef.current.fitToCoordinates(
                markerEvents.map((event) => ({
                  latitude: event.latitude,
                  longitude: event.longitude,
                })),
                {
                  edgePadding: {
                    top: 120,
                    right: 56,
                    bottom: 170,
                    left: 56,
                  },
                  animated: true,
                },
              );
              return;
            }

            if (markerEvents.length === 1) {
              mapRef.current.animateToRegion(
                {
                  latitude: markerEvents[0].latitude,
                  longitude: markerEvents[0].longitude,
                  latitudeDelta: 0.03,
                  longitudeDelta: 0.03,
                },
                450,
              );
              return;
            }

            mapRef.current.animateToRegion(MADONA_REGION, 450);
          }}
          style={[
            styles.recenterButton,
            {
              backgroundColor: colors.activeTint,
              borderColor: colors.white,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Centrēt karti"
        >
          <Ionicons name="locate" size={20} color={colors.white} />
        </Pressable>
      </View>

      <Modal
        animationType="none"
        transparent
        visible={isEventSheetVisible}
        onRequestClose={() => {
          closeEventSheet(() => setActiveEvent(null));
        }}
      >
        <View style={styles.sheetRoot}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => {
              closeEventSheet(() => setActiveEvent(null));
            }}
          >
            <Animated.View
              style={[styles.sheetBackdrop, { opacity: eventOverlayOpacity }]}
            />
          </Pressable>

          <Animated.View
            style={[
              styles.eventSheetAnimatedWrap,
              { transform: [{ translateY: eventSheetTranslateY }] },
            ]}
          >
            <Animated.View
              style={[
                styles.eventSheetContainer,
                {
                  height: animatedEventSheetHeight,
                  backgroundColor: colors.wrapper,
                  borderColor: colors.inactiveTint,
                },
              ]}
            >
              <View style={styles.eventSheetDragArea}>
                <View
                  style={[
                    styles.eventSheetDragHandle,
                    { backgroundColor: colors.inactiveTint },
                  ]}
                />
              </View>

              <ScrollView
                bounces={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.eventSheetScrollContent}
              >
                {isEventExpanded && activeEvent?.imageUrl ? (
                  <View style={styles.eventSheetImageCard}>
                    <ExpoImage
                      source={{ uri: activeEvent.imageUrl }}
                      style={styles.eventSheetImage}
                      contentFit="cover"
                    />

                    <Pressable
                      onPress={() => {
                        closeEventSheet(() => setActiveEvent(null));
                      }}
                      hitSlop={8}
                      style={[
                        styles.eventSheetClose,
                        { backgroundColor: colors.wrapper + "E6" },
                      ]}
                    >
                      <Ionicons
                        name="close"
                        size={22}
                        color={colors.inactiveTint}
                      />
                    </Pressable>
                  </View>
                ) : null}

                <Pressable
                  onPress={() => {
                    closeEventSheet(() => setActiveEvent(null));
                  }}
                  hitSlop={8}
                  style={[
                    isEventExpanded && activeEvent?.imageUrl
                      ? styles.hiddenCloseButton
                      : styles.eventSheetClose,
                    !isEventExpanded ? styles.eventSheetCloseCompact : null,
                    { backgroundColor: colors.wrapper + "E6" },
                  ]}
                >
                  <Ionicons
                    name="close"
                    size={22}
                    color={colors.inactiveTint}
                  />
                </Pressable>

                {!isEventExpanded && !activeEvent?.imageUrl ? (
                  <Pressable
                    onPress={() => {
                      closeEventSheet(() => setActiveEvent(null));
                    }}
                    hitSlop={8}
                    style={[
                      styles.eventSheetCloseFallback,
                      styles.eventSheetCloseCompact,
                      { backgroundColor: colors.wrapper + "E6" },
                    ]}
                  >
                    <Ionicons
                      name="close"
                      size={22}
                      color={colors.inactiveTint}
                    />
                  </Pressable>
                ) : null}

                <View style={styles.eventSheetBody}>
                  {isEventExpanded ? (
                    <View style={styles.cardBottomRow}>
                      <View style={styles.eventSheetChipsRow}>
                        {toDateKey(activeEvent?.date) ? (
                          <View
                            style={[
                              styles.timeChip,
                              { backgroundColor: colors.activeTint },
                            ]}
                          >
                            <ThemeText
                              variant="caption"
                              style={[
                                styles.timeChipText,
                                { color: colors.white },
                              ]}
                            >
                              {formatEventSheetDate(
                                toDateKey(activeEvent?.date),
                              )}
                            </ThemeText>
                          </View>
                        ) : null}

                        {activeEvent?.time ? (
                          <View
                            style={[
                              styles.timeChip,
                              { backgroundColor: colors.activeTint },
                            ]}
                          >
                            <ThemeText
                              variant="caption"
                              style={[
                                styles.timeChipText,
                                { color: colors.white },
                              ]}
                            >
                              {activeEvent.time}
                            </ThemeText>
                          </View>
                        ) : null}
                      </View>

                      <View style={styles.cardIcons}>
                        <Pressable
                          onPress={() => {
                            if (!activeEvent) return;
                            openReminderSheet(activeEvent);
                          }}
                          hitSlop={8}
                          style={[
                            styles.iconBtn,
                            activeEvent &&
                              reminderActiveByEvent[activeEvent.id] && [
                                styles.iconBtnActive,
                                { backgroundColor: colors.activeTint },
                              ],
                          ]}
                        >
                          <MaterialIcons
                            name="alarm"
                            size={24}
                            color={
                              activeEvent &&
                              reminderActiveByEvent[activeEvent.id]
                                ? colors.white
                                : inactiveEventIconColor
                            }
                          />
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.cardBottomRow}>
                      <View style={styles.eventSheetChipsRow}>
                        {toDateKey(activeEvent?.date) ? (
                          <View
                            style={[
                              styles.timeChip,
                              { backgroundColor: colors.activeTint },
                            ]}
                          >
                            <ThemeText
                              variant="caption"
                              style={[
                                styles.timeChipText,
                                { color: colors.white },
                              ]}
                            >
                              {formatEventSheetDate(
                                toDateKey(activeEvent?.date),
                              )}
                            </ThemeText>
                          </View>
                        ) : null}

                        {activeEvent?.time ? (
                          <View
                            style={[
                              styles.timeChip,
                              { backgroundColor: colors.activeTint },
                            ]}
                          >
                            <ThemeText
                              variant="caption"
                              style={[
                                styles.timeChipText,
                                { color: colors.white },
                              ]}
                            >
                              {activeEvent.time}
                            </ThemeText>
                          </View>
                        ) : null}
                      </View>

                      <View style={styles.cardIcons}>
                        <Pressable
                          onPress={() => {
                            if (!activeEvent) return;
                            openReminderSheet(activeEvent);
                          }}
                          hitSlop={8}
                          style={[
                            styles.iconBtn,
                            activeEvent &&
                              reminderActiveByEvent[activeEvent.id] && [
                                styles.iconBtnActive,
                                { backgroundColor: colors.activeTint },
                              ],
                          ]}
                        >
                          <MaterialIcons
                            name="alarm"
                            size={24}
                            color={
                              activeEvent &&
                              reminderActiveByEvent[activeEvent.id]
                                ? colors.white
                                : inactiveEventIconColor
                            }
                          />
                        </Pressable>
                      </View>
                    </View>
                  )}

                  <ThemeText
                    variant="subtitle"
                    style={[styles.eventSheetTitle, { color: colors.text }]}
                  >
                    {activeEvent?.title ?? "Pasākums"}
                  </ThemeText>

                  <ThemeText
                    variant="caption"
                    style={[
                      styles.eventSheetLocation,
                      {
                        color: theme?.isDark
                          ? colors.white
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    {activeEvent?.location ?? "Madona"}
                  </ThemeText>

                  {!isEventExpanded ? (
                    <View style={styles.eventSheetActions}>
                      <Pressable
                        onPress={() => setIsEventExpanded(true)}
                        style={[
                          styles.eventActionButton,
                          {
                            backgroundColor: colors.activeTint,
                            borderColor: colors.activeTint,
                          },
                        ]}
                      >
                        <Ionicons
                          name="information-circle-outline"
                          size={18}
                          color={colors.white}
                        />
                        <ThemeText
                          variant="caption"
                          style={[
                            styles.eventActionText,
                            { color: colors.white },
                          ]}
                        >
                          Vairāk
                        </ThemeText>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              </ScrollView>
            </Animated.View>
          </Animated.View>

          {isReminderOverEventSheet ? (
            <View style={styles.inlineReminderLayer}>
              <Pressable
                style={StyleSheet.absoluteFillObject}
                onPress={closeReminderSheet}
              >
                <Animated.View
                  style={[
                    styles.sheetBackdrop,
                    { opacity: reminderOverlayOpacity },
                  ]}
                />
              </Pressable>

              <Animated.View
                onLayout={(event) => {
                  const nextHeight = Math.ceil(event.nativeEvent.layout.height);
                  setReminderSheetMeasuredHeight((prev) =>
                    Math.abs(prev - nextHeight) < 2 ? prev : nextHeight,
                  );
                }}
                style={[
                  styles.reminderSheetContainer,
                  {
                    backgroundColor: colors.wrapper,
                    borderColor: colors.inactiveTint,
                    transform: [{ translateY: reminderSheetTranslateY }],
                  },
                ]}
              >
                <View style={styles.reminderSheetDragArea}>
                  <View
                    style={[
                      styles.eventSheetDragHandle,
                      { backgroundColor: colors.inactiveTint },
                    ]}
                  />
                </View>

                <View style={styles.sheetHeader}>
                  <ThemeText
                    variant="subtitle"
                    style={[styles.sheetTitle, { color: colors.activeTint }]}
                  >
                    Atgādinājums
                  </ThemeText>

                  <Pressable onPress={closeReminderSheet} hitSlop={8}>
                    <Ionicons
                      name="close"
                      size={24}
                      color={colors.inactiveTint}
                    />
                  </Pressable>
                </View>

                <View style={styles.sheetTextBlock}>
                  <ThemeText
                    style={[styles.sheetEventTitle, { color: colors.text }]}
                  >
                    {activeReminderEvent?.title ?? "Pasākums"}
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
                            borderColor: selected
                              ? colors.activeTint
                              : colors.gray,
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
          ) : null}
        </View>
      </Modal>

      <Modal
        animationType="none"
        transparent
        visible={isReminderModalVisible && !isReminderOverEventSheet}
        onRequestClose={closeReminderSheet}
      >
        <View style={styles.sheetRoot}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={closeReminderSheet}
          >
            <Animated.View
              style={[
                styles.sheetBackdrop,
                { opacity: reminderOverlayOpacity },
              ]}
            />
          </Pressable>

          <Animated.View
            onLayout={(event) => {
              const nextHeight = Math.ceil(event.nativeEvent.layout.height);
              setReminderSheetMeasuredHeight((prev) =>
                Math.abs(prev - nextHeight) < 2 ? prev : nextHeight,
              );
            }}
            style={[
              styles.reminderSheetContainer,
              {
                backgroundColor: colors.wrapper,
                borderColor: colors.inactiveTint,
                transform: [{ translateY: reminderSheetTranslateY }],
              },
            ]}
          >
            <View style={styles.reminderSheetDragArea}>
              <View
                style={[
                  styles.eventSheetDragHandle,
                  { backgroundColor: colors.inactiveTint },
                ]}
              />
            </View>

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
                {activeReminderEvent?.title ?? "Pasākums"}
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
  overlay: {
    position: "absolute",
    top: 0,
    right: 16,
    left: 16,
    gap: 10,
  },
  headerCard: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 190,
  },
  screenTitle: {
    marginBottom: 0,
  },
  metaText: {
    marginVertical: 0,
    textAlign: "left",
  },
  statusCard: {
    alignSelf: "flex-start",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  marker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  calloutBox: {
    minWidth: 120,
    maxWidth: 260,
    paddingVertical: 4,
  },
  calloutTitle: {
    textAlign: "left",
    marginBottom: 0,
  },
  recenterWrap: {
    position: "absolute",
    right: 16,
  },
  recenterButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  sheetRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.34)",
  },
  eventSheetContainer: {
    maxHeight: "72%",
    width: "100%",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    overflow: "hidden",
  },
  eventSheetAnimatedWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  eventDetailSheetContainer: {
    maxHeight: "92%",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    overflow: "hidden",
  },
  eventSheetDragArea: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 2,
  },
  eventSheetDragHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    opacity: 0.7,
  },
  eventSheetScrollContent: {
    paddingHorizontal: 26,
    paddingTop: 12,
    paddingBottom: 26,
  },
  eventSheetClose: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  hiddenCloseButton: {
    display: "none",
  },
  eventSheetCloseFallback: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  eventSheetCloseCompact: {
    top: 6,
    right: 25,
  },
  eventSheetImageCard: {
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
  },
  eventSheetImage: {
    width: "100%",
    height: 220,
    borderRadius: 18,
  },
  eventSheetBody: {
    paddingTop: 22,
    gap: 12,
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
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
  eventSheetChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
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
  eventSheetTitle: {
    textAlign: "left",
    marginBottom: 0,
  },
  eventSheetLocation: {
    marginVertical: 0,
    textAlign: "left",
  },
  eventSheetActions: {
    marginTop: 4,
  },
  eventActionButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  eventActionText: {
    marginVertical: 0,
    fontWeight: "700",
  },
  reminderSheetContainer: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    paddingHorizontal: 26,
    paddingVertical: 30,
    gap: 12,
  },
  reminderSheetDragArea: {
    alignItems: "center",
    marginTop: -14,
    marginBottom: 4,
  },
  inlineReminderLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    zIndex: 30,
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
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetButtonText: {
    marginVertical: 0,
    fontWeight: "700",
    fontSize: 14,
  },
});
