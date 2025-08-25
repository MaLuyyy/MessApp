import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface InputFieldProps {
  icon: any;
  placeholder: string;
  secureTextEntry?: boolean;
  value: string;
  onChangeText?: (text: string) => void;
  editable?: boolean;
}

const InputField = ({ icon, placeholder, secureTextEntry, value, onChangeText,  editable = true }: InputFieldProps) => {
  return (
    <View style={styles.container}>
      <Feather name={icon} size={20} color="#aaa" style={styles.icon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#aaa"
        secureTextEntry={secureTextEntry}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
      />
    </View>
  );
};

export default InputField;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginVertical: 8,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
});
