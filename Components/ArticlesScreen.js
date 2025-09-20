// Components/ArticlesScreen.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  Image, ImageBackground, Pressable, Dimensions,
  Modal, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: W } = Dimensions.get('window');

const BR = {
  text: '#D4AF37',
  sub:  '#F5F5DC',
};

const BG_ONB   = require('../assets/onb.webp');
const CARD_BG  = require('../assets/article_container.webp');
const BOOKMARK = require('../assets/bookmark.webp');
const BOOKMARK2 = require('../assets/bookmark2.webp');

const portraits = [
  require('../assets/person1.webp'),
  require('../assets/person2.webp'),
  require('../assets/person3.webp'),
  require('../assets/person4.webp'),
  require('../assets/person5.webp'),
  require('../assets/person6.webp'),
  require('../assets/person7.webp'),
  require('../assets/person8.webp'),
  require('../assets/person9.webp'),
  require('../assets/person10.webp'),
];

const ARTICLES_META = [
  { id: 'hatshepsut',  title: 'Hatshepsut',    subtitle: '(c. 1507–1458 BCE)', img: portraits[0] },
  { id: 'nefertiti',   title: 'Nefertiti',     subtitle: '(c. 1370–1330 BCE)', img: portraits[1] },
  { id: 'cleopatra',   title: 'Cleopatra VII', subtitle: '(69–30 BCE)',        img: portraits[2] },
  { id: 'nefertari',   title: 'Nefertari',     subtitle: '(c. 1290–1255 BCE)', img: portraits[3] },
  { id: 'ahhotep',     title: 'Ahhotep I',     subtitle: '(c. 1560–1530 BCE)', img: portraits[4] },
  { id: 'sobekneferu', title: 'Sobekneferu',   subtitle: '(c. 1806–1802 BCE)', img: portraits[5] },
  { id: 'ankhesenamun',title: 'Ankhesenamun',  subtitle: '(c. 1348–1322 BCE)', img: portraits[6] },
  { id: 'tiye',        title: 'Tiye',          subtitle: '(c. 1398–1338 BCE)', img: portraits[7] },
  { id: 'merneith',    title: 'Merneith',      subtitle: '(c. 3000 BCE)',      img: portraits[8] },
  { id: 'twosret',     title: 'Twosret',       subtitle: '(c. 1191–1189 BCE)', img: portraits[9] },
  
  // Дополнительные статьи с циклическим использованием портретов
  { id: 'nitiqret',    title: 'Nitiqret',      subtitle: '(c. 2184–2181 BCE)', img: portraits[0] },
  { id: 'khentkaus',   title: 'Khentkaus I',   subtitle: '(c. 2494–2487 BCE)', img: portraits[1] },
  { id: 'nitocris',    title: 'Nitocris',      subtitle: '(c. 2184–2181 BCE)', img: portraits[2] },
  { id: 'sheshonq',    title: 'Sheshonq I',    subtitle: '(c. 945–924 BCE)',   img: portraits[3] },
  { id: 'psusennes',   title: 'Psusennes I',   subtitle: '(c. 1039–991 BCE)',  img: portraits[4] },
  { id: 'ramesses',    title: 'Ramesses II',   subtitle: '(c. 1279–1213 BCE)', img: portraits[5] },
  { id: 'tutankhamun', title: 'Tutankhamun',   subtitle: '(c. 1332–1323 BCE)', img: portraits[6] },
  { id: 'akhenaten',   title: 'Akhenaten',     subtitle: '(c. 1353–1336 BCE)', img: portraits[7] },
  { id: 'amenhotep',   title: 'Amenhotep III', subtitle: '(c. 1386–1349 BCE)', img: portraits[8] },
  { id: 'thutmose',    title: 'Thutmose III',  subtitle: '(c. 1479–1425 BCE)', img: portraits[9] },
  
  // Еще больше статей
  { id: 'horemheb',    title: 'Horemheb',      subtitle: '(c. 1319–1292 BCE)', img: portraits[0] },
  { id: 'ay',          title: 'Ay',            subtitle: '(c. 1323–1319 BCE)', img: portraits[1] },
  { id: 'seti',        title: 'Seti I',        subtitle: '(c. 1290–1279 BCE)', img: portraits[2] },
  { id: 'merenptah',   title: 'Merenptah',     subtitle: '(c. 1213–1203 BCE)', img: portraits[3] },
  { id: 'ramesses3',   title: 'Ramesses III',  subtitle: '(c. 1186–1155 BCE)', img: portraits[4] },
  { id: 'ramesses4',   title: 'Ramesses IV',   subtitle: '(c. 1155–1149 BCE)', img: portraits[5] },
  { id: 'ramesses5',   title: 'Ramesses V',    subtitle: '(c. 1149–1145 BCE)', img: portraits[6] },
  { id: 'ramesses6',   title: 'Ramesses VI',   subtitle: '(c. 1145–1137 BCE)', img: portraits[7] },
  { id: 'ramesses7',   title: 'Ramesses VII',  subtitle: '(c. 1137–1130 BCE)', img: portraits[8] },
  { id: 'ramesses8',   title: 'Ramesses VIII', subtitle: '(c. 1130–1129 BCE)', img: portraits[9] },
];

