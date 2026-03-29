import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '../../lib/supabase';
import { loadProfile, saveProfile } from '../../services/profile/profileService';
import logger from '../../lib/logger';
import { ProfileStackParamList } from '../../types/navigation';

type Props = StackScreenProps<ProfileStackParamList, 'GeneralInformationScreen'>;

// ─── Data ────────────────────────────────────────────────────────────────────

const ROLES = ['Bride', 'Family Member', 'Boutique', 'Other'];
const COMMUNICATIONS = ['Zalo', 'Phone', 'WhatsApp'];
const BODY_SHAPES = [
  'Rectangle',
  'Pear / Triangle',
  'Hourglass',
  'Inverted Triangle',
  'Diamond',
  'Round / Apple',
];
const CITIES = [
  'Ho Chi Minh City',
  'Hanoi',
  'Da Nang',
  'Hai Phong',
  'Can Tho',
  'Nha Trang',
  'Hue',
  'Vung Tau',
  'Da Lat',
  'Bien Hoa',
  'Buon Ma Thuot',
  'Quang Ninh',
  'Thai Nguyen',
  'Nam Dinh',
  'Quy Nhon',
  'Vinh',
  'Phu Quoc',
  'Hoi An',
  'My Tho',
  'Long Xuyen',
  'Rach Gia',
  'Ca Mau',
  'Pleiku',
  'Kon Tum',
  'Dong Hoi',
  'Dong Ha',
  'Tam Ky',
  'Quang Ngai',
  'Tuy Hoa',
  'Phan Thiet',
  'Bao Loc',
  'Other',
];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ─── Body Shape Icon ──────────────────────────────────────────────────────────

function BodyShapeIcon({ shape, selected }: { shape: string; selected: boolean }) {
  const color = selected ? '#C9A96E' : '#CCC';
  switch (shape) {
    case 'Rectangle':
      return <View style={{ width: 18, height: 34, backgroundColor: color, borderRadius: 2 }} />;
    case 'Pear / Triangle':
      return (
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: 12, height: 17, backgroundColor: color, borderRadius: 1 }} />
          <View style={{ width: 22, height: 17, backgroundColor: color, borderRadius: 1 }} />
        </View>
      );
    case 'Hourglass':
      return (
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: 22, height: 11, backgroundColor: color, borderRadius: 1 }} />
          <View style={{ width: 11, height: 12, backgroundColor: color }} />
          <View style={{ width: 22, height: 11, backgroundColor: color, borderRadius: 1 }} />
        </View>
      );
    case 'Inverted Triangle':
      return (
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: 22, height: 17, backgroundColor: color, borderRadius: 1 }} />
          <View style={{ width: 12, height: 17, backgroundColor: color, borderRadius: 1 }} />
        </View>
      );
    case 'Diamond':
      return (
        <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{
            width: 16,
            height: 16,
            backgroundColor: color,
            transform: [{ rotate: '45deg' }],
          }} />
        </View>
      );
    case 'Round / Apple':
      return <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: color }} />;
    default:
      return <View style={{ width: 18, height: 34, backgroundColor: color }} />;
  }
}

// ─── Picker Modal ─────────────────────────────────────────────────────────────

type PickerModalProps = {
  visible: boolean;
  title: string;
  options: string[];
  selected: string | null;
  onSelect: (value: string) => void;
  onClose: () => void;
};

