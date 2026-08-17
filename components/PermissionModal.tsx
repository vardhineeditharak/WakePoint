import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWakePoint } from '../context/WakePointContext';

export const PermissionModal: React.FC = () => {
  const insets = useSafeAreaInsets();
  const {
    showPermissionModal,
    permissionErrorMessage,
    dismissPermissionModal,
    requestAllPermissions,
    permissions,
  } = useWakePoint();

  const handleGrant = async () => {
    dismissPermissionModal();
    await requestAllPermissions();
  };

  return (
    <Modal
      visible={showPermissionModal}
      animationType="fade"
      transparent={true}
      onRequestClose={dismissPermissionModal}
    >
      <View style={[styles.overlay, { paddingBottom: Math.max(insets.bottom, 20) + 10 }]}>
        <View style={styles.card}>
          <View style={styles.iconBadge}>
            <Ionicons name="shield-checkmark-sharp" size={32} color="#6366F1" />
          </View>

          <Text style={styles.title}>Location & Alert Permissions</Text>

          <Text style={styles.description}>
            WakePoint requires permissions to monitor your proximity perimeter in the background and sound arrival alarms.
          </Text>

          {/* Error Message callout */}
          {permissionErrorMessage ? (
            <View style={styles.errorBox}>
              <Ionicons name="warning-sharp" size={16} color="#F59E0B" />
              <Text style={styles.errorText}>{permissionErrorMessage}</Text>
            </View>
          ) : null}

          {/* Checklist Status */}
          <View style={styles.checklist}>
            <View style={styles.checkItem}>
              <Ionicons
                name={permissions.foregroundGranted ? 'checkmark-circle-sharp' : 'ellipse-outline'}
                size={20}
                color={permissions.foregroundGranted ? '#10B981' : '#64748B'}
              />
              <Text style={styles.checkLabel}>Foreground Location Access</Text>
            </View>

            <View style={styles.checkItem}>
              <Ionicons
                name={permissions.backgroundGranted ? 'checkmark-circle-sharp' : 'ellipse-outline'}
                size={20}
                color={permissions.backgroundGranted ? '#10B981' : '#64748B'}
              />
              <Text style={styles.checkLabel}>
                {'Background Location ("Allow all the time")'}
              </Text>
            </View>

            <View style={styles.checkItem}>
              <Ionicons
                name={permissions.notificationsGranted ? 'checkmark-circle-sharp' : 'ellipse-outline'}
                size={20}
                color={permissions.notificationsGranted ? '#10B981' : '#64748B'}
              />
              <Text style={styles.checkLabel}>Alarm Notifications & Alerts</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <TouchableOpacity style={styles.grantBtn} onPress={handleGrant} activeOpacity={0.8}>
            <Text style={styles.grantBtnText}>Authorize Permissions</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={dismissPermissionModal}>
            <Text style={styles.cancelBtnText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    gap: 8,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#FBBF24',
    lineHeight: 16,
  },
  checklist: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 20,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkLabel: {
    fontSize: 13,
    color: '#E2E8F0',
    fontWeight: '500',
  },
  grantBtn: {
    width: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  grantBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: 10,
  },
  cancelBtnText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
});
