import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  Animated,
} from "react-native";
import { UserRole } from "../types/role";
import { useCompleteProfile } from "../hooks/useCompleteProfile";
import { PhotoPicker } from "../components/profile/PhotoPicker";
import { DniPhotoPicker } from "../components/profile/DniPhotoPicker";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
} from "../theme/tokens";

export interface CompleteProfileScreenProps {
  role: UserRole;
  onProfileCompleted: () => void;
  onGoBack: () => void;
}

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
const DAY_LABELS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];

const MIN_YEAR = new Date().getFullYear() - 100;
const CELL_HEIGHT = 44;
const GRID_ROWS = 7; // 1 header + 6 max week rows
const GRID_FIXED_HEIGHT = GRID_ROWS * CELL_HEIGHT;

function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function getMaxDate(): Date {
  const now = new Date();
  now.setFullYear(now.getFullYear() - 13);
  return now;
}

function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

/* ─── CalendarGrid ─── */
interface CalendarGridProps {
  year: number;
  month: number;
  selectedDate: Date | null;
  maxDate: Date;
  onSelect: (date: Date) => void;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({
  year,
  month,
  selectedDate,
  maxDate,
  onSelect,
}) => {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const rows = useMemo(() => {
    const allCells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) allCells.push(null);
    for (let d = 1; d <= daysInMonth; d++) allCells.push(d);
    while (allCells.length % 7 !== 0) allCells.push(null);

    const result: (number | null)[][] = [];
    for (let i = 0; i < allCells.length; i += 7) {
      result.push(allCells.slice(i, i + 7));
    }
    return result;
  }, [firstDay, daysInMonth]);