function PickerModal({ visible, title, options, selected, onSelect, onClose }: PickerModalProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={pickerStyles.container}>
        <View style={pickerStyles.header}>
          <Text style={pickerStyles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        <FlatList
          data={options}
          keyExtractor={(item, index) => `${item}-${index}`}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={pickerStyles.row}
              onPress={() => { onSelect(item); onClose(); }}
              activeOpacity={0.7}
            >
              <Text style={pickerStyles.rowText}>{item}</Text>
              {selected === item && <Ionicons name="checkmark" size={20} color="#C9A96E" />}
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  title: { fontSize: 17, fontWeight: '700', color: '#333' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    backgroundColor: '#FFFFFF',
  },
  rowText: { fontSize: 16, color: '#333' },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function GeneralInformationScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form state
  const [role, setRole] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [communication, setCommunication] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [age, setAge] = useState('');
  const [weddingMonth, setWeddingMonth] = useState<number | null>(null);
  const [weddingYear, setWeddingYear] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [bodyShape, setBodyShape] = useState<string | null>(null);

  // Picker visibility
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) { setLoading(false); return; }

      const { data, error } = await loadProfile(userId);
      if (error) {
        logger.error('GeneralInformationScreen: loadProfile failed', error);
      } else if (data) {
        setRole(data.role);
        setFirstName(data.first_name ?? '');
        setLastName(data.last_name ?? '');
        setCommunication(data.preferred_communication);
        setCity(data.city);
        setAge(data.age != null ? String(data.age) : '');
        setWeddingMonth(data.wedding_month);
        setWeddingYear(data.wedding_year != null ? String(data.wedding_year) : '');
        setHeight(data.height_cm != null ? String(data.height_cm) : '');
        setWeight(data.weight_kg != null ? String(data.weight_kg) : '');
        setBodyShape(data.body_shape);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) { setSaving(false); return; }

    const { error } = await saveProfile(userId, {
      role,
      first_name: firstName.trim() || null,
      last_name: lastName.trim() || null,
      preferred_communication: communication,
      city,
      age: age ? parseInt(age, 10) : null,
      wedding_month: weddingMonth,
      wedding_year: weddingYear ? parseInt(weddingYear, 10) : null,
      height_cm: height ? parseFloat(height) : null,
      weight_kg: weight ? parseFloat(weight) : null,
      body_shape: bodyShape,
    });

    if (error) {
      logger.error('GeneralInformationScreen: saveProfile failed', error);
      setSaveError('Could not save. Please try again.');
    } else {
      setSaveSuccess(true);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#C9A96E" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>General Information</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ── Section 1: Basics ── */}
          <Text style={styles.sectionTitle}>Basics</Text>

          {/* Role */}
          <Text style={styles.label}>Role</Text>
          <View style={styles.chipRow}>
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.chip, role === r && styles.chipSelected]}
                onPress={() => setRole(r)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, role === r && styles.chipTextSelected]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* First / Last Name */}
          <View style={styles.row2}>
            <View style={styles.halfField}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Your first name"
                placeholderTextColor="#BBB"
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Your last name"
                placeholderTextColor="#BBB"
              />
            </View>
          </View>

          {/* Preferred Communication */}
          <Text style={styles.label}>Preferred Communication</Text>
          <View style={styles.chipRow}>
            {COMMUNICATIONS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, communication === c && styles.chipSelected]}
                onPress={() => setCommunication(c)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, communication === c && styles.chipTextSelected]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* City */}
          <Text style={styles.label}>City</Text>
          <TouchableOpacity style={styles.selectRow} onPress={() => setCityPickerOpen(true)} activeOpacity={0.7}>
            <Text style={[styles.selectText, !city && styles.selectPlaceholder]}>
              {city ?? 'Select your city'}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#999" />
          </TouchableOpacity>

          {/* Age */}
          <Text style={styles.label}>Age</Text>
          <TextInput
            style={styles.input}
            value={age}
            onChangeText={setAge}
            keyboardType="numeric"
            placeholder="e.g. 28"
            placeholderTextColor="#BBB"
          />

          {/* Wedding Date Window */}
          <Text style={styles.label}>Wedding Date Window <Text style={styles.labelOptional}>(optional)</Text></Text>
          <View style={styles.row2}>
            <TouchableOpacity
              style={[styles.selectRow, styles.halfField]}
              onPress={() => setMonthPickerOpen(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.selectText, !weddingMonth && styles.selectPlaceholder]}>
                {weddingMonth ? MONTHS[weddingMonth - 1] : 'Month'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#999" />
            </TouchableOpacity>
            <View style={styles.halfField}>
              <TextInput
                style={styles.input}
                value={weddingYear}
                onChangeText={setWeddingYear}
                keyboardType="numeric"
                placeholder="Year"
                placeholderTextColor="#BBB"
                maxLength={4}
              />
            </View>
          </View>

          {/* ── Section 2: Body Figure ── */}
          <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Body Figure</Text>

          {/* Height / Weight */}
          <View style={styles.row2}>
            <View style={styles.halfField}>
              <Text style={styles.label}>Height (cm)</Text>
              <TextInput
                style={styles.input}
                value={height}
                onChangeText={setHeight}
                keyboardType="numeric"
                placeholder="e.g. 165"
                placeholderTextColor="#BBB"
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>Weight (kg)</Text>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
                placeholder="e.g. 55"
                placeholderTextColor="#BBB"
              />
            </View>
          </View>

          {/* Body Shape */}
          <Text style={styles.label}>Body Shape</Text>
          <View style={styles.shapeGrid}>
            {BODY_SHAPES.map((shape) => (
              <TouchableOpacity
                key={shape}
                style={[styles.shapeCard, bodyShape === shape && styles.shapeCardSelected]}
                onPress={() => setBodyShape(shape)}
                activeOpacity={0.7}
              >
                <View style={styles.shapeIconArea}>
                  <BodyShapeIcon shape={shape} selected={bodyShape === shape} />
                </View>
                <Text style={[styles.shapeLabel, bodyShape === shape && styles.shapeLabelSelected]}>
                  {shape}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Status messages */}
          {saveError && <Text style={styles.errorText}>{saveError}</Text>}
          {saveSuccess && <Text style={styles.successText}>Saved!</Text>}

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* City picker modal */}
      <PickerModal
        visible={cityPickerOpen}
        title="Select City"
        options={CITIES}
        selected={city}
        onSelect={setCity}
        onClose={() => setCityPickerOpen(false)}
      />

      {/* Month picker modal */}
      <PickerModal
        visible={monthPickerOpen}
        title="Select Month"
        options={MONTHS}
        selected={weddingMonth ? MONTHS[weddingMonth - 1] : null}
        onSelect={(monthName) => setWeddingMonth(MONTHS.indexOf(monthName) + 1)}
        onClose={() => setMonthPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#333', textAlign: 'center' },
  headerSpacer: { width: 24 },
  scroll: { padding: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  label: { fontSize: 13, fontWeight: '600', color: '#777', marginBottom: 8, marginTop: 16 },
  labelOptional: { fontWeight: '400', color: '#AAA' },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
  },
  row2: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  chipSelected: { borderColor: '#C9A96E', backgroundColor: '#FBF4EA' },
  chipText: { fontSize: 14, color: '#666' },
  chipTextSelected: { color: '#C9A96E', fontWeight: '600' },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectText: { fontSize: 15, color: '#333' },
  selectPlaceholder: { color: '#BBB' },
  shapeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  shapeCard: {
    width: '30%',
    aspectRatio: 0.9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 8,
    gap: 8,
  },
  shapeCardSelected: { borderColor: '#C9A96E', backgroundColor: '#FBF4EA' },
  shapeIconArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  shapeLabel: { fontSize: 11, color: '#888', textAlign: 'center' },
  shapeLabelSelected: { color: '#C9A96E', fontWeight: '600' },
  saveButton: {
    backgroundColor: '#C9A96E',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  errorText: { fontSize: 14, color: '#CC3333', textAlign: 'center', marginTop: 12 },
  successText: { fontSize: 14, color: '#2E7D32', textAlign: 'center', marginTop: 12 },
});
