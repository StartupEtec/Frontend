import React from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme/tokens';

interface TermsModalProps {
  visible: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ visible, onClose, onAccept }) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      testID="terms-modal"
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>Términos y Condiciones de Uso</Text>
          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator>
            <Text style={styles.paragraph}>
              Bienvenido a nuestra plataforma on-demand. Al registrarte y hacer uso de nuestra
              aplicación, aceptas los presentes Términos y Condiciones generales.
            </Text>
            <Text style={styles.sectionTitle}>1. Modelo de Rol Dual</Text>
            <Text style={styles.paragraph}>
              La plataforma permite alternar dinámicamente entre los roles de Cliente y Proveedor
              independiente bajo una misma cuenta.
            </Text>
            <Text style={styles.sectionTitle}>2. Sistema Transaccional y Escrow</Text>
            <Text style={styles.paragraph}>
              Los pagos realizados por contratación de servicios quedarán bloqueados en custodia
              (Escrow) hasta que la entrega del servicio sea confirmada satisfactoriamente.
            </Text>
            <Text style={styles.sectionTitle}>3. Privacidad y Seguridad</Text>
            <Text style={styles.paragraph}>
              Nos comprometemos a resguardar la confidencialidad de tus datos personales según los
              estándares de seguridad vigentes.
            </Text>
          </ScrollView>

          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose} testID="terms-close-btn">
              <Text style={styles.closeButtonText}>Cerrar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => {
                onAccept();
                onClose();
              }}
              testID="terms-accept-btn"
            >
              <Text style={styles.acceptButtonText}>Aceptar Términos</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlayBackground,
    justifyContent: 'center',
    padding: spacing.md,
  },
  content: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    marginBottom: spacing.md,
  },
  scrollArea: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.primaryLight,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  paragraph: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  closeButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: '#334155',
  },
  closeButtonText: {
    color: colors.textPrimary,
    fontWeight: typography.fontWeights.medium,
  },
  acceptButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  acceptButtonText: {
    color: colors.textPrimary,
    fontWeight: typography.fontWeights.bold,
  },
});
