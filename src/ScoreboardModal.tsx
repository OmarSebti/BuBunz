import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from './lib/supabase';

type ScoreRow = {
  nickname: string;
  total_bounces: number;
  user_id: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  currentUserId: string | null;
};

export function ScoreboardModal({ visible, onClose, currentUserId }: Props) {
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setLoading(true);
    supabase
      .from('scoreboard')
      .select('nickname, total_bounces, user_id')
      .order('total_bounces', { ascending: false })
      .limit(50)
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          setError('Could not load scoreboard. Please try again.');
        } else {
          setRows((data as ScoreRow[]) ?? []);
        }
        setLoading(false);
      });
  }, [visible]);

  function rankColor(index: number): string {
    if (index === 0) return '#FFD700';
    if (index === 1) return '#C0C0C0';
    if (index === 2) return '#CD7F32';
    return 'rgba(255,255,255,0.6)';
  }

  function renderRow({ item, index }: { item: ScoreRow; index: number }) {
    const isMe = item.user_id === currentUserId;
    return (
      <View style={[styles.row, isMe && styles.rowHighlight]}>
        <Text style={[styles.rank, { color: rankColor(index) }]}>{index + 1}</Text>
        <Text style={[styles.nickname, isMe && styles.nicknameHighlight]} numberOfLines={1}>
          {item.nickname}
        </Text>
        <Text style={styles.score}>{item.total_bounces.toLocaleString()}</Text>
      </View>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.card} onPress={() => {}}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>

          <Text style={styles.title}>🏆 Scoreboard</Text>

          <View style={styles.header}>
            <Text style={[styles.headerCell, styles.headerRank]}>#</Text>
            <Text style={[styles.headerCell, styles.headerNickname]}>Player</Text>
            <Text style={[styles.headerCell, styles.headerScore]}>Bounces</Text>
          </View>

          {loading && (
            <View style={styles.centerBox}>
              <ActivityIndicator color="#FFD700" size="large" />
            </View>
          )}

          {!loading && error && (
            <View style={styles.centerBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {!loading && !error && rows.length === 0 && (
            <View style={styles.centerBox}>
              <Text style={styles.emptyText}>No scores yet</Text>
            </View>
          )}

          {!loading && !error && rows.length > 0 && (
            <FlatList
              data={rows}
              keyExtractor={(item) => item.user_id}
              renderItem={renderRow}
              style={styles.list}
              showsVerticalScrollIndicator={false}
            />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,50,10,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#0e3a0e',
    borderRadius: 20,
    padding: 24,
    paddingTop: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 16,
    zIndex: 10,
  },
  closeButtonText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 28,
    lineHeight: 32,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  title: {
    color: '#FFD700',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  header: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.15)',
    marginBottom: 4,
  },
  headerCell: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  headerRank: {
    width: 36,
  },
  headerNickname: {
    flex: 1,
  },
  headerScore: {
    width: 80,
    textAlign: 'right',
  },
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  rowHighlight: {
    backgroundColor: 'rgba(255,215,0,0.12)',
  },
  rank: {
    width: 36,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  nickname: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  nicknameHighlight: {
    color: '#FFD700',
    fontWeight: '700',
  },
  score: {
    width: 80,
    textAlign: 'right',
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  centerBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});
