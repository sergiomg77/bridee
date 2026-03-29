import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '../../lib/supabase';
import { saveBridalDNA } from '../../services/profile/bridalDNAService';
import logger from '../../lib/logger';
import { ProfileStackParamList } from '../../types/navigation';

type Props = StackScreenProps<ProfileStackParamList, 'BridalDNAScreen'>;

// ─── Questions ────────────────────────────────────────────────────────────────

type Question = {
  id: string;
  label: string;
  type: 'single' | 'multi';
  maxSelect?: number;
  options: string[];
};

const QUESTIONS: Question[] = [
  {
    id: 'energy_anchor',
    label: 'On your wedding day, you want to feel…',
    type: 'single',
    options: [
      'Ethereal & Dreamy',
      'Bold & Powerful',
      'Romantic & Tender',
      'Playful & Whimsical',
      'Timeless & Classic',
      'Modern & Chic',
      'Free & Natural',
    ],
  },
  {
    id: 'construction_priority',
    label: "When it comes to fit, what's your non-negotiable?",
    type: 'single',
    options: [
      'A corset that sculpts my silhouette',
      'Fabric that drapes and flows beautifully',
      'Coverage that makes me feel comfortable',
      'Structure that holds everything in place',
      'Freedom of movement above all',
    ],
  },
  {
    id: 'budget_range',
    label: "What's your dress budget?",
    type: 'single',
    options: [
      'Under 10 million VND',
      '10–20 million VND',
      '20–50 million VND',
      '50–100 million VND',
      '100 million VND+',
    ],
  },
  {
    id: 'silhouette',
    label: 'Which silhouettes call to you? (choose up to 2)',
    type: 'multi',
    maxSelect: 2,
    options: [
      'Ball Gown',
      'A-Line',
      'Mermaid / Trumpet',
      'Sheath / Column',
      'Tea-Length',
      'Jumpsuit / Two-Piece',
      'Mini',
    ],
  },
  {
    id: 'detail_draw',
    label: 'Which details draw your eye? (choose up to 3)',
    type: 'multi',
    maxSelect: 3,
    options: [
      'Lace & Embroidery',
      'Beading & Crystals',
      'Ruffles & Layers',
      'Clean & Minimal',
      'Dramatic Train',
      'Open Back',
      'Statement Sleeves',
    ],
  },
  {
    id: 'inspiration_source',
    label: 'Where does your style inspiration come from? (choose up to 2)',
    type: 'multi',
    maxSelect: 2,
    options: [
      'Film & TV',
      'Bridal Magazines & Editorials',
      'Social Media (Pinterest, Instagram)',
      'Cultural Heritage',
      'Nature & Seasons',
      'Architecture & Art',
      'A Person I Admire',
    ],
  },
  {
    id: 'non_negotiables',
    label: "What are your dress non-negotiables? (choose up to 2)",
    type: 'multi',
    maxSelect: 2,
    options: [
      'Pockets',
      'Detachable Skirt',
      'Modest Coverage',
      'Breathable Fabric (for hot weather)',
      'Under 5kg Weight',
      'Easy to Alter',
      'Designer Label',
    ],
  },
  {
    id: 'soul_weight',
    label: 'How do you want your dress to feel on your body?',
    type: 'single',
    options: [
      'Light & Airy — I want to float',
      'Balanced — present but not heavy',
      'Substantial — I want to feel the weight of the moment',
    ],
  },
];

// ─── Answer helpers ───────────────────────────────────────────────────────────

type Answers = Record<string, string | string[]>;

function getSingle(answers: Answers, id: string): string | null {
  const val = answers[id];
  return typeof val === 'string' ? val : null;
}

function getMulti(answers: Answers, id: string): string[] {
  const val = answers[id];
  return Array.isArray(val) ? val : [];
}

function toggleMulti(answers: Answers, id: string, option: string, max: number): Answers {
  const current = getMulti(answers, id);
  if (current.includes(option)) {
    return { ...answers, [id]: current.filter((x) => x !== option) };
  }
  if (current.length >= max) return answers;
  return { ...answers, [id]: [...current, option] };
}

