// Components/SettingsScreen.js — Starburst theme
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageBackground,
  Pressable,
  Share,
  Vibration,
  useWindowDimensions,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMusic } from './MusicPlayer';

const BG_IMG = require('../assets/onb.webp');

const STORAGE_KEY = 'nql:settings:v1';

/* Starburst palette */
const SB = {
  space1: '#0A0F1E',
  space2: '#0B1330',
  glass:  'rgba(12,18,36,0.88)',
  edge:   'rgba(124,77,255,0.55)',
  edge2:  'rgba(255,218,120,0.55)',
  text:   '#FFFFFF',
  dim:    'rgba(255,255,255,0.84)',
  danger1:'#FF6A3D',
  danger2:'#D53A2A',
  ok1:    '#7C4DFF',
  ok2:    '#D94FFF',
  ok3:    '#FF6A3D',
  ok4:    '#FFD34D',
};

const DEFAULT_SETTINGS = {
  music: true,
  sounds: true,
  vibration: true,
};

// Ключи для очистки данных (соответствуют ключам в других компонентах)
const STORAGE_KEYS = {
  pieces: 'nql:artifactPieces:v1',
  solved: 'nql:artifactSolved:v1',
  favs: 'nql:articleFavs',
  answers: 'nql:articleAnswersCorrect:v1',
  settings: 'nql:settings:v1',
  onboarding: 'nql:onboarding:v1',
};

export default function SettingsScreen() {
  const { width, height } = useWindowDimensions();
  const styles = useMemo(() => makeStyles(width, height), [width, height]);

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const { toggleMusic, stopMusic, isPlaying, isLoaded } = useMusic();

  // load
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        }
      } catch {}
    })();
  }, []);

  // sync music
  useEffect(() => {
    if (!isLoaded) return;
    if (settings.music && !isPlaying) toggleMusic();
    if (!settings.music && isPlaying) stopMusic();
  }, [settings.music, isLoaded, isPlaying, toggleMusic, stopMusic]);

  const persist = useCallback(async (next) => {
    setSettings(next);
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }, []);

  const toggle = (key) => {
    const next = { ...settings, [key]: !settings[key] };
    if (key === 'music') {
      if (next.music) toggleMusic(); else stopMusic();
    }
    // лёгкий отклик
    if (key !== 'vibration' && settings.vibration) Vibration.vibrate(10);
    persist(next);
  };

  const onShare = async () => {
    try {
      await Share.share({
        message:
          'Noble Queens Legacy — истории великих цариц Египта, артефакты и мини-игры. Попробуй!',
      });
    } catch {}
  };

  const onResetData = () => {
    Alert.alert(
      'Reset Data',
      'Are you sure you want to reset all data? This will clear all progress, favorites, and settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all([
                AsyncStorage.removeItem(STORAGE_KEYS.pieces),
                AsyncStorage.removeItem(STORAGE_KEYS.solved),
                AsyncStorage.removeItem(STORAGE_KEYS.favs),
                AsyncStorage.removeItem(STORAGE_KEYS.answers),
                AsyncStorage.removeItem(STORAGE_KEYS.settings),
                AsyncStorage.removeItem(STORAGE_KEYS.onboarding),
              ]);
              setSettings(DEFAULT_SETTINGS);
              stopMusic();
              Alert.alert('Success', 'All data has been reset successfully!');
            } catch (e) {
              Alert.alert('Error', 'Failed to reset data. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <ImageBackground source={BG_IMG} style={styles.bg} resizeMode="cover">
      {/* стеклянная карточка с подсветкой */}
      <View style={styles.panel}>
        <View style={styles.panelEdge} />
        <Text style={styles.title}>Settings</Text>

        <Row label="Music"     value={settings.music}     onPress={() => toggle('music')} />
        <Row label="Sounds"    value={settings.sounds}    onPress={() => toggle('sounds')} />
        <Row label="Vibration" value={settings.vibration} onPress={() => toggle('vibration')} />

        {/* CTA */}
        <Pressable onPress={onShare} style={styles.ctaWrap}>
          <LinearGradient
            colors={[SB.ok1, SB.ok2, SB.ok3, SB.ok4]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.ctaFill}
          >
            <Text style={styles.ctaText}>Share App</Text>
          </LinearGradient>
        </Pressable>

        {/* Reset */}
        <Pressable onPress={onResetData} style={styles.resetWrap}>
          <LinearGradient
            colors={[SB.danger1, SB.danger2]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.resetFill}
          >
            <Text style={styles.resetText}>Reset Data</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </ImageBackground>
  );
}

/* ───────── helpers ───────── */

function CustomSwitch({ value, onPress }) {
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;
  const scaleValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: value ? 1 : 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  }, [value, animatedValue]);

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scaleValue, {
        toValue: 0.95,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.spring(scaleValue, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
    ]).start();
    onPress();
  };

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 28],
  });

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.2)', 'rgba(124,77,255,0.8)'],
  });

  return (
    <Pressable onPress={handlePress} hitSlop={10} style={rowStyles.toggle}>
      <Animated.View style={[rowStyles.switchContainer, { transform: [{ scale: scaleValue }] }]}>
        <Animated.View style={[rowStyles.switchTrack, { backgroundColor }]}>
          <Animated.View style={[rowStyles.switchThumb, { transform: [{ translateX }] }]}>
            <LinearGradient
              colors={value ? [SB.ok1, SB.ok2] : ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']}
              style={rowStyles.thumbGradient}
            />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

function Row({ label, value, onPress }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <CustomSwitch value={value} onPress={onPress} />
    </View>
  );
}

/* ───────── styles ───────── */

function makeStyles(w, h) {
  const PANEL_W = Math.min(380, w - 40);

  return StyleSheet.create({
    bg: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, backgroundColor: SB.space1 },

    panel: {
      width: PANEL_W,
      minHeight: 460,
      paddingHorizontal: 18,
      paddingTop: 18,
      paddingBottom: 22,
      borderRadius: 24,
      backgroundColor: SB.glass,
      borderWidth: 1.5,
      borderColor: SB.edge,
      shadowColor: '#000',
      shadowOpacity: 0.35,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 10 },
      position: 'relative',
      overflow: 'hidden',
    },

    // лёгкое свечение рамки
    panelEdge: {
      position: 'absolute',
      left: 4, right: 4, top: 4, bottom: 4,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: SB.edge2,
      opacity: 0.6,
    },

    title: {
      color: SB.text,
      fontSize: 26,
      fontWeight: '900',
      textAlign: 'center',
      marginBottom: 6,
    },

    ctaWrap: {
      marginTop: 20,
      height: 56,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1.5,
      borderColor: SB.edge2,
    },
    ctaFill: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ctaText: { color: '#0D0F1A', fontSize: 18, fontWeight: '900' },
    
    resetWrap: {
      marginTop: 14,
      height: 56,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1.5,
      borderColor: SB.danger1,
    },
    resetFill: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
    },
    resetText: { color: '#0D0F1A', fontSize: 18, fontWeight: '900' },
  });
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  label: { color: SB.dim, fontSize: 18, fontWeight: '800', flex: 1 },
  toggle: { paddingHorizontal: 4, paddingVertical: 2 },
  switchContainer: {
    width: 62,
    height: 34,
    justifyContent: 'center',
  },
  switchTrack: {
    width: 60,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  thumbGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 13,
  },
});
