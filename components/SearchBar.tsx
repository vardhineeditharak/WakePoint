import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWakePoint, PRESET_DESTINATIONS, PresetLocation, Destination } from '../context/WakePointContext';

interface SearchBarProps {
  onCenterUserLocation: () => void;
  onCenterDestination?: () => void;
}

type PresetCategory = 'All' | 'Metro' | 'Airport' | 'Train' | 'Tech Hub';

const CATEGORIES: PresetCategory[] = ['All', 'Metro', 'Airport', 'Train', 'Tech Hub'];

export const SearchBar: React.FC<SearchBarProps> = ({
  onCenterUserLocation,
  onCenterDestination,
}) => {
  const insets = useSafeAreaInsets();
  const topOffset = Math.max(insets.top, 16) + 6;
  const {
    searchQuery,
    searchResults,
    isSearching,
    searchDestinations,
    selectPresetDestination,
    setIsSearchFocused,
  } = useWakePoint();

  const [inputText, setInputText] = useState(searchQuery);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<PresetCategory>('All');
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

  const handleDismissDropdown = () => {
    setIsFocused(false);
    setIsSearchFocused(false);
    Keyboard.dismiss();
  };

  const handleSelectDestination = (item: Destination | PresetLocation) => {
    selectPresetDestination(item as any);
    setInputText('');
    handleDismissDropdown();
  };

  const filteredPresets = useMemo(() => {
    if (selectedCategory === 'All') return PRESET_DESTINATIONS;
    if (selectedCategory === 'Metro') {
      return PRESET_DESTINATIONS.filter((p) => p.iconName.includes('subway') || p.title.toLowerCase().includes('metro'));
    }
    if (selectedCategory === 'Airport') {
      return PRESET_DESTINATIONS.filter((p) => p.iconName.includes('airplane') || p.title.toLowerCase().includes('airport'));
    }
    if (selectedCategory === 'Train') {
      return PRESET_DESTINATIONS.filter((p) => p.iconName.includes('train') || p.title.toLowerCase().includes('railway'));
    }
    if (selectedCategory === 'Tech Hub') {
      return PRESET_DESTINATIONS.filter((p) => p.iconName.includes('business') || p.iconName.includes('chip') || p.iconName.includes('laptop'));
    }
    return PRESET_DESTINATIONS;
  }, [selectedCategory]);

  return (
    <>
      {/* Invisible backdrop when focused to safely dismiss keyboard without race conditions */}
      {isFocused && (
        <TouchableWithoutFeedback onPress={handleDismissDropdown}>
          <View style={StyleSheet.absoluteFillObject} />
        </TouchableWithoutFeedback>
      )}

      <View style={[styles.container, { top: topOffset }]} pointerEvents="box-none">
        {/* Search Input Bar */}
        <View style={[styles.searchCard, isFocused && styles.searchCardFocused]}>
          <Ionicons name="search" size={18} color="#818CF8" style={styles.searchIcon} />

          <TextInput
            style={styles.input}
            placeholder="Search destination or transit stop..."
            placeholderTextColor="#64748B"
            value={inputText}
            onChangeText={handleInputChange}
            onFocus={() => {
              setIsFocused(true);
              setIsSearchFocused(true);
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

          {isFocused ? (
            <TouchableOpacity onPress={handleDismissDropdown} style={styles.cancelTextBtn}>
              <Text style={styles.cancelText}>Done</Text>
            </TouchableOpacity>
          ) : (
            <>
              <View style={styles.divider} />
              <TouchableOpacity
                onPress={onCenterUserLocation}
                style={styles.locationBtn}
                activeOpacity={0.6}
                hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
                accessibilityLabel="Redirect to my location"
              >
                <Ionicons
                  name="navigate"
                  size={18}
                  color="#007AFF"
                />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Autocomplete / Preset Dropdown */}
        {isFocused && (
          <View style={styles.dropdown}>
            {/* Quick Category Filter Chips */}
            {searchResults.length === 0 && (
              <View style={styles.categoryRow}>
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                      onPress={() => setSelectedCategory(cat)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextSelected]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <Text style={styles.dropdownHeader}>
              {searchResults.length > 0 ? `Search Results (${searchResults.length})` : `${selectedCategory} Presets`}
            </Text>

            <FlatList
              data={searchResults.length > 0 ? searchResults : filteredPresets}
              keyExtractor={(item, index): string => {
                if ('id' in item && typeof item.id === 'string') {
                  return item.id;
                }
                return `item_${item.latitude}_${item.longitude}_${index}`;
              }}
              keyboardShouldPersistTaps="always"
              renderItem={({ item }) => {
                const isPreset = 'iconName' in item;
                return (
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => handleSelectDestination(item)}
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
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
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
  cancelTextBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cancelText: {
    color: '#818CF8',
    fontSize: 13,
    fontWeight: '700',
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: '#334155',
    marginHorizontal: 8,
  },
  locationBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdown: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    marginTop: 8,
    maxHeight: 280,
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  categoryRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    gap: 6,
    marginBottom: 6,
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  categoryChipSelected: {
    backgroundColor: '#6366F1',
    borderColor: '#818CF8',
  },
  categoryChipText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
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
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.25)',
  },
  itemIconContainer: {
    width: 30,
    height: 30,
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