  return (
    <View style={[calStyles.grid, { height: GRID_FIXED_HEIGHT }]}>
      <View style={calStyles.row}>
        {DAY_LABELS.map((label) => (
          <View key={label} style={calStyles.cell}>
            <Text style={calStyles.dayLabel}>{label}</Text>
          </View>
        ))}
      </View>
      {rows.map((row, rowIdx) => (
        <View key={rowIdx} style={calStyles.row}>
          {row.map((day, cellIdx) => {
            if (day === null)
              return (
                <View
                  key={`empty-${rowIdx}-${cellIdx}`}
                  style={calStyles.cell}
                />
              );
            const date = new Date(year, month, day);
            const isFuture = date > maxDate;
            const isSelected =
              selectedDate &&
              selectedDate.getDate() === day &&
              selectedDate.getMonth() === month &&
              selectedDate.getFullYear() === year;
            return (
              <TouchableOpacity
                key={day}
                style={[calStyles.cell, isSelected && calStyles.cellSelected]}
                onPress={() => !isFuture && onSelect(date)}
                disabled={isFuture}
                activeOpacity={0.6}
              >
                <Text
                  style={[
                    calStyles.dayText,
                    isSelected && calStyles.dayTextSelected,
                    isFuture && calStyles.dayTextDisabled,
                  ]}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
};

/* ─── YearPicker ─── */
interface YearPickerProps {
  selectedYear: number;
  maxYear: number;
  onSelect: (year: number) => void;
}

const YearPicker: React.FC<YearPickerProps> = ({
  selectedYear,
  maxYear,
  onSelect,
}) => {
  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = maxYear; y >= MIN_YEAR; y--) arr.push(y);
    return arr;
  }, [maxYear]);

  const flatListRef = useRef<FlatList<number>>(null);

  useEffect(() => {
    const idx = years.indexOf(selectedYear);
    if (idx >= 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: idx, animated: false });
      }, 100);
    }
  }, [selectedYear, years]);

  return (
    <View style={yearStyles.container}>
      <Text style={yearStyles.title}>Seleccionar año</Text>
      <FlatList
        ref={flatListRef}
        data={years}
        keyExtractor={(item) => String(item)}
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, index) => ({
          length: yearStyles.yearItem.height,
          offset: yearStyles.yearItem.height * index,
          index,
        })}
        renderItem={({ item: y }) => {
          const isActive = y === selectedYear;
          return (
            <TouchableOpacity
              style={[
                yearStyles.yearItem,
                isActive && yearStyles.yearItemActive,
              ]}
              onPress={() => onSelect(y)}
              activeOpacity={0.6}
            >
              <Text
                style={[
                  yearStyles.yearText,
                  isActive && yearStyles.yearTextActive,
                ]}
              >
                {y}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

/* ─── Main Screen ─── */
export const CompleteProfileScreen: React.FC<CompleteProfileScreenProps> = ({
  role,
  onProfileCompleted,
  onGoBack,
}) => {
  const { formData, errors, status, updateField, handleSave } =
    useCompleteProfile({ role, onCompleted: onProfileCompleted });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [calMonth, setCalMonth] = useState(() => {
    const max = getMaxDate();
    return { year: max.getFullYear(), month: max.getMonth() };
  });

  // Success toast
  const [showSuccess, setShowSuccess] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (status === "success") {
      setShowSuccess(true);
      toastOpacity.setValue(0);
      Animated.sequence([
        Animated.timing(toastOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(2500),
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowSuccess(false);
        onProfileCompleted();
      });
    }
  }, [status, toastOpacity, onGoBack]);

  const accentColor =
    role === "worker" ? colors.workerAccent : colors.clientAccent;

  const selectedDate = formData.dateOfBirthDate;
  const displayDate = selectedDate ? formatDate(selectedDate) : "";
  const maxDate = getMaxDate();

  const handleDateSelect = (date: Date) => {
    updateField("dateOfBirthDate", date);
    updateField("dateOfBirth", formatDate(date));
    setShowDatePicker(false);
  };

  const handleYearSelect = (year: number) => {
    setCalMonth((prev) => ({ year, month: prev.month }));
    setShowYearPicker(false);
  };

  const navigateMonth = (delta: number) => {
    setCalMonth((prev) => {
      let newMonth = prev.month + delta;
      let newYear = prev.year;
      if (newMonth < 0) {
        newMonth = 11;
        newYear--;
      } else if (newMonth > 11) {
        newMonth = 0;
        newYear++;
      }
      if (
        newYear > maxDate.getFullYear() ||
        (newYear === maxDate.getFullYear() && newMonth > maxDate.getMonth())
      ) {
        return prev;
      }
      if (newYear < MIN_YEAR) return prev;
      return { year: newYear, month: newMonth };
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={onGoBack}
            style={styles.backButton}
            testID="btn-profile-back"
            accessibilityLabel="Volver"
            accessibilityRole="button"
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <Text style={[styles.title, { color: accentColor }]}>
            Completá tu perfil
          </Text>
          <Text style={styles.subtitle}>
            Necesitamos algunos datos para verificar tu identidad.
          </Text>
        </View>

        {errors.general && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errors.general}</Text>
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Foto tuya *</Text>
          <PhotoPicker
            uri={formData.selfieUri}
            onPhotoSelected={(uri) => updateField("selfieUri", uri)}
            onPhotoRemoved={() => updateField("selfieUri", null)}
            error={errors.selfieUri}
          />
        </View>

        <DniPhotoPicker
          frontUri={formData.dniFrontUri}
          backUri={formData.dniBackUri}
          onFrontSelected={(uri) => updateField("dniFrontUri", uri)}
          onBackSelected={(uri) => updateField("dniBackUri", uri)}
          onFrontRemoved={() => updateField("dniFrontUri", null)}
          onBackRemoved={() => updateField("dniBackUri", null)}
          frontError={errors.dniFrontUri}
          backError={errors.dniBackUri}
        />

        <View style={styles.field}>
          <Text style={styles.label}>Fecha de nacimiento *</Text>
          <TouchableOpacity
            style={[
              styles.dateButton,
              errors.dateOfBirth && styles.dateButtonError,
            ]}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Text
              style={selectedDate ? styles.dateText : styles.datePlaceholder}
            >
              {displayDate || "Seleccionar fecha"}
            </Text>
            <Text style={styles.dateIcon}>📅</Text>
          </TouchableOpacity>
          {errors.dateOfBirth && (
            <Text style={styles.errorText}>{errors.dateOfBirth}</Text>
          )}
          {selectedDate && (
            <View style={[styles.ageInfo, calculateAge(selectedDate) >= 18 ? styles.ageInfoAdult : styles.ageInfoMinor]}>
              <Text style={[styles.ageInfoText, calculateAge(selectedDate) >= 18 ? styles.ageInfoTextAdult : styles.ageInfoTextMinor]}>
                {calculateAge(selectedDate) >= 18
                  ? "Tenes toda la app desbloqueada"
                  : "Solo podes usar la app en modo cliente"}
              </Text>
            </View>
          )}
        </View>

        {/* Calendar modal */}
        <Modal visible={showDatePicker} transparent animationType="slide">
          <View style={styles.dateOverlay}>
            <Pressable
              style={styles.dateOverlayBackdrop}
              onPress={() => setShowDatePicker(false)}
            />
            <View
              style={styles.dateModal}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.dateModalHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.dateModalCancel}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={styles.dateModalTitle}>Fecha de nacimiento</Text>
                <View style={{ width: 60 }} />
              </View>

              {showYearPicker ? (
                <YearPicker
                  selectedYear={calMonth.year}
                  maxYear={maxDate.getFullYear()}
                  onSelect={handleYearSelect}
                />
              ) : (
                <>
                  <View style={calStyles.monthNav}>
                    <TouchableOpacity
                      onPress={() => navigateMonth(-1)}
                      style={calStyles.navBtn}
                    >
                      <Text style={calStyles.navBtnText}>‹</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setShowYearPicker(true)}
                      activeOpacity={0.6}
                    >
                      <Text style={calStyles.monthTitle}>
                        {MONTH_NAMES[calMonth.month]} {calMonth.year} ▾
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => navigateMonth(1)}
                      style={calStyles.navBtn}
                    >
                      <Text style={calStyles.navBtnText}>›</Text>
                    </TouchableOpacity>
                  </View>

                  <CalendarGrid
                    year={calMonth.year}
                    month={calMonth.month}
                    selectedDate={selectedDate}
                    maxDate={maxDate}
                    onSelect={handleDateSelect}
                  />
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Success toast */}
        {showSuccess && (
          <Animated.View
            style={[styles.successToast, { opacity: toastOpacity }]}
          >
            <Text style={styles.successToastText}>
              ¡Completaste el perfil! ¡Felicitaciones!
            </Text>
          </Animated.View>
        )}

        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: accentColor },
            status === "saving" && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={status === "saving"}
          activeOpacity={0.8}
        >
          {status === "saving" ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Guardar perfil</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

/* ─── Calendar styles ─── */
const calStyles = StyleSheet.create({
  monthNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  navBtn: {
    padding: spacing.sm,
  },
  navBtnText: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: "300",
  },
  monthTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
  grid: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.md,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    height: CELL_HEIGHT,
  },
  cell: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cellSelected: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  dayLabel: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
  },
  dayText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
  },
  dayTextSelected: {
    color: "#FFFFFF",
    fontWeight: typography.fontWeights.semibold,
  },
  dayTextDisabled: {
    color: colors.textMuted,
    opacity: 0.4,
  },
});

/* ─── Year picker styles ─── */
const yearStyles = StyleSheet.create({
  container: {
    height: GRID_FIXED_HEIGHT,
    paddingHorizontal: spacing.lg,
  },
  title: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  yearItem: {
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: borderRadius.sm,
  },
  yearItemActive: {
    backgroundColor: colors.primary,
  },
  yearText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
  },
  yearTextActive: {
    color: "#FFFFFF",
    fontWeight: typography.fontWeights.semibold,
  },
});

