import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  loadImage(
    uri: string,
    height: number
  ): Promise<{ data: number[]; widthBytes: number }>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('TscCommon');
