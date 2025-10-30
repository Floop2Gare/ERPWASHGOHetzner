import { BackendDiagnostic } from './BackendDiagnostic';
import { IntegrationTestPanel } from './IntegrationTestPanel';

export const AdvancedBackendDiagnostic = () => {
  return (
    <div className="space-y-4">
      <BackendDiagnostic />
      <IntegrationTestPanel />
    </div>
  );
};
