// Components/CustomTabBar.js — Starburst look
import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Image,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: W } = Dimensions.get('window');

// Палитра под референс
const SB = {
  barBg:    'rgba(10,14,32,0.95)',
  barEdge:  'rgba(58,63,107,0.65)',
  innerTop: 'rgba(255,255,255,0.06)',
  iconOff:  0.55,

  // активное «ядро» и кольца (эмуляция градиента)
  ring1: '#7C4DFF', // фиолетовый
  ring2: '#D94FFF', // розовый
  ring3: '#FF6A3D', // оранжевый
  ring4: '#FFD34D', // золотой
  core:  '#121735',

  glow:  'rgba(255,140,40,0.25)',
  ray:   'rgba(255,210,90,0.25)',
  shadow:'#000',
};

/**
 * props:
 * - tabs: [{ key: 'Articles', icon: require('...') }, ...] // 0..4 элементов
 * - active: number (0..tabs.length-1)
 * - onPress: (key: string) => void
 */
export default function CustomTabBar({ tabs = [], active = 0, onPress }) {
  const insets = useSafeAreaInsets();

  const TABS = Array.isArray(tabs) ? tabs : [];
  const N    = Math.max(1, TABS.length);

  const SIDE  = 12;
  const BAR_W = Math.min(W - 16, 700);           // ограничим ширину на планшетах
  const tabW  = useMemo(() => (BAR_W - SIDE * 2) / N, [BAR_W, N]);

  // анимация активного кружка
  const pos = useRef(new Animated.Value(Math.min(active, N - 1))).current;
  const scale = useRef(new Animated.Value(1)).current;
  const spin  = useRef(new Animated.Value(0)).current; // для «лучей»
  const glowOpacity = useRef(new Animated.Value(0)).current;

  // создаем refs для всех табов заранее
  const pressScales = useRef(TABS.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(pos, {
        toValue: Math.min(active, N - 1),
        useNativeDriver: true,
        tension: 220,
        friction: 18,
      }),
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.12, duration: 170, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.0,  duration: 170, useNativeDriver: true }),
      ]),
      Animated.timing(glowOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start();
  }, [active, N, pos, scale, glowOpacity]);

  useEffect(() => {
    // постоянное медленное вращение «лучей»
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 7000, useNativeDriver: true })
    ).start();
  }, [spin]);

  // обновляем pressScales при изменении количества табов
  useEffect(() => {
    if (pressScales.length !== TABS.length) {
      pressScales.splice(0, pressScales.length);
      for (let i = 0; i < TABS.length; i++) {
        pressScales.push(new Animated.Value(1));
      }
    }
  }, [TABS.length, pressScales]);

  const inputRange  = N >= 2 ? TABS.map((_, i) => i) : [0, 1];
  const outputRange = N >= 2
    ? TABS.map((_, i) => SIDE + i * tabW + tabW / 2 - 38)
    : [SIDE + tabW / 2 - 38, SIDE + tabW / 2 - 38];

  const translateX = pos.interpolate({ inputRange, outputRange });
  const spinDeg = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 6) }]}
    >
      <View style={[styles.bg, { width: BAR_W, paddingHorizontal: SIDE }]}>
        {/* верхний внутренний блик */}
        <View style={styles.innerTop} />

        {/* Активный селектор (звёздный пузырь) */}
        <Animated.View
          pointerEvents="none"
          style={[styles.selectorSlot, { transform: [{ translateX }] }]}
        >
          {/* лучи */}
          <Animated.View style={[styles.rays, { transform: [{ rotate: spinDeg }] }]}>
            {Array.from({ length: 8 }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.ray,
                  { transform: [{ rotate: `${i * 45}deg` }] }
                ]}
              />
            ))}
          </Animated.View>

          {/* кольца-градиент (слоями) */}
          <Animated.View style={[styles.selectorBg, { transform: [{ scale }] }]}>
            <View style={[styles.ring, { backgroundColor: SB.ring1 }]} />
            <View style={[styles.ring, { backgroundColor: SB.ring2, width: 68, height: 68, borderRadius: 34 }]} />
            <View style={[styles.ring, { backgroundColor: SB.ring3, width: 62, height: 62, borderRadius: 31 }]} />
            <View style={[styles.ring, { backgroundColor: SB.ring4, width: 56, height: 56, borderRadius: 28 }]} />
            <View style={[styles.core]} />
            <Animated.View style={[styles.selectorGlow, { opacity: glowOpacity }]} />
          </Animated.View>
        </Animated.View>

        {/* Иконки */}
        {TABS.map((t, index) => {
          const focused = index === active;
          const pressScale = pressScales[index] || new Animated.Value(1);

          const onPressIn  = () => Animated.spring(pressScale, { toValue: 0.92, useNativeDriver: true }).start();
          const onPressOut = () => Animated.spring(pressScale, { toValue: 1,    useNativeDriver: true }).start();

          return (
            <Pressable
              key={t.key ?? String(index)}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              onPress={() => onPress?.(t.key)}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              style={[styles.tab, { width: tabW }]}
              android_ripple={
                Platform.OS === 'android'
                  ? { color: 'rgba(124,77,255,0.18)', borderless: true, radius: 28 }
                  : undefined
              }
            >
              <Animated.View
                style={[
                  styles.iconContainer,
                  focused && styles.iconContainerActive,
                  { transform: [{ scale: pressScale }] },
                ]}
              >
                <Image
                  source={t.icon}
                  style={[styles.icon, !focused && { opacity: SB.iconOff }]}
                  resizeMode="contain"
                />
              </Animated.View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    alignItems: 'center',
  },
  bg: {
    height: 92,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 46,
    backgroundColor: SB.barBg,
    borderWidth: 1.5,
    borderColor: SB.barEdge,
    shadowColor: SB.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  innerTop: {
    position: 'absolute',
    left: 6, right: 6, top: 6,
    height: 22,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    backgroundColor: SB.innerTop,
  },

  tab: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  iconContainer: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  iconContainerActive: {
    shadowColor: SB.ring4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 8,
  },
  icon: { width: 44, height: 44 },

  // позиция селектора
  selectorSlot: {
    position: 'absolute',
    top: 8, bottom: 8, left: 0, right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    width: 76,
    height: 76,
  },
  selectorBg: {
    width: 76, height: 76, borderRadius: 38,
    alignItems: 'center', justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 74, height: 74, borderRadius: 37,
  },
  core: {
    position: 'absolute',
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: SB.core,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)',
  },
  selectorGlow: {
    position: 'absolute',
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: SB.glow,
  },

  // «лучи» вокруг активной вкладки
  rays: {
    position: 'absolute',
    width: 90, height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ray: {
    position: 'absolute',
    width: 56, height: 10,
    borderRadius: 5,
    backgroundColor: SB.ray,
  },
});
