// app/CustomerInfo.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import NavigationBar from '@/components/NavigationBar';
import { supabase } from '@/supabaseClient';

// ← use our shared toast hook instead of importing the native-toast-message directly
import { Toast, useToast } from '../hooks/use-toast';

const CustomerInfo: React.FC = () => {
  const navigation = useNavigation();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    expirationDate: '',
    cvv: '',
    firstName: '',
    lastName: '',
    saveCard: false,
  });

  // ← mount the toast container
  const { ToastContainer } = useToast();

  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Toast.show({ type: 'error', text1: 'User not logged in.' });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('payments')
        .select(
          'id, user_id, card_last4, expiration_date, cardholder_name, created_at, card_type'
        )
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching payments:', error);
        Toast.show({
          type: 'error',
          text1: 'Failed to fetch payment details.',
        });
      } else {
        setPayments(data || []);
      }
      setLoading(false);
    };

    fetchPayments();
  }, []);

  const handleInputChange = (name: keyof typeof cardDetails, value: string) => {
    setCardDetails((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (checked: boolean) => {
    setCardDetails((prev) => ({ ...prev, saveCard: checked }));
  };

  const handleSaveChanges = async () => {
    if (!cardDetails.saveCard) {
      Toast.show({
        type: 'info',
        text1:
          'Card details will not be saved as "Save card for future payments" is not selected.',
      });
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      Toast.show({ type: 'error', text1: 'User not logged in.' });
      return;
    }

    const { error } = await supabase.from('payments').insert([
      {
        user_id: user.id,
        card_type: 'visa', // replace with actual logic
        card_last4: cardDetails.cardNumber.slice(-4),
        expiration_date: cardDetails.expirationDate,
        cardholder_name: `${cardDetails.firstName} ${cardDetails.lastName}`,
        card_number: cardDetails.cardNumber,
      },
    ]);

    if (error) {
      console.error('Error saving card:', error);
      Toast.show({ type: 'error', text1: 'Failed to save card.' });
      return;
    }

    Toast.show({
      type: 'success',
      text1: 'Payment details saved successfully!',
    });
    navigation.navigate('Account');
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
      const { error } = await supabase.from('payments').delete().eq('id', cardId);

      if (error) {
        console.error('Error deleting card:', error);
        Toast.show({ type: 'error', text1: 'Failed to delete card.' });
      } else {
        Toast.show({ type: 'success', text1: 'Card removed successfully' });
        setPayments((prev) => prev.filter((c) => c.id !== cardId));
      }
    } catch (e) {
      console.error('Unexpected error:', e);
      Toast.show({ type: 'error', text1: 'An unexpected error occurred.' });
    }
  };

  if (loading) {
    return <Text style={styles.loading}>Loading...</Text>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button
          variant="ghost"
          size="icon"
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color="#000" />
        </Button>
        <Text style={styles.headerTitle}>Customer Info</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          {/* Card Details Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather
                name="credit-card"
                size={24}
                style={styles.sectionIcon}
              />
              <Text style={styles.sectionTitle}>Card Details</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Card Number</Text>
              <TextInput
                style={styles.input}
                placeholder="0000 0000 0000 0000"
                value={cardDetails.cardNumber}
                onChangeText={(text) => handleInputChange('cardNumber', text)}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.flex]}>
                <Text style={styles.label}>Expiration Date</Text>
                <TextInput
                  style={styles.input}
                  placeholder="MM/YY"
                  value={cardDetails.expirationDate}
                  onChangeText={(text) =>
                    handleInputChange('expirationDate', text)
                  }
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, styles.flex]}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>CVV</Text>
                  <Feather name="info" size={16} color="#9ca3af" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="000"
                  value={cardDetails.cvv}
                  onChangeText={(text) => handleInputChange('cvv', text)}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter first name"
                value={cardDetails.firstName}
                onChangeText={(text) =>
                  handleInputChange('firstName', text)
                }
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter last name"
                value={cardDetails.lastName}
                onChangeText={(text) =>
                  handleInputChange('lastName', text)
                }
              />
            </View>

            <View style={styles.checkboxContainer}>
              <Checkbox
                checked={cardDetails.saveCard}
                onChange={handleCheckboxChange}
              />
              <Text style={styles.checkboxLabel}>
                Save card for future payments
              </Text>
            </View>
          </View>

          {/* Saved Cards Section */}
          {payments.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Saved Cards</Text>
              {payments.map((card) => (
                <View key={card.id} style={styles.savedCard}>
                  <View style={styles.savedCardInfo}>
                    <View style={styles.cardType}>
                      <Text style={styles.cardTypeText}>
                        {card.card_type.toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.cardLastFour}>
                        •••• {card.card_last4}
                      </Text>
                      <Text style={styles.cardExpiration}>
                        Expires {card.expiration_date}
                      </Text>
                      <Text style={styles.cardholderName}>
                        Cardholder: {card.cardholder_name}
                      </Text>
                      <Text style={styles.createdAt}>
                        Added on:{' '}
                        {new Date(card.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  <Button
                    variant="ghost"
                    size="icon"
                    onPress={() => handleDeleteCard(card.id)}
                  >
                    <Feather name="trash" size={18} color="#000" />
                  </Button>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noCardsText}>
              No Saved Cards Available
            </Text>
          )}

          <Button style={styles.saveButton} onPress={handleSaveChanges}>
            Save Changes
          </Button>
        </View>
      </ScrollView>

      {/* ← Toast overlay */}
      <ToastContainer />

      <NavigationBar />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  backButton: {
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  flex: {
    flex: 1,
    marginRight: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: '#374151',
  },
  savedCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  savedCardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardType: {
    backgroundColor: '#2563eb',
    padding: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  cardTypeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardLastFour: {
    fontSize: 14,
    fontWeight: '500',
  },
  cardExpiration: {
    fontSize: 12,
    color: '#6b7280',
  },
  cardholderName: {
    fontSize: 12,
    color: '#374151',
  },
  createdAt: {
    fontSize: 12,
    color: '#6b7280',
  },
  saveButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  noCardsText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#6b7280',
    marginTop: 20,
  },
  loading: {
    textAlign: 'center',
    fontSize: 16,
    color: '#6b7280',
    marginTop: 20,
  },
});

export default CustomerInfo;
