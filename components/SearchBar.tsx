import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWakePoint, PRESET_DESTINATIONS, PresetLocation } from '../context/WakePointContext';

interface SearchBarProps {
  onCenterUserLocation: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onCenterUserLocation }) => {
  const insets = useSafeAreaInsets();
  const topOffset = Math.max(insets.top, 16) + 6;
  const {
    searchQuery,
    searchResults,
    isSearching,
    searchDestinations,
    selectPresetDestination,
    getCurrentLocation,
    setIsSearchFocused,
  } = useWakePoint();

  const [inputText, setInputText] = useState(searchQuery);
  const [isFocused, setIsFocused] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setInputText(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleInputChange = (text: string) => {
    setInputText(text);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      searchDestinations(text);
    }, 300);
  };

  const handleClear = () => {
    setInputText('');
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    searchDestinations('');
  };

  const handleSelectPreset = (item: PresetLocation) => {
    selectPresetDestination(item);
    setInputText('');
    setIsFocused(false);
    setIsSearchFocused(false);
  };

  return (
    <View style={[styles.container, { top: topOffset }]}>
      {/* Search Input Bar */}
      <View style={[styles.searchCard, isFocused && styles.searchCardFocused]}>
        <Ionicons name="search" size={18} color="#818CF8" style={styles.searchIcon} />

        <TextInput
          style={styles.input}
          placeholder="Search destination or address..."
          placeholderTextColor="#64748B"
          value={inputText}
          onChangeText={handleInputChange}
          onFocus={() => {
            setIsFocused(true);
            setIsSearchFocused(true);
          }}
          onBlur={() => {
            setTimeout(() => {
              setIsFocused(false);
              setIsSearchFocused(false);
            }, 250);
          }}
          returnKeyType="search"
          autoCorrect={false}
        />

        {isSearching ? (
          <ActivityIndicator size="small" color="#6366F1" style={styles.actionBtn} />
        ) : inputText.length > 0 ? (
          <TouchableOpacity onPress={handleClear} style={styles.actionBtn}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        ) : null}

        <View style={styles.divider} />

        <TouchableOpacity
          onPress={() => {
            onCenterUserLocation();
            getCurrentLocation();
          }}
          style={styles.locationBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="navigate-circle-sharp" size={24} color="#6366F1" />
        </TouchableOpacity>
      </View>

      {/* Autocomplete / Preset Dropdown */}
      {isFocused && (
        <View style={styles.dropdown}>
          <Text style={styles.dropdownHeader}>
            {searchResults.length > 0 ? 'Search Results' : 'Popular Destinations'}
          </Text>

          <FlatList
            data={searchResults.length > 0 ? searchResults : PRESET_DESTINATIONS}
            keyExtractor={(item, index): string => {
              if ('id' in item && typeof item.id === 'string') {
                return item.id;
              }
              return `res_${index}`;
            }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const isPreset = 'iconName' in item;
              return (
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => handleSelectPreset(item as PresetLocation)}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemIconContainer}>
                    <Ionicons
                      name={isPreset ? (item as any).iconName : 'location-sharp'}
                      size={16}
                      color="#818CF8"
                    />
                  </View>
                  <View style={styles.itemTextContainer}>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.itemAddress} numberOfLines={1}>
                      {item.address}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color="#475569" />
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 100,
  },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  searchCardFocused: {
    borderColor: '#6366F1',
    backgroundColor: '#0F172A',
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '500',
    height: 36,
  },
  actionBtn: {
    padding: 4,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: '#334155',
    marginHorizontal: 8,
  },
  locationBtn: {
    padding: 2,
  },
  dropdown: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    marginTop: 8,
    maxHeight: 250,
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  dropdownHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.25)',
  },
  itemIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  itemAddress: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 1,
  },
});