function isAnswered(answers: Answers, q: Question): boolean {
  if (q.type === 'single') return getSingle(answers, q.id) !== null;
  return getMulti(answers, q.id).length > 0;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function BridalDNAScreen({ navigation }: Props) {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const question = QUESTIONS[currentQ];
  const isLast = currentQ === QUESTIONS.length - 1;
  const canAdvance = isAnswered(answers, question);

  async function handleSubmit() {
    setSaving(true);
    setSaveError(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) { setSaving(false); return; }

    const { error } = await saveBridalDNA(userId, {
      energy_anchor: getSingle(answers, 'energy_anchor'),
      construction_priority: getSingle(answers, 'construction_priority'),
      budget_range: getSingle(answers, 'budget_range'),
      silhouette: getMulti(answers, 'silhouette'),
      detail_draw: getMulti(answers, 'detail_draw'),
      inspiration_source: getMulti(answers, 'inspiration_source'),
      non_negotiables: getMulti(answers, 'non_negotiables'),
      soul_weight: getSingle(answers, 'soul_weight'),
    });

    if (error) {
      logger.error('BridalDNAScreen: save failed', error);
      setSaveError('Could not save. Please try again.');
      setSaving(false);
    } else {
      setSaving(false);
      setSubmitted(true);
    }
  }

  // ── Result placeholder ────────────────────────────────────────────────────
  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bridal DNA</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.resultContainer}>
          <Ionicons name="sparkles" size={56} color="#C9A96E" />
          <Text style={styles.resultTitle}>You're all set!</Text>
          <Text style={styles.resultSubtitle}>
            Your Bridal DNA results are coming soon…
          </Text>
          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.doneButtonText}>Back to Profile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Quiz ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bridal DNA</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Progress */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${((currentQ + 1) / QUESTIONS.length) * 100}%` }]} />
        </View>
        <Text style={styles.progressLabel}>{currentQ + 1} / {QUESTIONS.length}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.questionText}>{question.label}</Text>

        {question.type === 'multi' && (
          <Text style={styles.maxHint}>Select up to {question.maxSelect}</Text>
        )}

        <View style={styles.optionsList}>
          {question.options.map((option) => {
            const isSelected = question.type === 'single'
              ? getSingle(answers, question.id) === option
              : getMulti(answers, question.id).includes(option);

            return (
              <TouchableOpacity
                key={option}
                style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                onPress={() => {
                  if (question.type === 'single') {
                    setAnswers((prev) => ({ ...prev, [question.id]: option }));
                  } else {
                    setAnswers((prev) => toggleMulti(prev, question.id, option, question.maxSelect ?? 99));
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {option}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={20} color="#C9A96E" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {saveError && <Text style={styles.errorText}>{saveError}</Text>}

        {/* Back / Next / Submit */}
        <View style={styles.navRow}>
          {currentQ > 0 && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setCurrentQ((q) => q - 1)}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={18} color="#999" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.nextButton,
              !canAdvance && styles.nextButtonDisabled,
              currentQ === 0 && styles.nextButtonFull,
            ]}
            onPress={() => {
              if (!canAdvance) return;
              if (isLast) {
                handleSubmit();
              } else {
                setCurrentQ((q) => q + 1);
              }
            }}
            activeOpacity={0.8}
            disabled={!canAdvance || saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.nextButtonText}>{isLast ? 'Submit' : 'Next'}</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
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
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#EFEFEF',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#C9A96E', borderRadius: 2 },
  progressLabel: { fontSize: 12, color: '#AAA', width: 36, textAlign: 'right' },
  scroll: { padding: 20 },
  questionText: { fontSize: 20, fontWeight: '700', color: '#333', marginBottom: 8, lineHeight: 28 },
  maxHint: { fontSize: 13, color: '#AAA', marginBottom: 20 },
  optionsList: { gap: 10, marginTop: 12 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionCardSelected: { borderColor: '#C9A96E', backgroundColor: '#FBF4EA' },
  optionText: { fontSize: 15, color: '#444', flex: 1 },
  optionTextSelected: { color: '#C9A96E', fontWeight: '600' },
  navRow: { flexDirection: 'row', gap: 12, marginTop: 32 },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  backButtonText: { fontSize: 15, color: '#999' },
  nextButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: '#C9A96E',
  },
  nextButtonFull: { flex: 1 },
  nextButtonDisabled: { backgroundColor: '#E0D5C5' },
  nextButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  errorText: { fontSize: 14, color: '#CC3333', textAlign: 'center', marginTop: 12 },
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  resultTitle: { fontSize: 24, fontWeight: '700', color: '#333' },
  resultSubtitle: { fontSize: 16, color: '#777', textAlign: 'center', lineHeight: 24 },
  doneButton: {
    marginTop: 16,
    backgroundColor: '#C9A96E',
    paddingVertical: 15,
    paddingHorizontal: 48,
    borderRadius: 12,
  },
  doneButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
