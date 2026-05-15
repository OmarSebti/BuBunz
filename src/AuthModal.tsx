import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { useAuth } from './hooks/useAuth';

type AuthModalState = 'login' | 'signup' | 'nickname' | 'profile';

type Props = {
  visible: boolean;
  onClose: () => void;
  auth: ReturnType<typeof useAuth>;
};

const NICKNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

function nicknameError(value: string): string | null {
  if (value.length < 3) return 'Nickname must be at least 3 characters.';
  if (value.length > 20) return 'Nickname must be 20 characters or fewer.';
  if (!NICKNAME_RE.test(value)) return 'Only letters, numbers, and underscores allowed.';
  return null;
}

function friendlyError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes('already registered') || msg.includes('email')) return 'That email is already in use.';
    if (msg.includes('invalid login') || msg.includes('credentials')) return 'Wrong email or password.';
    if (msg.includes('unique') || msg.includes('duplicate') || msg.includes('nickname')) return 'That nickname is already taken.';
    if (msg.includes('network') || msg.includes('fetch')) return 'Network error. Please try again.';
    return err.message;
  }
  return 'Something went wrong. Please try again.';
}

export function AuthModal({ visible, onClose, auth }: Props) {
  const { user, profile, signUpWithEmail, signInWithEmail, signInWithGoogle, createProfile, signOut } = auth;

  const initialState = (): AuthModalState => {
    if (user && profile) return 'profile';
    if (user && !profile) return 'nickname';
    return 'login';
  };

  const [tab, setTab] = useState<AuthModalState>(initialState);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    if (!visible) return;
    setError(null);
    setEmail('');
    setPassword('');
    setNickname('');
    if (user && profile) setTab('profile');
    else if (user && !profile) setTab('nickname');
    else setTab('login');
  }, [visible, user, profile]);

  React.useEffect(() => {
    if (!visible) return;
    if (user && profile) setTab('profile');
    else if (user && !profile) setTab('nickname');
  }, [user, profile, visible]);

  async function handleSignIn() {
    setError(null);
    if (!email.trim() || !password) { setError('Please enter your email and password.'); return; }
    setBusy(true);
    try {
      await signInWithEmail(email.trim(), password);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleSignUp() {
    setError(null);
    const nickErr = nicknameError(nickname.trim());
    if (nickErr) { setError(nickErr); return; }
    if (!email.trim() || !password) { setError('Please enter your email and password.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setBusy(true);
    try {
      await signUpWithEmail(email.trim(), password, nickname.trim());
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleSetNickname() {
    setError(null);
    const nickErr = nicknameError(nickname.trim());
    if (nickErr) { setError(nickErr); return; }
    setBusy(true);
    try {
      await createProfile(nickname.trim());
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setError(null);
    setBusy(true);
    try {
      await signOut();
      onClose();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  function renderContent() {
    if (tab === 'profile' && user && profile) {
      return (
        <View style={styles.inner}>
          <Text style={styles.title}>Profile</Text>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Nickname</Text>
            <Text style={styles.profileValue}>{profile.nickname}</Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Email</Text>
            <Text style={styles.profileValue}>{user.email ?? '—'}</Text>
          </View>
          {error && <Text style={styles.errorText}>{error}</Text>}
          <TouchableOpacity style={styles.primaryButton} onPress={handleSignOut} activeOpacity={0.8} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Sign Out</Text>}
          </TouchableOpacity>
        </View>
      );
    }

    if (tab === 'nickname') {
      return (
        <View style={styles.inner}>
          <Text style={styles.title}>Choose a Nickname</Text>
          <Text style={styles.subtitle}>Pick a unique nickname for the scoreboard.</Text>
          <TextInput
            style={styles.input}
            placeholder="Nickname (3–20 chars)"
            placeholderTextColor="rgba(255,255,255,0.45)"
            value={nickname}
            onChangeText={setNickname}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
          />
          {error && <Text style={styles.errorText}>{error}</Text>}
          <TouchableOpacity style={styles.primaryButton} onPress={handleSetNickname} activeOpacity={0.8} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Set Nickname</Text>}
          </TouchableOpacity>
        </View>
      );
    }

    if (tab === 'signup') {
      return (
        <View style={styles.inner}>
          <Text style={styles.title}>Create Account</Text>
          <TextInput
            style={styles.input}
            placeholder="Nickname (3–20 chars)"
            placeholderTextColor="rgba(255,255,255,0.45)"
            value={nickname}
            onChangeText={setNickname}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="rgba(255,255,255,0.45)"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Password (min 6 chars)"
            placeholderTextColor="rgba(255,255,255,0.45)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          {error && <Text style={styles.errorText}>{error}</Text>}
          <TouchableOpacity style={styles.primaryButton} onPress={handleSignUp} activeOpacity={0.8} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Create Account</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleGoogle} activeOpacity={0.8} disabled={busy}>
            <Text style={styles.secondaryButtonText}>Continue with Google</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setError(null); setTab('login'); }} style={styles.switchRow}>
            <Text style={styles.switchText}>Already have an account? <Text style={styles.switchLink}>Sign In</Text></Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.inner}>
        <Text style={styles.title}>Sign In</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="rgba(255,255,255,0.45)"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="rgba(255,255,255,0.45)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        {error && <Text style={styles.errorText}>{error}</Text>}
        <TouchableOpacity style={styles.primaryButton} onPress={handleSignIn} activeOpacity={0.8} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Sign In</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleGoogle} activeOpacity={0.8} disabled={busy}>
          <Text style={styles.secondaryButtonText}>Continue with Google</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setError(null); setTab('signup'); }} style={styles.switchRow}>
          <Text style={styles.switchText}>New here? <Text style={styles.switchLink}>Create Account</Text></Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.card} onPress={() => {}}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
          {renderContent()}
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
    width: '88%',
    backgroundColor: '#0e3a0e',
    borderRadius: 20,
    padding: 28,
    paddingTop: 36,
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
  inner: {
    gap: 12,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  primaryButton: {
    backgroundColor: '#E30000',
    borderRadius: 50,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 50,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  switchRow: {
    alignItems: 'center',
    marginTop: 4,
  },
  switchText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  switchLink: {
    color: '#FFD700',
    fontWeight: '700',
  },
  profileRow: {
    marginBottom: 4,
  },
  profileLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  profileValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});
