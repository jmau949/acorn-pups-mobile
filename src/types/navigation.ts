import { BleDevice } from "./ble";

// Navigation types
export type RootStackParamList = {
  Home: undefined;
};

export type BottomTabParamList = {
  Devices: undefined;
  Profile: undefined;
};

export type AppStackParamList = {
  MainTabs: undefined;
  DeviceSetupModal: undefined;
};

export type DeviceSetupModalParamList = {
  Camera: undefined;
  BluetoothSearch: undefined;
  WiFiProvisioning: {
    connectedDevice: BleDevice;
  };
};
