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
import { useWaypoint, PRESET_DESTINATIONS, PresetLocation } from '../context/WaypointContext';

interface SearchBarProps {
  onCenterUserLocation: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onCenterUserLocation }) => {
  const {
    searchQuery,
    searchResults,
    isSearching,
    searchDestinations,
    selectPresetDestination,
    destination,
    getCurrentLocation,
  } = useWaypoint();

  const [inputText, setInputText] = useState(searchQuery);
  const [isFocused, setIsFocused] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external search query changes to internal input state
  useEffect(() => {
    setInputText(searchQuery);
  }, [searchQuery]);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  /**
   * 300ms Debounced Keystroke Handler for Komoot Photon API
   */
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
    setIsFocused(false);
  };

  return (
    <View style={styles.container}>
      {/* Floating Main Search Bar Header */}
      <View style={[styles.searchCard, isFocused && styles.searchCardFocused]}>
        <Ionicons name="search-outline" size={20} color="#94A3B8" style={styles.searchIcon} />
        
        <TextInput
          style={styles.input}
          placeholder="Search location (Komoot Photon API)..."
          placeholderTextColor="#64748B"
          value={inputText}
          onChangeText={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          returnKeyType="search"
          autoCorrect={false}
        />

        {isSearching ? (
          <ActivityIndicator size="small" color="#6366F1" style={styles.actionBtn} />
        ) : inputText.length > 0 ? (
          <TouchableOpacity onPress={handleClear} style={styles.actionBtn}>
            <Ionicons name="close-circle-sharp" size={20} color="#94A3B8" />
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
          <Ionicons name="navigate-circle" size={26} color="#6366F1" />
        </TouchableOpacity>
      </View>

      {/* Active Destination Sub-Pill */}
      {destination && (
        <View style={styles.destPill}>
          <Ionicons name="location" size={14} color="#6366F1" />
          <Text style={styles.destPillText} numberOfLines={1}>
            Locked Target: <Text style={styles.destPillBold}>{destination.title}</Text>
          </Text>
        </View>
      )}

      {/* Dropdown Auto-Complete / Preset Suggestions */}
      {isFocused && (
        <View style={styles.dropdown}>
          <Text style={styles.dropdownHeader}>
            {searchResults.length > 0 ? 'Photon Search Results' : 'Popular Waypoints'}
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
                      size={18}
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
                  <Ionicons name="chevron-forward" size={16} color="#475569" />
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
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.7)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  searchCardFocused: {
    borderColor: '#6366F1',
    backgroundColor: '#0F172A',
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '500',
    height: 38,
  },
  actionBtn: {
    padding: 4,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#334155',
    marginHorizontal: 10,
  },
  locationBtn: {
    padding: 2,
  },
  destPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    gap: 6,
  },
  destPillText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  destPillBold: {
    color: '#F8FAFC',
    fontWeight: '600',
  },
  dropdown: {
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    borderRadius: 16,
    marginTop: 8,
    maxHeight: 260,
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  dropdownHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.3)',
  },
  itemIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  itemAddress: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
});
