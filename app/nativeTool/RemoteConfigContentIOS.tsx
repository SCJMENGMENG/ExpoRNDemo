import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CustomPicker from "./CustomPicker";

interface RemoteConfigContentProps {
  dataList: string[][];
  selectIndexs: number[];
  width: number;
  onChangeValue: (key: string, value: number) => void;
  onSave: () => void;
  onClose: () => void;
}

const MARGIN_SIZE = 0;//40;

const RemoteConfigContentIOS = ({
  dataList,
  selectIndexs,
  width,
  onChangeValue,
  onSave,
  onClose,
}: RemoteConfigContentProps) => {
  const [selectedValues, setSelectedValues] = useState<string[]>();
  const insets = useSafeAreaInsets();

  return (
    <TouchableWithoutFeedback onPress={() => { }}>
      <View
        style={{ flex: 0.5, backgroundColor: "rgba(0,0,0,0.5)", width: width }}
      >
        <TouchableWithoutFeedback>
          <View
            style={[
              styles.container,
              { margin: MARGIN_SIZE, marginLeft: insets.left },
            ]}
          >
            <View style={[styles.buttons]}>
              <Pressable onPress={onClose}>
                <View
                  style={{
                    padding: 12,
                    backgroundColor: "gray",
                    borderRadius: 5,
                  }}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </View>
              </Pressable>
              <Pressable onPressIn={onSave}>
                <View
                  style={{
                    padding: 12,
                    backgroundColor: "green",
                    borderRadius: 5,
                  }}
                >
                  <Text style={styles.buttonText}>Save</Text>
                </View>
              </Pressable>
            </View>
            <View style={styles.pickerContainer}>
              <CustomPicker
                style={{ width: '100%', height: 200 }}
                model={{
                  dataList: dataList,
                  selectIndexs: selectIndexs,
                  columnWidth: 70,
                  columnSpacing: 30,
                }}
                onChange={({ selectedValues }) => {
                  console.log(`Selected values: ${selectedValues}`);
                  setSelectedValues(selectedValues);
                }}
              />
            </View>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "white",
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "space-between",
    position: "absolute",
    left: 0,
    right: 0,
    padding: 20,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    lineHeight: 20,
  },
  pickerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 20,
    // backgroundColor:'red'
    // gap: 20,
  },
});

export default RemoteConfigContentIOS;