const STORAGE_FAVS = 'nql:articleFavs';

export default function ArticlesScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [favs, setFavs] = useState(new Set());
  const [showSavedModal, setShowSavedModal] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_FAVS);
        if (raw) setFavs(new Set(JSON.parse(raw)));
      } catch {}
    })();
  }, []);

  const saveFavs = useCallback(async (next) => {
    setFavs(next);
    try { await AsyncStorage.setItem(STORAGE_FAVS, JSON.stringify([...next])); } catch {}
  }, []);

  const toggleFav = (id) => {
    const next = new Set(favs);
    next.has(id) ? next.delete(id) : next.add(id);
    saveFavs(next);
  };

  const data = useMemo(() => ARTICLES_META.map(x => ({ ...x, isFav: favs.has(x.id) })), [favs]);
  const savedData = useMemo(() => data.filter(x => x.isFav), [data]);

  return (
    <View style={styles.wrap}>
      <ImageBackground source={BG_ONB} style={styles.bg} resizeMode="cover">
        <SafeAreaView style={{ flex:1 }} edges={['top']}>
          {/* Кнопка для показа сохраненных */}
          <Pressable 
            style={[styles.savedButton, { marginTop: Math.max(insets.top, 16) }]}
            onPress={() => setShowSavedModal(true)}
          >
            <Text style={styles.savedButtonText}>
              Saved ({savedData.length})
            </Text>
          </Pressable>

          <FlatList
            data={data}
            keyExtractor={(it) => it.id}
            contentContainerStyle={{ 
              paddingBottom: Math.max(insets.bottom, 120), 
              paddingTop: 8 
            }}
            contentInset={{ bottom: Math.max(insets.bottom, 120) }}
            scrollIndicatorInsets={{ bottom: Math.max(insets.bottom, 120) }}
            contentInsetAdjustmentBehavior="always"
            renderItem={({ item }) => (
            <Pressable 
              style={styles.cardWrap} 
              onPress={() => {
                navigation.navigate('ArticleDetail', { article: item });
              }}
            >
              <ImageBackground source={CARD_BG} resizeMode="stretch" style={styles.cardBg}>
                {/* Букмарк: правый верх ВНУТРИ контейнера */}
                <Pressable
                  onPress={(e) => { e.stopPropagation(); toggleFav(item.id); }}
                  hitSlop={10}
                  style={styles.bookmarkBox}
                >
                  <Image
                    source={item.isFav ? BOOKMARK2 : BOOKMARK}
                    style={styles.bookmarkImg}
                    resizeMode="contain"
                  />
                </Pressable>

                {/* Контент — с запасом справа, чтобы не перекрывался букмарком */}
                <View style={styles.row}>
                  <Image source={item.img} style={styles.portrait} resizeMode="contain" />
                  <View style={styles.textContainer}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.subtitle}>{item.subtitle}</Text>
                  </View>
                </View>
              </ImageBackground>
            </Pressable>
          )}
          />

          {/* Footer spacer под таб-бар */}
          <View style={{ height: Math.max(insets.bottom, 120) }} />
        </SafeAreaView>

        {/* Модальное окно с сохраненными */}
        <Modal
          visible={showSavedModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowSavedModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Saved Articles</Text>
                <Pressable 
                  style={styles.closeButton}
                  onPress={() => setShowSavedModal(false)}
                >
                  <Text style={styles.closeButtonText}>×</Text>
                </Pressable>
              </View>
              
              <ScrollView style={styles.modalScroll}>
                {savedData.length > 0 ? (
                  savedData.map((item) => (
                    <Pressable
                      key={item.id}
                      style={styles.savedItem}
                      onPress={() => {
                        setShowSavedModal(false);
                        navigation.navigate('ArticleDetail', { article: item });
                      }}
                    >
                      <Image source={item.img} style={styles.savedItemImage} resizeMode="contain" />
                      <View style={styles.savedItemText}>
                        <Text style={styles.savedItemTitle}>{item.title}</Text>
                        <Text style={styles.savedItemSubtitle}>{item.subtitle}</Text>
                      </View>
                    </Pressable>
                  ))
                ) : (
                  <View style={styles.emptySaved}>
                    <Text style={styles.emptySavedText}>No saved articles</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ImageBackground>
    </View>
  );
}

/* ───────── styles ───────── */
const SIDE_PAD   = 0;     // убираем боковые отступы для полной ширины
const CARD_H     = 350;   // еще больше увеличиваем высоту
const PORTRAIT_W = 80;    // еще больше уменьшаем портреты
const BM_W       = 20;    // еще больше уменьшаем размер букмарка
const BM_H       = 26;
const RESERVE_R  = BM_W + 30; // уменьшаем запас справа

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  bg: { flex: 1 },

  cardWrap: {
    width: W - SIDE_PAD * 2,
    alignSelf: 'center',
    marginVertical: 10,
  },
  cardBg: {
    width: '110%',
    height: CARD_H,
    left:-40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom:-100,
  },

  // Контент сдвинут правее и уменьшен
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',  // выравниваем по правому краю
    width: '70%',       // еще больше уменьшаем ширину контента
    alignSelf: 'flex-end',  // выравниваем контейнер по правому краю
    gap: 24,            // увеличиваем промежуток между портретом и текстом
    paddingLeft: 20,    // уменьшаем отступ слева
    paddingRight: 20,   // добавляем отступ справа
    marginRight: 60,    // сдвигаем весь контент правее
  },

  portrait: { width: PORTRAIT_W, height: PORTRAIT_W , right:-15,},

  textContainer: { alignItems: 'center', justifyContent: 'center' },
  title:    { color: BR.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: BR.sub,  fontSize: 14, marginTop: 4, textAlign: 'center' },

  // Букмарк внутри рамки
  bookmarkBox: {
    position: 'absolute',
    top: 20,     // еще больше уменьшаем отступ сверху
    right: 30,   // еще больше уменьшаем отступ справа
    width: BM_W,
    height: BM_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookmarkImg: { width: BM_W, height: BM_H },

  // Кнопка сохраненных
  savedButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.8)',
    marginHorizontal: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.6)',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  savedButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Модальное окно
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: W - 32,
    maxHeight: '80%',
    backgroundColor: 'rgba(10, 6, 2, 0.95)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 130, 246, 0.3)',
  },
  modalTitle: {
    color: BR.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalScroll: {
    maxHeight: 400,
  },
  savedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 130, 246, 0.2)',
  },
  savedItemImage: {
    width: 60,
    height: 60,
    marginRight: 16,
  },
  savedItemText: {
    flex: 1,
  },
  savedItemTitle: {
    color: BR.text,
    fontSize: 16,
    fontWeight: '600',
  },
  savedItemSubtitle: {
    color: BR.sub,
    fontSize: 14,
    marginTop: 4,
  },
  emptySaved: {
    padding: 40,
    alignItems: 'center',
  },
  emptySavedText: {
    color: BR.sub,
    fontSize: 16,
    textAlign: 'center',
  },
});
