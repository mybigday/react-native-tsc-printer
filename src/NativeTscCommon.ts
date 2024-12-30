import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  loadImage(uri: string, width: number, height: number): Promise<number[]>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('TscCommon');
