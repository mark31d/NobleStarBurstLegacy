// Components/FavoritesScreen.js — Catch the Stars (NO gradients, safe-area, bg.webp)
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Image, ImageBackground, Pressable, StyleSheet,
  Dimensions, ScrollView, Platform, Alert,
} from 'react-native';
import { GameEngine } from 'react-native-game-engine';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

/* ─ palette (single colors) ─ */
const PALETTE = {
  space:  '#071022',
  panel1: 'rgba(12,18,36,0.92)',
  panel2: 'rgba(10,12,24,0.86)',
  areaBg: '#0E1630',
  areaBg2:'#101C3C',
  accent: '#FF6A3D',
  gold:   '#FFD34D',
  purple: '#7C4DFF',
  line:   'rgba(255,255,255,0.16)',
  text:   '#FFFFFF',
  dim:    'rgba(255,255,255,0.84)',
};
const BG       = require('../assets/onb.webp');
const STAR_IMG = require('../assets/ic_tab2.webp');

/* ─ storage ─ */
const STARS_KEY          = 'bsp:stars';
const LAST_TS_KEY        = 'bsp:stars:lastTs';
const COOLDOWN_MS        = 10 * 60 * 1000; // 10 минут
const FACTS_UNLOCKED_KEY = 'bsp:egyptFacts:unlockedCount';

/* ─ gameplay ─ */
const AREA_H   = 380;
const GAME_MS  = 20000;
const SPAWN_MS = 520;
const STAR_MIN = 26;
const STAR_MAX = 46;
const V_MIN    = 180;
const V_MAX    = 320;
const PAD      = 8;

const CATCH_W  = 120;
const CATCH_H  = 28;