/* ─── Screen styles ─── */
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  backButton: {
    paddingVertical: spacing.xs,
    paddingRight: spacing.sm,
  },
  backArrow: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "bold",
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.fontSizes.md,
    color: colors.textSecondary,
    lineHeight: typography.fontSizes.md * 1.5,
  },
  errorBanner: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorBannerText: {
    color: colors.error,
    fontSize: typography.fontSizes.sm,
    textAlign: "center",
  },
  field: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  dateButton: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateButtonError: {
    borderColor: colors.error,
  },
  dateText: {
    fontSize: typography.fontSizes.md,
    color: colors.textPrimary,
  },
  datePlaceholder: {
    fontSize: typography.fontSizes.md,
    color: colors.textSecondary,
  },
  dateIcon: {
    fontSize: 20,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSizes.xs,
    marginTop: spacing.xs,
  },
  saveButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.lg,
    ...shadows.button,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
  dateOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  dateOverlayBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  dateModal: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingBottom: spacing.lg,
  },
  dateModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dateModalTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
  dateModalCancel: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
  },
  successToast: {
    backgroundColor: "rgba(34, 197, 94, 0.95)",
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    alignItems: "center",
  },
  successToastText: {
    color: "#FFFFFF",
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
  ageInfo: {
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  ageInfoAdult: {
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    borderColor: colors.success,
  },
  ageInfoMinor: {
    backgroundColor: "rgba(249, 115, 22, 0.12)",
    borderColor: "#F97316",
  },
  ageInfoText: {
    fontSize: typography.fontSizes.xs,
    textAlign: "center",
  },
  ageInfoTextAdult: {
    color: colors.success,
  },
  ageInfoTextMinor: {
    color: "#F97316",
  },
});