/* ─ helpers ─ */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand  = (a, b) => a + Math.random() * (b - a);
const { width: SCREEN_W } = Dimensions.get('window');
const mmss = (sec) => `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;

/* ─ facts ─ */
const EGYPT_FACTS = [
  "The Nile flows from south to north and was the lifeline of Ancient Egypt.",
  "Ancient Egyptians invented one of the earliest forms of writing: hieroglyphs.",
  "Pyramids were not built by slaves but by paid workers and farmers during the off-season.",
  "The Great Pyramid of Giza was the tallest human-made structure for over 3,800 years.",
  "Cats were revered; harming a cat could be punished, even if accidental.",
  "Pharaohs were considered divine intermediaries between gods and people.",
  "Papyrus—made from reeds along the Nile—was the world’s first mass-used writing material.",
  "The afterlife was central to Egyptian belief; hearts were weighed against the feather of Maat.",
  "Queen Hatshepsut expanded trade routes, especially to the Land of Punt.",
  "Akhenaten briefly introduced monotheistic worship of the sun disk Aten.",
  "Egyptian doctors practiced advanced medicine, including surgery and dentistry.",
  "Obelisks were single pieces of stone carved to honor the sun god Ra.",
  "The Rosetta Stone helped modern scholars decipher hieroglyphs.",
  "Workers in Deir el-Medina left the first recorded labor strike in history.",
  "Cleopatra VII spoke several languages and was a skilled diplomat and strategist.",
];
const FACT_COSTS = [3,5,8,12,18,25,30,40,50,60,70,85,100,120,150];

/* ─ Renderers (без градиентов) ─ */
const CatcherRenderer = ({ x, y, size=[CATCH_W, CATCH_H] }) => {
  const left = x - size[0]/2;
  const top  = y - size[1]/2;
  return (
    <View
      style={{
        position:'absolute', left, top, width:size[0], height:size[1],
        borderRadius:14, borderWidth:1.5, borderColor:'rgba(255,255,255,0.25)',
        backgroundColor:'rgba(255,255,255,0.12)',
      }}
    />
  );
};

const StarRenderer = ({ x, y, size=[36,36] }) => (
  <Image
    source={STAR_IMG}
    style={{ position:'absolute', left:x - size[0]/2, top:y - size[1]/2, width:size[0], height:size[1], resizeMode:'contain' }}
  />
);

/* ─ GameEngine systems ─ */
const TouchControl = (entities, { touches }) => {
  const { bounds } = entities;
  const catcher = entities.catcher;
  if (!catcher) return entities;

  const moves = touches.filter(t => t.type === 'move' || t.type === 'start');
  if (moves.length) {
    const t = moves[moves.length - 1];
    const pageX  = t.event?.pageX ?? (bounds.pageX + (t.event?.locationX ?? bounds.w/2));
    const localX = clamp(pageX - bounds.pageX, 0, bounds.w);
    catcher.x = clamp(bounds.x + localX, bounds.x + CATCH_W/2, bounds.x + bounds.w - CATCH_W/2);
  }
  return entities;
};
const SpawnStars = (entities, { time }) => {
  const sp = entities.spawner;
  if (sp.lastSpawnAt == null) { sp.lastSpawnAt = time.current; sp.nextSpawnIn = 200; return entities; }
  if (time.current - sp.lastSpawnAt >= sp.nextSpawnIn) {
    const id   = `star_${Math.random().toString(36).slice(2)}`;
    const size = Math.round(rand(STAR_MIN, STAR_MAX));
    const x    = entities.bounds.x + rand(size/2, entities.bounds.w - size/2);
    const y    = entities.bounds.y - size;
    entities[id] = { x, y, vy: rand(V_MIN, V_MAX), size:[size,size], renderer: StarRenderer };
    sp.lastSpawnAt = time.current; sp.nextSpawnIn = SPAWN_MS;
  }
  return entities;
};
const MoveStars = (entities, { time }) => {
  const { bounds } = entities;
  Object.keys(entities).forEach(k => {
    if (!k.startsWith('star_')) return;
    const s = entities[k];
    s.y += (s.vy || 0) * (time.delta / 1000);
    if (s.y - (s.size[1]/2) > bounds.y + bounds.h + 40) delete entities[k];
  });
  return entities;
};
const Collisions = (entities, { dispatch }) => {
  const c = entities.catcher; if (!c) return entities;
  const x1 = c.x - CATCH_W/2, y1 = c.y - CATCH_H/2;
  const x2 = x1 + CATCH_W,    y2 = y1 + CATCH_H;
  Object.keys(entities).forEach(k => {
    if (!k.startsWith('star_')) return;
    const s = entities[k];
    const sx1 = s.x - s.size[0]/2, sy1 = s.y - s.size[1]/2;
    const sx2 = sx1 + s.size[0],   sy2 = sy1 + s.size[1];
    const hit = !(sx2 < x1 || sx1 > x2 || sy2 < y1 || sy1 > y2);
    if (hit) { dispatch({ type:'caught', value:1 }); delete entities[k]; }
  });
  return entities;
};

/* ─ Screen ─ */
export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();

  // Если таб-бар перекрывает контент — добавляем inset для скролла (НЕ padding)
  const TABBAR_OVERLAY = 110;
  const bottomInsetForScroll = Math.max(insets.bottom + TABBAR_OVERLAY, 130);

  const areaW = useMemo(() => Math.max(260, Math.round(SCREEN_W - 32)), []);
  const areaX = (SCREEN_W - areaW) / 2;

  const [canPlay, setCanPlay]   = useState(true);
  const [coolLeft, setCoolLeft] = useState(0);
  const [playing, setPlaying]   = useState(false);
  const [score, setScore]       = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_MS/1000);
  const [result, setResult]     = useState(null);

  const [totalStars, setTotalStars]       = useState(0);
  const [factsUnlocked, setFactsUnlocked] = useState(0);

  const gameRef = useRef({ timer:null });
  const [entities, setEntities] = useState(null);
  const scoreRef = useRef(0);
  useEffect(() => { scoreRef.current = score; }, [score]);

  // balances & facts
  useEffect(() => {
    (async () => {
      try {
        const [[,curRaw],[,factsRaw]] = await AsyncStorage.multiGet([STARS_KEY, FACTS_UNLOCKED_KEY]);
        setTotalStars(curRaw ? (parseInt(curRaw,10)||0) : 0);
        setFactsUnlocked(factsRaw ? (parseInt(factsRaw,10)||0) : 0);
      } catch {}
    })();
  }, []);

  // cooldown ticker
  useEffect(() => {
    let mounted = true;
    const tick = async () => {
      try {
        const raw = await AsyncStorage.getItem(LAST_TS_KEY);
        const last = raw ? parseInt(raw,10)||0 : 0;
        const leftMs = Math.max(0, COOLDOWN_MS - (Date.now() - last));
        const leftSec = Math.ceil(leftMs/1000);
        if (!mounted) return;
        setCoolLeft(leftSec); setCanPlay(leftSec <= 0);
      } catch { if (!mounted) return; setCoolLeft(0); setCanPlay(true); }
    };
    tick(); const id = setInterval(tick, 1000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  // entities factory
  const makeEntities = useCallback(() => {
    // pageX для корректного тача: учтём отступы карточки (margin 16 + padding 14)
    const containerLeft = 16 + 14;
    const bounds = { x: containerLeft, y: 0, w: SCREEN_W - containerLeft*2, h: AREA_H, pageX: containerLeft };
    const catcher = {
      x: bounds.x + bounds.w/2,
      y: bounds.y + bounds.h - PAD - CATCH_H/2,
      size: [CATCH_W, CATCH_H],
      renderer: CatcherRenderer,
    };
    return { bounds, spawner: { lastSpawnAt:null, nextSpawnIn: SPAWN_MS }, catcher };
  }, []);

  const startGame = useCallback(() => {
    if (!canPlay || playing) return;
    setPlaying(true); setScore(0); setTimeLeft(GAME_MS/1000); setResult(null);
    setEntities(makeEntities());

    const startedAt = Date.now();
    const t = setInterval(() => {
      const left = Math.max(0, GAME_MS - (Date.now() - startedAt));
      setTimeLeft(Math.ceil(left/1000));
      if (left <= 0) { clearInterval(t); endGame(scoreRef.current); }
    }, 1000);
    gameRef.current.timer = t;
  }, [canPlay, playing, makeEntities]);

  const endGame = useCallback(async (earned) => {
    const reward = Math.max(0, Math.floor(earned));
    setPlaying(false); setResult(reward);
    try {
      const next = totalStars + reward;
      await AsyncStorage.multiSet([[STARS_KEY, String(next)], [LAST_TS_KEY, String(Date.now())]]);
      setTotalStars(next);
    } catch {}
    if (gameRef.current.timer) { clearInterval(gameRef.current.timer); gameRef.current.timer = null; }
  }, [totalStars]);

  useEffect(() => () => { if (gameRef.current.timer) clearInterval(gameRef.current.timer); }, []);
  const onEvent = useCallback((e) => { if (e?.type === 'caught') setScore(s => s + (e.value || 1)); }, []);

  // facts
  const nextCost = FACT_COSTS[factsUnlocked] ?? null;
  const canUnlockMore = factsUnlocked < EGYPT_FACTS.length;
  const unlockNextFact = useCallback(async () => {
    if (!canUnlockMore || nextCost == null) return;
    if (totalStars < nextCost) { Alert.alert('Not enough stars', `You need ${nextCost}★ to unlock the next fact.`); return; }
    try {
      const newStars = totalStars - nextCost;
      const newCount = Math.min(factsUnlocked + 1, EGYPT_FACTS.length);
      await AsyncStorage.multiSet([[STARS_KEY, String(newStars)], [FACTS_UNLOCKED_KEY, String(newCount)]]);
      setTotalStars(newStars); setFactsUnlocked(newCount);
    } catch {}
  }, [canUnlockMore, nextCost, totalStars, factsUnlocked]);

  /* ─ UI ─ */
  return (
    <View style={ui.root}>
      <ImageBackground source={BG} style={ui.bg} resizeMode="cover">
        <SafeAreaView style={{ flex:1 }} edges={['top']}>
          <ScrollView
            style={{ flex:1 }}
            contentContainerStyle={ui.scroll}
            contentInset={{ bottom: bottomInsetForScroll, top: 0 }}
            scrollIndicatorInsets={{ bottom: bottomInsetForScroll, top: 0 }}
            contentInsetAdjustmentBehavior="always"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            scrollEnabled={!playing}
          >
            {/* Header */}
            <View style={ui.header}>
              <View style={ui.titleBadge}>
                <Text style={ui.title}>Catch the Stars</Text>
              </View>
              <View style={ui.balance}>
                <Image source={STAR_IMG} style={{ width:22, height:22, marginRight:6 }} />
                <Text style={ui.balanceTxt}>{totalStars}★</Text>
              </View>
            </View>

            {/* Game card */}
            <View style={[ui.card, ui.shadowSoft]}>
              <Text style={ui.desc}>
                {playing ? 'Drag left/right to catch as many stars as you can!'
                         : (canPlay ? 'Play 20 seconds to earn star points.' : `Next play in ${mmss(coolLeft)}`)}
              </Text>

              <View style={ui.statusRow}>
                <View style={ui.pill}><Text style={ui.pillTxt}>Score: {score}</Text></View>
                <View style={[ui.pill, { borderColor: PALETTE.accent }]}><Text style={ui.pillTxt}>Time: {timeLeft}s</Text></View>
                {!canPlay && <View style={[ui.pill, { borderColor: PALETTE.gold }]}><Text style={ui.pillTxt}>{mmss(coolLeft)}</Text></View>}
              </View>

              {/* Игровая зона */}
              <View style={ui.areaContainer}>
                <View style={ui.areaGlow} pointerEvents="none" />
                <View style={[ui.area, { height: AREA_H }]}>
                  <View style={ui.areaFill}>
                    {entities && playing ? (
                      <GameEngine
                        style={{ flex:1 }}
                        systems={[TouchControl, SpawnStars, MoveStars, Collisions]}
                        entities={entities}
                        onEvent={onEvent}
                        running
                      />
                    ) : <View style={{ flex:1 }} />}
                  </View>
                </View>
              </View>

              {!playing && (
                <Pressable
                  onPress={canPlay ? startGame : undefined}
                  style={({ pressed }) => [
                    btn.bg,
                    { opacity: canPlay ? 1 : 0.45, transform:[{ translateY: pressed && canPlay ? 1 : 0 }] },
                  ]}
                  hitSlop={10}
                >
                  <Text style={btn.label}>
                    {canPlay ? (result != null ? `You earned +${result}★` : 'PLAY') : `WAIT ${mmss(coolLeft)}`}
                  </Text>
                </Pressable>
              )}
            </View>

            {/* Facts */}
            <View style={[ui.card, ui.shadowSoft, { marginTop:14 }]}>
              <View style={ui.factsHead}>
                <Text style={ui.factsTitle}>Egypt Trivia</Text>
                <View style={{ flexDirection:'row', alignItems:'center' }}>
                  <Image source={STAR_IMG} style={{ width:18, height:18, marginRight:6 }} />
                  <Text style={ui.factsSub}>{factsUnlocked}/{EGYPT_FACTS.length} unlocked</Text>
                </View>
              </View>

              <View style={ui.unlockRow}>
                {canUnlockMore ? (
                  <>
                    <Text style={ui.unlockTxt}>Unlock next fact for</Text>
                    <View style={ui.costPill}>
                      <Image source={STAR_IMG} style={{ width:16, height:16, marginRight:4 }} />
                      <Text style={ui.costTxt}>{nextCost}★</Text>
                    </View>
                    <Pressable
                      onPress={totalStars < (nextCost ?? Infinity) ? undefined : unlockNextFact}
                      style={mini.btn}
                      hitSlop={10}
                    >
                      <Text style={mini.label}>Unlock</Text>
                    </Pressable>
                  </>
                ) : (
                  <Text style={ui.unlockTxt}>All facts unlocked — great!</Text>
                )}
              </View>

              {factsUnlocked === 0 ? (
                <Text style={ui.factEmpty}>Catch and spend stars to reveal fun facts about Ancient Egypt.</Text>
              ) : (
                <View style={{ marginTop: 6 }}>
                  {EGYPT_FACTS.slice(0, factsUnlocked).map((f, i) => (
                    <View key={i} style={ui.factItem}>
                      <View style={ui.dot} />
                      <Text style={ui.factTxt}>{f}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Footer spacer под таб-бар — НЕ padding */}
            <View style={{ height: bottomInsetForScroll }} />
          </ScrollView>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

/* ─ styles ─ */
const ui = StyleSheet.create({
  root:{ flex:1, backgroundColor:PALETTE.space },
  bg:{ flex:1 },

  scroll:{ paddingHorizontal:16 },

  header:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:10 },
  titleBadge:{ paddingHorizontal:12, paddingVertical:6, borderRadius:12, backgroundColor:'rgba(255,255,255,0.08)', borderWidth:1, borderColor:PALETTE.line },
  title:{ color:PALETTE.text, fontSize:20, fontWeight:'900' },
  balance:{ flexDirection:'row', alignItems:'center', backgroundColor:'rgba(0,0,0,0.35)', borderWidth:1, borderColor:PALETTE.line, paddingHorizontal:10, paddingVertical:6, borderRadius:12 },
  balanceTxt:{ color:PALETTE.text, fontWeight:'900' },

  card:{ backgroundColor: PALETTE.panel1, borderRadius:22, borderWidth:1.5, borderColor:PALETTE.line, padding:14 },
  desc:{ color:PALETTE.dim, marginBottom:10, textAlign:'center' },

  statusRow:{ flexDirection:'row', justifyContent:'center', flexWrap:'wrap', marginBottom:10 },
  pill:{ paddingHorizontal:10, paddingVertical:6, borderRadius:12, borderWidth:1.5, backgroundColor:'rgba(0,0,0,0.25)', marginHorizontal:4, marginBottom:6 },
  pillTxt:{ color:PALETTE.text, fontWeight:'800' },

  areaContainer:{ position:'relative', marginBottom:12 },
  area:{ borderRadius:20, borderWidth:1.5, borderColor:PALETTE.line, overflow:'hidden', backgroundColor:PALETTE.areaBg2 },
  areaFill:{ flex:1, backgroundColor:PALETTE.areaBg },

  // маленькая подсветка рамки (без градиента)
  areaGlow:{
    position:'absolute', left:-20, right:-20, top:-20, bottom:-20,
    shadowColor:'#000', shadowOpacity:0.25, shadowRadius:12, shadowOffset:{ width:0, height:2 }
  },

  /* facts */
  factsHead:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:8 },
  factsTitle:{ color:PALETTE.gold, fontSize:18, fontWeight:'900' },
  factsSub:{ color:PALETTE.dim, fontWeight:'800' },

  unlockRow:{ flexDirection:'row', alignItems:'center', flexWrap:'wrap', marginBottom:10 },
  unlockTxt:{ color:PALETTE.dim, fontWeight:'700', marginRight:8, marginBottom:8 },
  costPill:{ flexDirection:'row', alignItems:'center', borderWidth:1, borderColor:PALETTE.line, backgroundColor:'rgba(255,255,255,0.06)', paddingHorizontal:10, paddingVertical:6, borderRadius:12, marginRight:8, marginBottom:8 },
  costTxt:{ color:PALETTE.text, fontWeight:'900' },

  factItem:{ flexDirection:'row', alignItems:'flex-start', marginBottom:8 },
  dot:{ width:6, height:6, borderRadius:3, backgroundColor:PALETTE.gold, marginTop:8, marginRight:8 },
  factTxt:{ color:PALETTE.dim, flex:1, lineHeight:20 },
  factEmpty:{ color:PALETTE.dim },

  shadowSoft: Platform.select({
    ios:{ shadowColor:'#000', shadowOpacity:0.35, shadowRadius:10, shadowOffset:{ width:0, height:4 } },
    android:{ elevation:6 }
  }),
});

const btn = StyleSheet.create({
  bg:{
    height:92, borderRadius:18, alignItems:'center', justifyContent:'center',
    backgroundColor: PALETTE.accent, borderWidth:1, borderColor:'rgba(0,0,0,0.25)',
    marginTop: 4,
  },
  label:{ color:'#0D0F1A', fontSize:20, fontWeight:'900' },
});

const mini = StyleSheet.create({
  btn:{
    paddingHorizontal:14, paddingVertical:8, borderRadius:12,
    backgroundColor: PALETTE.purple, borderWidth:1, borderColor:'rgba(0,0,0,0.2)', marginBottom:8
  },
  label:{ color:'#0D0F1A', fontWeight:'900' },
});
